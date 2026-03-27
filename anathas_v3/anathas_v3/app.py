from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from functools import wraps
import os, random, math

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

database_url = os.environ.get('DATABASE_URL', 'sqlite:///anathas.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='player')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_banned = db.Column(db.Boolean, default=False)
    country = db.relationship('Country', backref='owner', uselist=False)
    messages = db.relationship('ChatMessage', backref='author', lazy=True)
    forum_posts = db.relationship('ForumPost', backref='author', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)

class Country(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    alliance_id = db.Column(db.Integer, db.ForeignKey('alliance.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Économie
    money = db.Column(db.Float, default=5000.0)
    agriculture = db.Column(db.Integer, default=5)
    industry = db.Column(db.Integer, default=5)
    commerce = db.Column(db.Integer, default=5)

    # Population
    population = db.Column(db.Integer, default=100000)
    satisfaction = db.Column(db.Float, default=50.0)
    employment = db.Column(db.Float, default=70.0)
    health = db.Column(db.Float, default=50.0)
    food = db.Column(db.Float, default=50.0)

    # Territoire
    plains = db.Column(db.Integer, default=80)
    desert = db.Column(db.Integer, default=15)
    urban = db.Column(db.Integer, default=5)

    # Environnement
    pollution = db.Column(db.Float, default=5.0)
    forests = db.Column(db.Integer, default=20)
    carbon_credits = db.Column(db.Integer, default=10)

    # Militaire
    infantry = db.Column(db.Integer, default=0)
    tanks = db.Column(db.Integer, default=0)
    aviation = db.Column(db.Integer, default=0)
    navy = db.Column(db.Integer, default=0)
    missiles = db.Column(db.Integer, default=0)
    special_forces = db.Column(db.Integer, default=0)
    military_power = db.Column(db.Float, default=0.0)
    defense_bonus = db.Column(db.Float, default=0.0)

    # Technologie
    research_points = db.Column(db.Float, default=0.0)
    research_allocation_agriculture = db.Column(db.Float, default=20.0)
    research_allocation_military = db.Column(db.Float, default=20.0)
    research_allocation_industry = db.Column(db.Float, default=20.0)
    research_allocation_health = db.Column(db.Float, default=20.0)
    research_allocation_espionage = db.Column(db.Float, default=20.0)
    tech_agriculture = db.Column(db.Integer, default=0)
    tech_military = db.Column(db.Integer, default=0)
    tech_industry = db.Column(db.Integer, default=0)
    tech_health = db.Column(db.Integer, default=0)
    tech_espionage = db.Column(db.Integer, default=0)
    # Points accumulés par domaine pour le prochain niveau
    rp_agriculture = db.Column(db.Float, default=0.0)
    rp_military = db.Column(db.Float, default=0.0)
    rp_industry = db.Column(db.Float, default=0.0)
    rp_health = db.Column(db.Float, default=0.0)
    rp_espionage = db.Column(db.Float, default=0.0)

    # Budget de l'état (pourcentages, total = 100)
    budget_agriculture = db.Column(db.Float, default=20.0)
    budget_industry = db.Column(db.Float, default=20.0)
    budget_health = db.Column(db.Float, default=20.0)
    budget_military = db.Column(db.Float, default=20.0)
    budget_research = db.Column(db.Float, default=20.0)

    # Diplomatie
    is_blockaded = db.Column(db.Boolean, default=False)  # blocus actif subi

    # Score
    score = db.Column(db.Float, default=0.0)

    def territory_total(self):
        return self.plains + self.desert + self.urban

    def compute_military_power(self):
        tech_bonus = 1 + (self.tech_military * 0.1)
        power = (
            self.infantry * 1 +
            self.tanks * 8 +
            self.aviation * 15 +
            self.navy * 10 +
            self.missiles * 20 +
            self.special_forces * 25
        ) * tech_bonus
        self.military_power = round(power, 2)
        return self.military_power

    def compute_score(self):
        self.compute_military_power()
        tech_total = (self.tech_agriculture + self.tech_military +
                      self.tech_industry + self.tech_health + self.tech_espionage)
        score = (
            self.money * 0.0001 +
            self.population * 0.00001 +
            self.military_power * 0.05 +
            tech_total * 10 +
            self.territory_total() * 0.5
        )
        self.score = round(score, 2)
        return self.score

    def tech_cost(self, domain):
        """Coût en points pour passer au niveau suivant"""
        current = getattr(self, f'tech_{domain}', 0)
        return 50 * (current + 1)

class Alliance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, default='')
    leader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    members = db.relationship('Country', backref='alliance', lazy=True)
    messages = db.relationship('ChatMessage', backref='alliance_chat', lazy=True,
                                primaryjoin="and_(ChatMessage.alliance_id==Alliance.id)")

class War(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    attacker_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    defender_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, peace, attacker_won, defender_won
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)
    territory_transferred = db.Column(db.Integer, default=0)
    attacker = db.relationship('Country', foreign_keys=[attacker_id], backref='wars_as_attacker')
    defender = db.relationship('Country', foreign_keys=[defender_id], backref='wars_as_defender')
    battles = db.relationship('Battle', backref='war', lazy=True)

class Battle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    war_id = db.Column(db.Integer, db.ForeignKey('war.id'), nullable=False)
    turn_number = db.Column(db.Integer, default=1)
    attacker_units = db.Column(db.Text, default='{}')  # JSON string
    attacker_losses = db.Column(db.Text, default='{}')
    defender_losses = db.Column(db.Text, default='{}')
    attacker_power = db.Column(db.Float, default=0.0)
    defender_power = db.Column(db.Float, default=0.0)
    result = db.Column(db.String(20), default='')  # attacker_wins, defender_wins, draw
    territory_gained = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DiplomaticRelation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    country_a_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    country_b_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    relation_type = db.Column(db.String(30), default='neutral')  # neutral, trade, blockade, peace_treaty
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    country_a = db.relationship('Country', foreign_keys=[country_a_id])
    country_b = db.relationship('Country', foreign_keys=[country_b_id])

class SpyMission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    spy_country_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    target_country_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    mission_type = db.Column(db.String(30))  # steal_money, reveal_stats, sabotage_army, sabotage_industry
    status = db.Column(db.String(20), default='pending')  # pending, success, failed
    result_description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    spy_country = db.relationship('Country', foreign_keys=[spy_country_id])
    target_country = db.relationship('Country', foreign_keys=[target_country_id])

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    channel = db.Column(db.String(20), default='general')
    alliance_id = db.Column(db.Integer, db.ForeignKey('alliance.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_deleted = db.Column(db.Boolean, default=False)

class ForumCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, default='')
    is_official = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)
    topics = db.relationship('ForumTopic', backref='category', lazy=True)

class ForumTopic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('forum_category.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_locked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    posts = db.relationship('ForumPost', backref='topic', lazy=True)

class ForumPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('forum_topic.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_deleted = db.Column(db.Boolean, default=False)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    notif_type = db.Column(db.String(30), default='info')  # info, war, diplomacy, spy, research
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def notify(user_id, content, notif_type='info'):
    n = Notification(user_id=user_id, content=content, notif_type=notif_type)
    db.session.add(n)

def can_attack(attacker, defender):
    """Protection des petits pays : on peut attaquer un pays ayant au moins 90% de notre territoire. Top 5 : pas de restriction."""
    countries_sorted = sorted(Country.query.all(), key=lambda c: c.score, reverse=True)
    top5_ids = [c.id for c in countries_sorted[:5]]
    if attacker.id in top5_ids:
        return True
    min_territory = attacker.territory_total() * 0.9
    return defender.territory_total() >= min_territory

def get_active_war(country_id):
    return War.query.filter(
        ((War.attacker_id == country_id) | (War.defender_id == country_id)),
        War.status == 'active'
    ).first()

def get_unread_notifs(user_id):
    return Notification.query.filter_by(user_id=user_id, is_read=False).count()

# ─────────────────────────────────────────
# DECORATORS
# ─────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        user = User.query.get(session['user_id'])
        if not user or user.role != 'admin':
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated

def mod_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        user = User.query.get(session['user_id'])
        if not user or user.role not in ('admin', 'moderator'):
            return redirect(url_for('dashboard'))
        return f(*args, **kwargs)
    return decorated

# ─────────────────────────────────────────
# TOUR ENGINE
# ─────────────────────────────────────────

def process_turn():
    """Moteur de tours : appelé 2x/jour via cron ou manuellement par admin."""
    countries = Country.query.all()
    for c in countries:
        total_budget = c.budget_agriculture + c.budget_industry + c.budget_health + c.budget_military + c.budget_research
        if total_budget <= 0:
            total_budget = 100

        # --- Revenus de base ---
        agri_income = c.agriculture * 50 * (1 + c.tech_agriculture * 0.15) * (c.budget_agriculture / total_budget)
        industry_income = c.industry * 80 * (1 + c.tech_industry * 0.15) * (c.budget_industry / total_budget)
        commerce_income = 0 if c.is_blockaded else c.commerce * 60 * (c.budget_industry / total_budget)
        pop_tax = c.population * 0.001

        total_income = agri_income + industry_income + commerce_income + pop_tax

        # --- Dépenses militaires ---
        military_cost = (
            c.infantry * 0.5 + c.tanks * 5 +
            c.aviation * 10 + c.navy * 8 +
            c.missiles * 15 + c.special_forces * 20
        )
        c.money = max(0, c.money + total_income - military_cost)

        # --- Population ---
        food_score = c.food / 100
        health_score = (c.health / 100) * (1 + c.tech_health * 0.1)
        employ_score = c.employment / 100
        c.satisfaction = max(0, min(100, (food_score + health_score + employ_score) / 3 * 100))

        growth_rate = 0.002 if c.satisfaction >= 50 else -0.001
        if c.pollution > 60:
            growth_rate -= 0.001
        c.population = max(1000, int(c.population * (1 + growth_rate)))

        # --- Besoins population ---
        food_prod = c.agriculture * 1000 * (1 + c.tech_agriculture * 0.1)
        c.food = min(100, max(0, (food_prod / max(c.population, 1)) * 50 * (c.budget_agriculture / total_budget)))
        health_spend = c.budget_health / total_budget
        c.health = min(100, max(0, health_spend * 100 * (1 + c.tech_health * 0.1)))
        industry_jobs = c.industry * 500 + c.commerce * 300
        c.employment = min(100, max(0, (industry_jobs / max(c.population, 1)) * 100))

        # --- Pollution ---
        pollution_generated = (c.industry * 0.5 + c.population * 0.00001 + c.commerce * 0.1)
        pollution_reduced = (c.forests * 0.1 + c.tech_industry * 0.5 + c.carbon_credits * 0.5)
        c.pollution = max(0, min(100, c.pollution + pollution_generated - pollution_reduced))

        # --- Recherche ---
        research_income = c.money * (c.budget_research / total_budget) * 0.01
        total_alloc = (c.research_allocation_agriculture + c.research_allocation_military +
                       c.research_allocation_industry + c.research_allocation_health +
                       c.research_allocation_espionage)
        if total_alloc > 0:
            for domain in ['agriculture', 'military', 'industry', 'health', 'espionage']:
                alloc = getattr(c, f'research_allocation_{domain}') / total_alloc
                points_gained = research_income * alloc
                rp_attr = f'rp_{domain}'
                setattr(c, rp_attr, getattr(c, rp_attr) + points_gained)

        # --- Puissance militaire ---
        c.compute_military_power()
        c.compute_score()

    # --- Guerres actives ---
    active_wars = War.query.filter_by(status='active').all()
    for war in active_wars:
        attacker = Country.query.get(war.attacker_id)
        defender = Country.query.get(war.defender_id)
        if not attacker or not defender:
            continue
        # Les deux côtés subissent des pertes
        att_power = attacker.military_power * random.uniform(0.8, 1.2)
        def_power = defender.military_power * random.uniform(0.8, 1.2) * 1.1  # bonus défenseur
        if att_power > def_power:
            result = 'attacker_wins'
            territory_gain = random.randint(1, 3)
            if defender.territory_total() > territory_gain:
                defender.plains = max(0, defender.plains - territory_gain)
                attacker.plains += territory_gain
                war.territory_transferred += territory_gain
        else:
            result = 'defender_wins'
            territory_gain = 0

        b = Battle(
            war_id=war.id,
            turn_number=len(war.battles) + 1,
            attacker_power=round(att_power, 1),
            defender_power=round(def_power, 1),
            result=result,
            territory_gained=territory_gain
        )
        db.session.add(b)
        notify(attacker.owner.id, f"Combat contre {defender.name} : {'victoire' if result == 'attacker_wins' else 'défaite'} ({territory_gain} km² gagnés)", 'war')
        notify(defender.owner.id, f"Combat contre {attacker.name} : {'victoire' if result == 'defender_wins' else 'défaite'} ({territory_gain} km² perdus)", 'war')

    db.session.commit()
    return True

# ─────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        country_name = request.form.get('country_name', '').strip()
        error = None
        if not all([username, email, password, country_name]):
            error = 'Tous les champs sont obligatoires.'
        elif User.query.filter_by(username=username).first():
            error = "Ce nom d'utilisateur est déjà pris."
        elif User.query.filter_by(email=email).first():
            error = 'Cet email est déjà utilisé.'
        elif Country.query.filter_by(name=country_name).first():
            error = 'Ce nom de pays est déjà pris.'
        elif len(password) < 6:
            error = 'Le mot de passe doit faire au moins 6 caractères.'
        if error:
            return render_template('register.html', error=error)
        user = User(username=username, email=email, password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.flush()
        country = Country(name=country_name, user_id=user.id)
        country.compute_score()
        db.session.add(country)
        db.session.commit()
        session.update({'user_id': user.id, 'username': user.username, 'role': user.role})
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return render_template('login.html', error='Identifiants incorrects.')
        if user.is_banned:
            return render_template('login.html', error='Votre compte a été banni.')
        session.update({'user_id': user.id, 'username': user.username, 'role': user.role})
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# ─────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────

@app.route('/dashboard')
@login_required
def dashboard():
    user = User.query.get(session['user_id'])
    if user.is_banned:
        session.clear()
        return redirect(url_for('login'))
    country = user.country
    country.compute_score()
    db.session.commit()
    active_war = get_active_war(country.id)
    unread = get_unread_notifs(user.id)
    return render_template('dashboard.html', user=user, country=country, active_war=active_war, unread=unread)

@app.route('/budget', methods=['POST'])
@login_required
def update_budget():
    user = User.query.get(session['user_id'])
    country = user.country
    try:
        vals = {k: float(request.form.get(f'budget_{k}', 20)) for k in ['agriculture','industry','health','military','research']}
        if abs(sum(vals.values()) - 100) <= 0.5:
            for k, v in vals.items():
                setattr(country, f'budget_{k}', v)
            db.session.commit()
    except (ValueError, TypeError):
        pass
    return redirect(url_for('dashboard'))

# ─────────────────────────────────────────
# MILITAIRE
# ─────────────────────────────────────────

@app.route('/military')
@login_required
def military():
    user = User.query.get(session['user_id'])
    country = user.country
    country.compute_military_power()
    db.session.commit()
    active_war = get_active_war(country.id)
    war_details = None
    if active_war:
        battles = Battle.query.filter_by(war_id=active_war.id).order_by(Battle.created_at.desc()).limit(5).all()
        enemy = Country.query.get(active_war.defender_id if active_war.attacker_id == country.id else active_war.attacker_id)
        war_details = {'war': active_war, 'battles': battles, 'enemy': enemy}
    unread = get_unread_notifs(user.id)
    return render_template('military.html', user=user, country=country, active_war=active_war, war_details=war_details, unread=unread)

@app.route('/military/recruit', methods=['POST'])
@login_required
def recruit():
    user = User.query.get(session['user_id'])
    country = user.country
    unit_type = request.form.get('unit_type')
    quantity = int(request.form.get('quantity', 0))

    costs = {
        'infantry': (10, 1),       # (money, population)
        'tanks': (500, 5),
        'aviation': (1000, 3),
        'navy': (800, 4),
        'missiles': (1500, 2),
        'special_forces': (2000, 10)
    }
    if unit_type not in costs or quantity <= 0:
        return redirect(url_for('military'))

    cost_money, cost_pop = costs[unit_type]
    total_money = cost_money * quantity
    total_pop = cost_pop * quantity

    if country.money < total_money:
        return redirect(url_for('military'))
    if country.population < total_pop * 10:
        return redirect(url_for('military'))

    country.money -= total_money
    setattr(country, unit_type, getattr(country, unit_type) + quantity)
    country.compute_military_power()
    db.session.commit()
    return redirect(url_for('military'))

@app.route('/military/attack/<int:target_id>', methods=['POST'])
@login_required
def declare_war(target_id):
    user = User.query.get(session['user_id'])
    country = user.country
    target = Country.query.get_or_404(target_id)

    if target.id == country.id:
        return redirect(url_for('ranking'))
    if get_active_war(country.id):
        return redirect(url_for('military'))
    if not can_attack(country, target):
        return redirect(url_for('ranking'))

    war = War(attacker_id=country.id, defender_id=target.id)
    db.session.add(war)
    notify(target.owner.id, f"⚠️ {country.name} vous a déclaré la guerre !", 'war')
    db.session.commit()
    return redirect(url_for('military'))

@app.route('/military/send_units', methods=['POST'])
@login_required
def send_units():
    user = User.query.get(session['user_id'])
    country = user.country
    war = get_active_war(country.id)
    if not war or war.attacker_id != country.id:
        return redirect(url_for('military'))

    defender = Country.query.get(war.defender_id)
    units = {}
    unit_types = ['infantry', 'tanks', 'aviation', 'navy', 'missiles', 'special_forces']
    powers = {'infantry': 1, 'tanks': 8, 'aviation': 15, 'navy': 10, 'missiles': 20, 'special_forces': 25}
    tech_bonus = 1 + (country.tech_military * 0.1)
    att_power = 0

    for u in unit_types:
        qty = int(request.form.get(u, 0))
        available = getattr(country, u)
        qty = min(qty, available)
        if qty > 0:
            units[u] = qty
            att_power += qty * powers[u] * tech_bonus

    if att_power == 0:
        return redirect(url_for('military'))

    def_power = defender.military_power * random.uniform(0.8, 1.2) * 1.1
    att_power_rolled = att_power * random.uniform(0.8, 1.2)

    # Pertes
    loss_rate_att = 0.05 if att_power_rolled > def_power else 0.15
    loss_rate_def = 0.15 if att_power_rolled > def_power else 0.05

    att_losses = {}
    for u, qty in units.items():
        losses = max(0, int(qty * loss_rate_att))
        att_losses[u] = losses
        setattr(country, u, getattr(country, u) - losses)

    for u in unit_types:
        qty = getattr(defender, u)
        if qty > 0:
            losses = max(0, int(qty * loss_rate_def))
            setattr(defender, u, qty - losses)

    territory_gain = 0
    if att_power_rolled > def_power:
        result = 'attacker_wins'
        territory_gain = random.randint(1, 4)
        if defender.territory_total() > territory_gain + 5:
            defender.plains = max(0, defender.plains - territory_gain)
            country.plains += territory_gain
            war.territory_transferred += territory_gain
    else:
        result = 'defender_wins'

    import json
    battle = Battle(
        war_id=war.id,
        turn_number=len(war.battles) + 1,
        attacker_units=json.dumps(units),
        attacker_losses=json.dumps(att_losses),
        attacker_power=round(att_power_rolled, 1),
        defender_power=round(def_power, 1),
        result=result,
        territory_gained=territory_gain
    )
    db.session.add(battle)
    country.compute_military_power()
    defender.compute_military_power()
    notify(defender.owner.id, f"⚔️ {country.name} vous attaque ! {'Vous avez résisté !' if result == 'defender_wins' else f'Vous perdez {territory_gain} km²'}", 'war')
    db.session.commit()
    return redirect(url_for('military'))

@app.route('/military/peace/<int:war_id>', methods=['POST'])
@login_required
def request_peace(war_id):
    user = User.query.get(session['user_id'])
    country = user.country
    war = War.query.get_or_404(war_id)
    if country.id not in (war.attacker_id, war.defender_id):
        return redirect(url_for('military'))
    war.status = 'peace'
    war.ended_at = datetime.utcnow()
    enemy_id = war.defender_id if war.attacker_id == country.id else war.attacker_id
    enemy = Country.query.get(enemy_id)
    notify(enemy.owner.id, f"🕊️ {country.name} a demandé la paix. Le conflit est terminé.", 'war')
    db.session.commit()
    return redirect(url_for('military'))

# ─────────────────────────────────────────
# RECHERCHE
# ─────────────────────────────────────────

@app.route('/research')
@login_required
def research():
    user = User.query.get(session['user_id'])
    country = user.country
    unread = get_unread_notifs(user.id)
    domains = ['agriculture', 'military', 'industry', 'health', 'espionage']
    tech_info = []
    for d in domains:
        current_level = getattr(country, f'tech_{d}')
        rp = getattr(country, f'rp_{d}')
        cost = country.tech_cost(d)
        alloc = getattr(country, f'research_allocation_{d}')
        tech_info.append({
            'domain': d, 'level': current_level,
            'rp': round(rp, 1), 'cost': cost,
            'alloc': alloc, 'progress': min(100, round(rp / cost * 100))
        })
    return render_template('research.html', user=user, country=country, tech_info=tech_info, unread=unread)

@app.route('/research/allocate', methods=['POST'])
@login_required
def allocate_research():
    user = User.query.get(session['user_id'])
    country = user.country
    domains = ['agriculture', 'military', 'industry', 'health', 'espionage']
    try:
        vals = {d: float(request.form.get(f'alloc_{d}', 20)) for d in domains}
        if abs(sum(vals.values()) - 100) <= 0.5:
            for d, v in vals.items():
                setattr(country, f'research_allocation_{d}', v)
            db.session.commit()
    except (ValueError, TypeError):
        pass
    return redirect(url_for('research'))

@app.route('/research/unlock/<domain>', methods=['POST'])
@login_required
def unlock_tech(domain):
    user = User.query.get(session['user_id'])
    country = user.country
    domains = ['agriculture', 'military', 'industry', 'health', 'espionage']
    if domain not in domains:
        return redirect(url_for('research'))
    rp = getattr(country, f'rp_{domain}')
    cost = country.tech_cost(domain)
    if rp >= cost:
        setattr(country, f'rp_{domain}', rp - cost)
        new_level = getattr(country, f'tech_{domain}') + 1
        setattr(country, f'tech_{domain}', new_level)
        notify(user.id, f"🔬 Technologie {domain} montée au niveau {new_level} !", 'research')
        db.session.commit()
    return redirect(url_for('research'))

# ─────────────────────────────────────────
# DIPLOMATIE
# ─────────────────────────────────────────

@app.route('/diplomacy')
@login_required
def diplomacy():
    user = User.query.get(session['user_id'])
    country = user.country
    countries = Country.query.filter(Country.id != country.id).all()
    relations = DiplomaticRelation.query.filter(
        (DiplomaticRelation.country_a_id == country.id) |
        (DiplomaticRelation.country_b_id == country.id)
    ).all()
    spy_missions = SpyMission.query.filter_by(spy_country_id=country.id).order_by(SpyMission.created_at.desc()).limit(10).all()
    blockaded = DiplomaticRelation.query.filter_by(country_b_id=country.id, relation_type='blockade').first()
    unread = get_unread_notifs(user.id)
    return render_template('diplomacy.html', user=user, country=country,
                           countries=countries, relations=relations,
                           spy_missions=spy_missions, blockaded=blockaded, unread=unread)

@app.route('/diplomacy/blockade/<int:target_id>', methods=['POST'])
@login_required
def start_blockade(target_id):
    user = User.query.get(session['user_id'])
    country = user.country
    target = Country.query.get_or_404(target_id)
    existing = DiplomaticRelation.query.filter_by(
        country_a_id=country.id, country_b_id=target_id, relation_type='blockade').first()
    if not existing:
        rel = DiplomaticRelation(country_a_id=country.id, country_b_id=target_id, relation_type='blockade')
        db.session.add(rel)
        target.is_blockaded = True
        notify(target.owner.id, f"🚫 {country.name} vous impose un blocus économique !", 'diplomacy')
        db.session.commit()
    return redirect(url_for('diplomacy'))

@app.route('/diplomacy/unblockade/<int:target_id>', methods=['POST'])
@login_required
def end_blockade(target_id):
    user = User.query.get(session['user_id'])
    country = user.country
    rel = DiplomaticRelation.query.filter_by(
        country_a_id=country.id, country_b_id=target_id, relation_type='blockade').first()
    if rel:
        db.session.delete(rel)
        target = Country.query.get(target_id)
        remaining = DiplomaticRelation.query.filter_by(country_b_id=target_id, relation_type='blockade').count()
        if remaining <= 1:
            target.is_blockaded = False
        notify(target.owner.id, f"✅ {country.name} lève son blocus économique.", 'diplomacy')
        db.session.commit()
    return redirect(url_for('diplomacy'))

@app.route('/diplomacy/trade/<int:target_id>', methods=['POST'])
@login_required
def propose_trade(target_id):
    user = User.query.get(session['user_id'])
    country = user.country
    target = Country.query.get_or_404(target_id)
    existing = DiplomaticRelation.query.filter_by(
        country_a_id=country.id, country_b_id=target_id, relation_type='trade').first()
    if not existing:
        rel = DiplomaticRelation(country_a_id=country.id, country_b_id=target_id, relation_type='trade')
        db.session.add(rel)
        notify(target.owner.id, f"🤝 {country.name} vous propose un accord commercial.", 'diplomacy')
        db.session.commit()
    return redirect(url_for('diplomacy'))

@app.route('/diplomacy/spy', methods=['POST'])
@login_required
def spy_mission():
    user = User.query.get(session['user_id'])
    country = user.country
    target_id = int(request.form.get('target_id'))
    mission_type = request.form.get('mission_type')
    target = Country.query.get_or_404(target_id)

    mission_costs = {
        'steal_money': 500,
        'reveal_stats': 200,
        'sabotage_army': 1000,
        'sabotage_industry': 800
    }
    if mission_type not in mission_costs:
        return redirect(url_for('diplomacy'))

    cost = mission_costs[mission_type]
    if country.money < cost:
        return redirect(url_for('diplomacy'))

    country.money -= cost
    espionage_level = country.tech_espionage
    success_chance = 0.4 + (espionage_level * 0.1)
    success = random.random() < success_chance

    if success:
        if mission_type == 'steal_money':
            amount = min(target.money * 0.05, 2000)
            target.money = max(0, target.money - amount)
            country.money += amount
            result = f"Succès : {amount:.0f} § volés à {target.name}"
            notify(target.owner.id, f"💰 Espionnage subi ! {amount:.0f} § volés par un pays inconnu.", 'spy')
        elif mission_type == 'reveal_stats':
            result = (f"Succès : {target.name} — Armée: {target.military_power:.0f}, "
                      f"Argent: {target.money:.0f}§, Population: {target.population:,}, "
                      f"Score: {target.score:.0f}")
        elif mission_type == 'sabotage_army':
            losses = int(target.infantry * 0.1) + int(target.tanks * 0.05)
            target.infantry = max(0, target.infantry - int(target.infantry * 0.1))
            target.tanks = max(0, target.tanks - int(target.tanks * 0.05))
            target.compute_military_power()
            result = f"Succès : armée de {target.name} sabotée ({losses} unités détruites)"
            notify(target.owner.id, f"💣 Sabotage ! Votre armée a subi des pertes mystérieuses.", 'spy')
        elif mission_type == 'sabotage_industry':
            damage = target.industry * 0.1
            target.money = max(0, target.money - damage * 100)
            result = f"Succès : industrie de {target.name} sabotée ({damage:.1f} niveaux endommagés)"
            notify(target.owner.id, f"🏭 Sabotage ! Votre industrie a subi des dommages.", 'spy')
        status = 'success'
    else:
        result = f"Échec : la mission contre {target.name} a échoué."
        notify(target.owner.id, f"🕵️ Une tentative d'espionnage a été déjouée.", 'spy')
        status = 'failed'

    mission = SpyMission(
        spy_country_id=country.id, target_country_id=target_id,
        mission_type=mission_type, status=status, result_description=result
    )
    db.session.add(mission)
    notify(user.id, result, 'spy')
    db.session.commit()
    return redirect(url_for('diplomacy'))

# ─────────────────────────────────────────
# FORUM
# ─────────────────────────────────────────

@app.route('/forum')
@login_required
def forum():
    user = User.query.get(session['user_id'])
    categories = ForumCategory.query.order_by(ForumCategory.order).all()
    unread = get_unread_notifs(user.id)
    return render_template('forum.html', user=user, categories=categories, unread=unread)

@app.route('/forum/category/<int:cat_id>')
@login_required
def forum_category(cat_id):
    user = User.query.get(session['user_id'])
    category = ForumCategory.query.get_or_404(cat_id)
    topics = ForumTopic.query.filter_by(category_id=cat_id).order_by(
        ForumTopic.is_pinned.desc(), ForumTopic.updated_at.desc()).all()
    unread = get_unread_notifs(user.id)
    return render_template('forum_category.html', user=user, category=category, topics=topics, unread=unread)

@app.route('/forum/topic/<int:topic_id>', methods=['GET', 'POST'])
@login_required
def forum_topic(topic_id):
    user = User.query.get(session['user_id'])
    topic = ForumTopic.query.get_or_404(topic_id)
    if request.method == 'POST':
        if topic.is_locked and user.role not in ('admin', 'moderator'):
            return redirect(url_for('forum_topic', topic_id=topic_id))
        content = request.form.get('content', '').strip()
        if content:
            post = ForumPost(topic_id=topic_id, author_id=user.id, content=content)
            db.session.add(post)
            topic.updated_at = datetime.utcnow()
            db.session.commit()
        return redirect(url_for('forum_topic', topic_id=topic_id))
    posts = ForumPost.query.filter_by(topic_id=topic_id, is_deleted=False).order_by(ForumPost.created_at).all()
    unread = get_unread_notifs(user.id)
    return render_template('forum_topic.html', user=user, topic=topic, posts=posts, unread=unread)

@app.route('/forum/new_topic/<int:cat_id>', methods=['POST'])
@login_required
def new_topic(cat_id):
    user = User.query.get(session['user_id'])
    category = ForumCategory.query.get_or_404(cat_id)
    if category.is_official and user.role not in ('admin', 'moderator'):
        return redirect(url_for('forum_category', cat_id=cat_id))
    title = request.form.get('title', '').strip()
    content = request.form.get('content', '').strip()
    if title and content:
        topic = ForumTopic(category_id=cat_id, author_id=user.id, title=title)
        db.session.add(topic)
        db.session.flush()
        post = ForumPost(topic_id=topic.id, author_id=user.id, content=content)
        db.session.add(post)
        db.session.commit()
        return redirect(url_for('forum_topic', topic_id=topic.id))
    return redirect(url_for('forum_category', cat_id=cat_id))

@app.route('/forum/delete_post/<int:post_id>', methods=['POST'])
@mod_required
def delete_post(post_id):
    post = ForumPost.query.get_or_404(post_id)
    post.is_deleted = True
    db.session.commit()
    return redirect(url_for('forum_topic', topic_id=post.topic_id))

@app.route('/forum/toggle_lock/<int:topic_id>', methods=['POST'])
@mod_required
def toggle_lock(topic_id):
    topic = ForumTopic.query.get_or_404(topic_id)
    topic.is_locked = not topic.is_locked
    db.session.commit()
    return redirect(url_for('forum_topic', topic_id=topic_id))

@app.route('/forum/toggle_pin/<int:topic_id>', methods=['POST'])
@mod_required
def toggle_pin(topic_id):
    topic = ForumTopic.query.get_or_404(topic_id)
    topic.is_pinned = not topic.is_pinned
    db.session.commit()
    return redirect(url_for('forum_topic', topic_id=topic_id))

# ─────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────

@app.route('/notifications')
@login_required
def notifications():
    user = User.query.get(session['user_id'])
    notifs = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    for n in notifs:
        n.is_read = True
    db.session.commit()
    unread = 0
    return render_template('notifications.html', user=user, notifs=notifs, unread=unread)

@app.route('/api/notifications/count')
@login_required
def notif_count():
    return jsonify({'count': get_unread_notifs(session['user_id'])})

# ─────────────────────────────────────────
# CHAT
# ─────────────────────────────────────────

@app.route('/chat')
@login_required
def chat():
    user = User.query.get(session['user_id'])
    country = user.country
    alliance = Alliance.query.get(country.alliance_id) if country and country.alliance_id else None
    unread = get_unread_notifs(user.id)
    return render_template('chat.html', user=user, country=country, alliance=alliance, unread=unread)

@app.route('/api/chat/messages')
@login_required
def get_messages():
    channel = request.args.get('channel', 'general')
    alliance_id = request.args.get('alliance_id', None)
    if channel == 'alliance' and alliance_id:
        messages = ChatMessage.query.filter_by(channel='alliance', alliance_id=int(alliance_id), is_deleted=False).order_by(ChatMessage.created_at.desc()).limit(50).all()
    else:
        messages = ChatMessage.query.filter_by(channel='general', is_deleted=False).order_by(ChatMessage.created_at.desc()).limit(50).all()
    return jsonify([{'id': m.id, 'username': m.author.username, 'role': m.author.role,
                     'content': m.content, 'created_at': m.created_at.strftime('%H:%M')} for m in reversed(messages)])

@app.route('/api/chat/send', methods=['POST'])
@login_required
def send_message():
    user = User.query.get(session['user_id'])
    if user.is_banned:
        return jsonify({'error': 'Banni'}), 403
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content or len(content) > 500:
        return jsonify({'error': 'Message invalide'}), 400
    msg = ChatMessage(user_id=user.id, content=content,
                      channel=data.get('channel', 'general'),
                      alliance_id=int(data['alliance_id']) if data.get('alliance_id') else None)
    db.session.add(msg)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/chat/delete/<int:msg_id>', methods=['POST'])
@mod_required
def delete_message(msg_id):
    msg = ChatMessage.query.get_or_404(msg_id)
    msg.is_deleted = True
    db.session.commit()
    return jsonify({'success': True})

# ─────────────────────────────────────────
# CLASSEMENT
# ─────────────────────────────────────────

@app.route('/ranking')
@login_required
def ranking():
    user = User.query.get(session['user_id'])
    countries = Country.query.all()
    for c in countries:
        c.compute_score()
    db.session.commit()
    countries_sorted = sorted(countries, key=lambda c: c.score, reverse=True)
    my_country = user.country
    unread = get_unread_notifs(user.id)
    return render_template('ranking.html', countries=countries_sorted, my_country=my_country, user=user, unread=unread)

# ─────────────────────────────────────────
# ALLIANCES
# ─────────────────────────────────────────

@app.route('/alliances')
@login_required
def alliances():
    user = User.query.get(session['user_id'])
    all_alliances = Alliance.query.all()
    unread = get_unread_notifs(user.id)
    return render_template('alliances.html', user=user, alliances=all_alliances, unread=unread)

@app.route('/alliances/create', methods=['POST'])
@login_required
def create_alliance():
    user = User.query.get(session['user_id'])
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    if not name or Alliance.query.filter_by(name=name).first():
        return redirect(url_for('alliances'))
    alliance = Alliance(name=name, description=description, leader_id=user.id)
    db.session.add(alliance)
    db.session.flush()
    if user.country:
        user.country.alliance_id = alliance.id
    db.session.commit()
    return redirect(url_for('alliances'))

@app.route('/alliances/join/<int:alliance_id>', methods=['POST'])
@login_required
def join_alliance(alliance_id):
    user = User.query.get(session['user_id'])
    if user.country:
        user.country.alliance_id = alliance_id
        db.session.commit()
    return redirect(url_for('alliances'))

@app.route('/alliances/leave', methods=['POST'])
@login_required
def leave_alliance():
    user = User.query.get(session['user_id'])
    if user.country:
        user.country.alliance_id = None
        db.session.commit()
    return redirect(url_for('alliances'))

# ─────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────

@app.route('/admin')
@admin_required
def admin_panel():
    user = User.query.get(session['user_id'])
    users = User.query.order_by(User.created_at.desc()).all()
    unread = get_unread_notifs(user.id)
    return render_template('admin.html', users=users, user=user, unread=unread)

@app.route('/admin/run_turn', methods=['POST'])
@admin_required
def run_turn():
    process_turn()
    return jsonify({'success': True, 'message': 'Tour traité avec succès !'})

@app.route('/admin/set_role/<int:user_id>/<role>', methods=['POST'])
@admin_required
def set_role(user_id, role):
    if role not in ('player', 'moderator', 'admin'):
        return jsonify({'error': 'Rôle invalide'}), 400
    u = User.query.get_or_404(user_id)
    u.role = role
    db.session.commit()
    return jsonify({'success': True})

@app.route('/admin/ban/<int:user_id>', methods=['POST'])
@mod_required
def ban_user(user_id):
    u = User.query.get_or_404(user_id)
    if u.role == 'admin':
        return jsonify({'error': 'Impossible de bannir un admin'}), 403
    u.is_banned = not u.is_banned
    db.session.commit()
    return jsonify({'success': True, 'banned': u.is_banned})

@app.route('/admin/forum/add_category', methods=['POST'])
@admin_required
def add_forum_category():
    name = request.form.get('name', '').strip()
    description = request.form.get('description', '').strip()
    is_official = request.form.get('is_official') == 'on'
    if name:
        cat = ForumCategory(name=name, description=description, is_official=is_official,
                             order=ForumCategory.query.count())
        db.session.add(cat)
        db.session.commit()
    return redirect(url_for('admin_panel'))

# ─────────────────────────────────────────
# INIT DB
# ─────────────────────────────────────────

with app.app_context():
    db.create_all()
    if not User.query.filter_by(role='admin').first():
        admin = User(username='admin', email='admin@anathas.com',
                     password_hash=generate_password_hash('admin123'), role='admin')
        db.session.add(admin)
        db.session.commit()
    if ForumCategory.query.count() == 0:
        cats = [
            ForumCategory(name='Annonces officielles', description='Annonces des administrateurs', is_official=True, order=0),
            ForumCategory(name='Diplomatie', description='Accords, alliances, déclarations de guerre', is_official=False, order=1),
            ForumCategory(name='Roleplay', description='Histoires et événements roleplay', is_official=False, order=2),
            ForumCategory(name='Discussion générale', description='Tout sujet libre', is_official=False, order=3),
        ]
        for c in cats:
            db.session.add(c)
        db.session.commit()

if __name__ == '__main__':
    app.run(debug=True)

# ─────────────────────────────────────────
# CONTEXT PROCESSOR — inject current_country + now into all templates
# ─────────────────────────────────────────
from datetime import datetime as dt

@app.context_processor
def inject_globals():
    result = {'now': dt.utcnow(), 'current_country': None}
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user and user.country:
            result['current_country'] = user.country
    return result

# ─────────────────────────────────────────
# TERRITORY PAGE
# ─────────────────────────────────────────

@app.route('/territory')
@login_required
def territory():
    user = User.query.get(session['user_id'])
    country = user.country
    unread = get_unread_notifs(user.id)
    return render_template('territory.html', user=user, country=country, unread=unread)

@app.route('/territory/action', methods=['POST'])
@login_required
def territory_action():
    user = User.query.get(session['user_id'])
    country = user.country
    action = request.form.get('action')
    if action == 'reforest' and country.desert > 0 and country.money >= 200:
        country.desert -= 1
        country.forests += 500
        country.money -= 200
        country.pollution = max(0, country.pollution - 2)
        notify(user.id, "🌲 Reforestation effectuée : +500 km² de forêts", 'info')
    elif action == 'deforest' and country.forests > 0 and country.money >= 100:
        country.forests = max(0, country.forests - 500)
        country.plains += 1
        country.money -= 100
    elif action == 'irrigate' and country.desert > 0 and country.money >= 300:
        country.desert -= 1
        country.plains += 1
        country.money -= 300
    elif action == 'urbanize' and country.plains > 5 and country.money >= 500:
        country.plains -= 1
        country.urban += 1
        country.money -= 500
    db.session.commit()
    return redirect(url_for('territory'))

# ─────────────────────────────────────────
# ESPIONAGE (dedicated page)
# ─────────────────────────────────────────

@app.route('/espionage')
@login_required
def espionage():
    user = User.query.get(session['user_id'])
    country = user.country
    countries = Country.query.filter(Country.id != country.id).all()
    spy_missions = SpyMission.query.filter_by(spy_country_id=country.id).order_by(SpyMission.created_at.desc()).limit(20).all()
    unread = get_unread_notifs(user.id)
    return render_template('espionage.html', user=user, country=country, countries=countries, spy_missions=spy_missions, unread=unread)

# ─────────────────────────────────────────
# MARKET — ÉCHANGES
# ─────────────────────────────────────────

class MarketOffer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=False)
    give_type = db.Column(db.String(30), nullable=False)   # money, carbon_credits, research_points, plains
    give_amount = db.Column(db.Float, nullable=False)
    want_type = db.Column(db.String(30), nullable=False)
    want_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='open')  # open, accepted, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    buyer_id = db.Column(db.Integer, db.ForeignKey('country.id'), nullable=True)
    seller = db.relationship('Country', foreign_keys=[seller_id], backref='offers_made')
    buyer = db.relationship('Country', foreign_keys=[buyer_id])

with app.app_context():
    db.create_all()

@app.route('/market')
@login_required
def market():
    user = User.query.get(session['user_id'])
    country = user.country
    open_offers = MarketOffer.query.filter_by(status='open').order_by(MarketOffer.created_at.desc()).all()
    my_offers = MarketOffer.query.filter_by(seller_id=country.id).order_by(MarketOffer.created_at.desc()).limit(10).all()
    recent_trades = MarketOffer.query.filter_by(status='accepted').order_by(MarketOffer.created_at.desc()).limit(10).all()
    unread = get_unread_notifs(user.id)
    resource_labels = {
        'money': 'Argent (G$)',
        'carbon_credits': 'Crédits Carbone',
        'research_points': 'Points de Recherche',
        'plains': 'Territoire (km²)'
    }
    return render_template('market.html', user=user, country=country,
                           open_offers=open_offers, my_offers=my_offers,
                           recent_trades=recent_trades, resource_labels=resource_labels, unread=unread)

@app.route('/market/create', methods=['POST'])
@login_required
def create_offer():
    user = User.query.get(session['user_id'])
    country = user.country
    give_type = request.form.get('give_type')
    give_amount = float(request.form.get('give_amount', 0))
    want_type = request.form.get('want_type')
    want_amount = float(request.form.get('want_amount', 0))
    valid_types = ['money', 'carbon_credits', 'research_points', 'plains']
    if give_type not in valid_types or want_type not in valid_types or give_type == want_type:
        return redirect(url_for('market'))
    if give_amount <= 0 or want_amount <= 0:
        return redirect(url_for('market'))
    # Vérifier que le vendeur a assez
    current_val = getattr(country, give_type, 0)
    if current_val < give_amount:
        return redirect(url_for('market'))
    offer = MarketOffer(seller_id=country.id, give_type=give_type, give_amount=give_amount,
                        want_type=want_type, want_amount=want_amount)
    db.session.add(offer)
    db.session.commit()
    return redirect(url_for('market'))

@app.route('/market/accept/<int:offer_id>', methods=['POST'])
@login_required
def accept_offer(offer_id):
    user = User.query.get(session['user_id'])
    buyer_country = user.country
    offer = MarketOffer.query.get_or_404(offer_id)
    if offer.status != 'open' or offer.seller_id == buyer_country.id:
        return redirect(url_for('market'))
    seller = Country.query.get(offer.seller_id)
    # Vérifier que les deux ont assez
    buyer_has = getattr(buyer_country, offer.want_type, 0)
    seller_has = getattr(seller, offer.give_type, 0)
    if buyer_has < offer.want_amount or seller_has < offer.give_amount:
        return redirect(url_for('market'))
    # Effectuer l'échange
    setattr(seller, offer.give_type, seller_has - offer.give_amount)
    setattr(buyer_country, offer.give_type, getattr(buyer_country, offer.give_type, 0) + offer.give_amount)
    buyer_pays = getattr(buyer_country, offer.want_type, 0)
    setattr(buyer_country, offer.want_type, buyer_pays - offer.want_amount)
    setattr(seller, offer.want_type, getattr(seller, offer.want_type, 0) + offer.want_amount)
    offer.status = 'accepted'
    offer.buyer_id = buyer_country.id
    notify(seller.owner.id, f"✅ Votre offre a été acceptée par {buyer_country.name} !", 'info')
    notify(user.id, f"✅ Échange conclu avec {seller.name} !", 'info')
    db.session.commit()
    return redirect(url_for('market'))

@app.route('/market/cancel/<int:offer_id>', methods=['POST'])
@login_required
def cancel_offer(offer_id):
    user = User.query.get(session['user_id'])
    offer = MarketOffer.query.get_or_404(offer_id)
    if offer.seller_id == user.country.id and offer.status == 'open':
        offer.status = 'cancelled'
        db.session.commit()
    return redirect(url_for('market'))

# ─────────────────────────────────────────
# GUIDE
# ─────────────────────────────────────────

@app.route('/guide')
def guide():
    user = User.query.get(session['user_id']) if 'user_id' in session else None
    unread = get_unread_notifs(user.id) if user else 0
    return render_template('guide.html', user=user, unread=unread)
