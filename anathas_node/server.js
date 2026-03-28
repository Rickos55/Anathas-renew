const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const PORT = process.env.PORT || 3000;

// ─── DATABASE ───
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
  });
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './anathas.db',
    logging: false
  });
}

// ─── MODELS ───
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  email: { type: DataTypes.STRING(120), unique: true, allowNull: false },
  password: { type: DataTypes.STRING(256), allowNull: false },
  role: { type: DataTypes.STRING(20), defaultValue: 'player' },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Country = sequelize.define('Country', {
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  money: { type: DataTypes.FLOAT, defaultValue: 500000000 },
  agriculture: { type: DataTypes.INTEGER, defaultValue: 5 },
  industry: { type: DataTypes.INTEGER, defaultValue: 5 },
  commerce: { type: DataTypes.INTEGER, defaultValue: 5 },
  population: { type: DataTypes.INTEGER, defaultValue: 100000 },
  satisfaction: { type: DataTypes.FLOAT, defaultValue: 50 },
  employment: { type: DataTypes.FLOAT, defaultValue: 70 },
  health: { type: DataTypes.FLOAT, defaultValue: 50 },
  food: { type: DataTypes.FLOAT, defaultValue: 50 },
  plains: { type: DataTypes.INTEGER, defaultValue: 16000 },
  desert: { type: DataTypes.INTEGER, defaultValue: 3000 },
  urban: { type: DataTypes.INTEGER, defaultValue: 1000 },
  forests: { type: DataTypes.INTEGER, defaultValue: 20 },
  pollution: { type: DataTypes.FLOAT, defaultValue: 5 },
  carbonCredits: { type: DataTypes.INTEGER, defaultValue: 10 },
  infantry: { type: DataTypes.INTEGER, defaultValue: 0 },
  tanks: { type: DataTypes.INTEGER, defaultValue: 0 },
  aviation: { type: DataTypes.INTEGER, defaultValue: 0 },
  navy: { type: DataTypes.INTEGER, defaultValue: 0 },
  missiles: { type: DataTypes.INTEGER, defaultValue: 0 },
  specialForces: { type: DataTypes.INTEGER, defaultValue: 0 },
  militaryPower: { type: DataTypes.FLOAT, defaultValue: 0 },
  researchPoints: { type: DataTypes.FLOAT, defaultValue: 0 },
  rpAgriculture: { type: DataTypes.FLOAT, defaultValue: 0 },
  rpMilitary: { type: DataTypes.FLOAT, defaultValue: 0 },
  rpIndustry: { type: DataTypes.FLOAT, defaultValue: 0 },
  rpHealth: { type: DataTypes.FLOAT, defaultValue: 0 },
  rpEspionage: { type: DataTypes.FLOAT, defaultValue: 0 },
  techAgriculture: { type: DataTypes.INTEGER, defaultValue: 0 },
  techMilitary: { type: DataTypes.INTEGER, defaultValue: 0 },
  techIndustry: { type: DataTypes.INTEGER, defaultValue: 0 },
  techHealth: { type: DataTypes.INTEGER, defaultValue: 0 },
  techEspionage: { type: DataTypes.INTEGER, defaultValue: 0 },
  allocAgriculture: { type: DataTypes.FLOAT, defaultValue: 20 },
  allocMilitary: { type: DataTypes.FLOAT, defaultValue: 20 },
  allocIndustry: { type: DataTypes.FLOAT, defaultValue: 20 },
  allocHealth: { type: DataTypes.FLOAT, defaultValue: 20 },
  allocEspionage: { type: DataTypes.FLOAT, defaultValue: 20 },
  budgetAgriculture: { type: DataTypes.FLOAT, defaultValue: 20 },
  budgetIndustry: { type: DataTypes.FLOAT, defaultValue: 20 },
  budgetHealth: { type: DataTypes.FLOAT, defaultValue: 20 },
  budgetMilitary: { type: DataTypes.FLOAT, defaultValue: 20 },
  budgetResearch: { type: DataTypes.FLOAT, defaultValue: 20 },
  isBlockaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  gdp: { type: DataTypes.FLOAT, defaultValue: 0 },
  investAgri: { type: DataTypes.FLOAT, defaultValue: 0 },
  investIndustry: { type: DataTypes.FLOAT, defaultValue: 0 },
  investCommerce: { type: DataTypes.FLOAT, defaultValue: 0 },
  turnCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isProtected: { type: DataTypes.BOOLEAN, defaultValue: true },
  score: { type: DataTypes.FLOAT, defaultValue: 0 },
  allianceId: { type: DataTypes.INTEGER, allowNull: true }
});

const Alliance = sequelize.define('Alliance', {
  name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  leaderId: { type: DataTypes.INTEGER, allowNull: false }
});

const ChatMessage = sequelize.define('ChatMessage', {
  content: { type: DataTypes.TEXT, allowNull: false },
  channel: { type: DataTypes.STRING(20), defaultValue: 'general' },
  allianceId: { type: DataTypes.INTEGER, allowNull: true },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const ForumCategory = sequelize.define('ForumCategory', {
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  isOfficial: { type: DataTypes.BOOLEAN, defaultValue: false },
  order: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const ForumTopic = sequelize.define('ForumTopic', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
  isLocked: { type: DataTypes.BOOLEAN, defaultValue: false },
  categoryId: { type: DataTypes.INTEGER },
  authorId: { type: DataTypes.INTEGER }
});

const ForumPost = sequelize.define('ForumPost', {
  content: { type: DataTypes.TEXT, allowNull: false },
  topicId: { type: DataTypes.INTEGER },
  authorId: { type: DataTypes.INTEGER },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Notification = sequelize.define('Notification', {
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING(30), defaultValue: 'info' },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const War = sequelize.define('War', {
  attackerId: { type: DataTypes.INTEGER },
  defenderId: { type: DataTypes.INTEGER },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  territoryTransferred: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Battle = sequelize.define('Battle', {
  warId: { type: DataTypes.INTEGER },
  turnNumber: { type: DataTypes.INTEGER, defaultValue: 1 },
  attackerPower: { type: DataTypes.FLOAT, defaultValue: 0 },
  defenderPower: { type: DataTypes.FLOAT, defaultValue: 0 },
  result: { type: DataTypes.STRING(20), defaultValue: '' },
  territoryGained: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const MarketOffer = sequelize.define('MarketOffer', {
  sellerId: { type: DataTypes.INTEGER },
  buyerId: { type: DataTypes.INTEGER, allowNull: true },
  giveType: { type: DataTypes.STRING(30) },
  giveAmount: { type: DataTypes.FLOAT },
  wantType: { type: DataTypes.STRING(30) },
  wantAmount: { type: DataTypes.FLOAT },
  status: { type: DataTypes.STRING(20), defaultValue: 'open' }
});

const SpyMission = sequelize.define('SpyMission', {
  spyCountryId: { type: DataTypes.INTEGER },
  targetCountryId: { type: DataTypes.INTEGER },
  missionType: { type: DataTypes.STRING(30) },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  result: { type: DataTypes.TEXT, defaultValue: '' }
});

const TurnHistory = sequelize.define('TurnHistory', {
  countryId: { type: DataTypes.INTEGER, allowNull: false },
  turnNumber: { type: DataTypes.INTEGER, defaultValue: 0 },
  money: { type: DataTypes.FLOAT, defaultValue: 0 },
  income: { type: DataTypes.FLOAT, defaultValue: 0 },
  militaryCost: { type: DataTypes.FLOAT, defaultValue: 0 },
  population: { type: DataTypes.INTEGER, defaultValue: 0 },
  satisfaction: { type: DataTypes.FLOAT, defaultValue: 0 },
  pollution: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Report = sequelize.define('Report', {
  reporterId: { type: DataTypes.INTEGER, allowNull: false },
  targetUserId: { type: DataTypes.INTEGER, allowNull: true },
  targetMessageId: { type: DataTypes.INTEGER, allowNull: true },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  channel: { type: DataTypes.STRING(30), defaultValue: '' }
});

const Law = sequelize.define('Law', {
  countryId: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING(30), allowNull: false },
  value: { type: DataTypes.STRING(50), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  effect: { type: DataTypes.TEXT, defaultValue: '' }
});

const PrivateMessage = sequelize.define('PrivateMessage', {
  fromUserId: { type: DataTypes.INTEGER, allowNull: false },
  toUserId: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeletedBySender: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeletedByRecipient: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associations
User.hasOne(Country, { foreignKey: 'userId' });
Country.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(ChatMessage, { foreignKey: 'userId' });
ChatMessage.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// ─── HELPERS ───
function computeMilitaryPower(c) {
  const techBonus = 1 + (c.techMilitary * 0.1);
  return (c.infantry * 1 + c.tanks * 8 + c.aviation * 15 + c.navy * 10 + c.missiles * 20 + c.specialForces * 25) * techBonus;
}

function computeGDP(c) {
  // PIB = revenus annualisés (2 tours/jour * 365 jours)
  const total = Math.max(c.budgetAgriculture + c.budgetIndustry + c.budgetHealth + c.budgetMilitary + c.budgetResearch, 1);
  const popM = c.population / 1000000;
  const agri = popM * 500 * c.agriculture * (1 + (c.techAgriculture||0) * 0.15) * (c.budgetAgriculture / total);
  const ind  = popM * 800 * c.industry    * (1 + (c.techIndustry||0)    * 0.15) * (c.budgetIndustry / total);
  const com  = c.isBlockaded ? 0 : popM * 300 * c.commerce * (c.budgetIndustry / total);
  const tax  = c.population * 0.1;
  return Math.round((agri + ind + com + tax) * 730); // annualisé
}

function computeScore(c) {
  const tech = c.techAgriculture + c.techMilitary + c.techIndustry + c.techHealth + c.techEspionage;
  const territory = c.plains + c.desert + c.urban;
  const gdp = computeGDP(c);
  return Math.round(c.money * 0.000001 + c.population * 0.0001 + c.militaryPower * 0.5 + tech * 100 + territory * 0.01 + gdp * 0.000001);
}

function techCost(level) { return 50 * (level + 1); }

async function notify(userId, content, type = 'info') {
  await Notification.create({ userId, content, type });
}

async function getUnread(userId) {
  return Notification.count({ where: { userId, isRead: false } });
}

// ─── MIDDLEWARE ───
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session({
  secret: process.env.SECRET_KEY || 'anathas-secret-dev',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({ db: 'sessions.db', dir: './' }),
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 jours
}));
app.use(flash());

app.use(async (req, res, next) => {
  res.locals.session = req.session;
  res.locals.now = new Date();
  res.locals.currentCountry = null;
  if (req.session.userId) {
    const user = await User.findByPk(req.session.userId, { include: Country });
    if (user && user.Country) res.locals.currentCountry = user.Country;
  }
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') return res.redirect('/dashboard');
  next();
}
function requireMod(req, res, next) {
  if (!req.session.userId || !['admin','moderator'].includes(req.session.role)) return res.redirect('/dashboard');
  next();
}

// ─── AUTH ───
// ─── ADS.TXT (requis pour AdSense) ───
app.get('/ads.txt', (req, res) => {
  res.type('text/plain');
  res.send('google.com, pub-7302486476390124, DIRECT, f08c47fec0942fa0');
});

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('index');
});

app.get('/login', (req, res) => res.render('login', { error: req.flash('error') }));
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    req.flash('error', 'Identifiants incorrects.');
    return res.redirect('/login');
  }
  if (user.isBanned) { req.flash('error', 'Votre compte a été banni.'); return res.redirect('/login'); }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  res.redirect('/dashboard');
});

app.get('/register', (req, res) => res.render('register', { error: req.flash('error') }));
app.post('/register', async (req, res) => {
  const { username, email, password, country_name } = req.body;
  const accept_cgu = req.body.accept_cgu;
  if (!username || !email || !password || !country_name) { req.flash('error', 'Tous les champs sont obligatoires.'); return res.redirect('/register'); }
  if (!accept_cgu) { req.flash("error", "Vous devez accepter les conditions d'utilisation."); return res.redirect("/register"); }
  if (password.length < 6) { req.flash('error', 'Mot de passe trop court (6 caractères min).'); return res.redirect('/register'); }
  if (await User.findOne({ where: { username } })) { req.flash('error', "Nom d'utilisateur déjà pris."); return res.redirect('/register'); }
  if (await User.findOne({ where: { email } })) { req.flash('error', 'Email déjà utilisé.'); return res.redirect('/register'); }
  if (await Country.findOne({ where: { name: country_name } })) { req.flash('error', 'Nom de pays déjà pris.'); return res.redirect('/register'); }
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hash });
  const country = await Country.create({ name: country_name, userId: user.id });
  country.militaryPower = computeMilitaryPower(country);
  country.score = computeScore(country);
  await country.save();
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// ─── DASHBOARD ───
app.get('/dashboard', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  if (!user || !user.Country) return res.redirect('/register');
  const c = user.Country;
  c.militaryPower = computeMilitaryPower(c);
  c.score = computeScore(c);
  await c.save();
  const unread = await getUnread(user.id);
  let alliance = null;
  if (c.allianceId) alliance = await Alliance.findByPk(c.allianceId);
  const projections = computeProjections(c);
  res.render('dashboard', { user, country: c, alliance, unread, projections });
});

app.post('/budget', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { ba, bi, bh, bm, br } = { ba: parseFloat(req.body.budget_agriculture)||0, bi: parseFloat(req.body.budget_industry)||0, bh: parseFloat(req.body.budget_health)||0, bm: parseFloat(req.body.budget_military)||0, br: parseFloat(req.body.budget_research)||0 };
  if (Math.abs(ba+bi+bh+bm+br - 100) <= 0.5) {
    c.budgetAgriculture = ba; c.budgetIndustry = bi; c.budgetHealth = bh; c.budgetMilitary = bm; c.budgetResearch = br;
    await c.save();
  }
  res.redirect('/dashboard');
});

// ─── MILITARY ───
app.get('/military', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const unread = await getUnread(user.id);
  const war = await War.findOne({ where: { status: 'active', attackerId: c.id } }) || await War.findOne({ where: { status: 'active', defenderId: c.id } });
  let warDetails = null;
  if (war) {
    const battles = await Battle.findAll({ where: { warId: war.id }, order: [['createdAt', 'DESC']], limit: 5 });
    const enemyId = war.attackerId === c.id ? war.defenderId : war.attackerId;
    const enemy = await Country.findByPk(enemyId, { include: User });
    warDetails = { war, battles, enemy };
  }
  res.render('military', { user, country: c, war, warDetails, unread });
});

app.post('/military/recruit', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { unit_type, quantity } = req.body;
  const qty = parseInt(quantity) || 0;
  const costs = { infantry:[10,1], tanks:[500,5], aviation:[1000,3], navy:[800,4], missiles:[1500,2], specialForces:[2000,10] };
  const unitMap = { infantry:'infantry', tanks:'tanks', aviation:'aviation', navy:'navy', missiles:'missiles', special_forces:'specialForces' };
  const key = unitMap[unit_type];
  if (!key || qty <= 0 || !costs[key]) return res.redirect('/military');
  const [costMoney] = costs[key];
  if (c.money < costMoney * qty) return res.redirect('/military');
  c.money -= costMoney * qty;
  c[key] += qty;
  c.militaryPower = computeMilitaryPower(c);
  await c.save();
  res.redirect('/military');
});

app.post('/military/attack/:targetId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const target = await Country.findByPk(req.params.targetId, { include: User });
  if (!target || target.id === c.id) return res.redirect('/ranking');
  // Protection nouveaux joueurs
  if (target.isProtected) return res.redirect('/ranking');
  // Vérification règle territoire (top 5 exempt)
  const allCountries = await Country.findAll();
  allCountries.sort((a,b) => b.score - a.score);
  const top5ids = allCountries.slice(0,5).map(x => x.id);
  if (!top5ids.includes(c.id)) {
    const myTerr = c.plains + c.desert + c.urban;
    const theirTerr = target.plains + target.desert + target.urban;
    if (theirTerr < myTerr * 0.9) return res.redirect('/ranking');
  }
  const existingWar = await War.findOne({ where: { status: 'active', attackerId: c.id } });
  if (existingWar) return res.redirect('/military');
  await War.create({ attackerId: c.id, defenderId: target.id });
  await notify(target.userId, `⚠️ ${c.name} vous a déclaré la guerre !`, 'war');
  res.redirect('/military');
});

app.post('/military/send', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const war = await War.findOne({ where: { status: 'active', attackerId: c.id } });
  if (!war) return res.redirect('/military');
  const defender = await Country.findByPk(war.defenderId, { include: User });
  const units = ['infantry','tanks','aviation','navy','missiles','specialForces'];
  const powers = { infantry:1, tanks:8, aviation:15, navy:10, missiles:20, specialForces:25 };
  const techBonus = 1 + (c.techMilitary * 0.1);
  let attPower = 0;
  for (const u of units) {
    const qty = Math.min(parseInt(req.body[u])||0, c[u]);
    attPower += qty * (powers[u]||1) * techBonus;
  }
  if (attPower === 0) return res.redirect('/military');
  const attRoll = attPower * (0.8 + Math.random() * 0.4);
  const defRoll = defender.militaryPower * (0.8 + Math.random() * 0.4) * 1.1;
  const result = attRoll > defRoll ? 'attacker_wins' : 'defender_wins';
  let territoryGained = 0;
  if (result === 'attacker_wins') {
    territoryGained = Math.floor(Math.random() * 4) + 1;
    if (defender.territory_total > territoryGained + 5) {
      defender.plains = Math.max(0, defender.plains - territoryGained);
      c.plains += territoryGained;
      war.territoryTransferred += territoryGained;
    }
  }
  const battles = await Battle.count({ where: { warId: war.id } });
  await Battle.create({ warId: war.id, turnNumber: battles+1, attackerPower: Math.round(attRoll), defenderPower: Math.round(defRoll), result, territoryGained });
  c.militaryPower = computeMilitaryPower(c);
  defender.militaryPower = computeMilitaryPower(defender);
  await c.save(); await defender.save(); await war.save();
  const msg = result === 'attacker_wins' ? `⚔️ ${c.name} vous attaque ! Vous perdez ${territoryGained} km².` : `⚔️ ${c.name} vous attaque ! Vous avez résisté !`;
  await notify(defender.userId, msg, 'war');
  res.redirect('/military');
});

app.post('/military/peace/:warId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const war = await War.findByPk(req.params.warId);
  if (!war) return res.redirect('/military');
  war.status = 'peace';
  await war.save();
  const enemyId = war.attackerId === user.Country.id ? war.defenderId : war.attackerId;
  const enemy = await Country.findByPk(enemyId, { include: User });
  await notify(enemy.userId, `🕊️ ${user.Country.name} a demandé la paix.`, 'war');
  res.redirect('/military');
});

// ─── RESEARCH ───
app.get('/research', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const unread = await getUnread(user.id);
  const domains = ['agriculture','military','industry','health','espionage'];
  const techInfo = domains.map(d => ({
    domain: d,
    level: c[`tech${d.charAt(0).toUpperCase()+d.slice(1)}`],
    rp: Math.round(c[`rp${d.charAt(0).toUpperCase()+d.slice(1)}`] * 10) / 10,
    cost: techCost(c[`tech${d.charAt(0).toUpperCase()+d.slice(1)}`]),
    alloc: c[`alloc${d.charAt(0).toUpperCase()+d.slice(1)}`],
    progress: Math.min(100, Math.round(c[`rp${d.charAt(0).toUpperCase()+d.slice(1)}`] / techCost(c[`tech${d.charAt(0).toUpperCase()+d.slice(1)}`]) * 100))
  }));
  res.render('research', { user, country: c, techInfo, unread });
});

app.post('/research/allocate', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const domains = ['agriculture','military','industry','health','espionage'];
  const vals = domains.map(d => parseFloat(req.body[`alloc_${d}`])||0);
  if (Math.abs(vals.reduce((a,b)=>a+b,0) - 100) <= 0.5) {
    domains.forEach((d,i) => { c[`alloc${d.charAt(0).toUpperCase()+d.slice(1)}`] = vals[i]; });
    await c.save();
  }
  res.redirect('/research');
});

app.post('/research/unlock/:domain', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const d = req.params.domain;
  const key = d.charAt(0).toUpperCase()+d.slice(1);
  const rp = c[`rp${key}`];
  const cost = techCost(c[`tech${key}`]);
  if (rp >= cost) {
    c[`rp${key}`] -= cost;
    c[`tech${key}`] += 1;
    await c.save();
    await notify(user.id, `🔬 Technologie ${d} montée au niveau ${c[`tech${key}`]} !`, 'research');
  }
  res.redirect('/research');
});

// ─── DIPLOMACY ───
app.get('/diplomacy', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const countries = await Country.findAll({ where: { id: { [Sequelize.Op.ne]: c.id } }, include: User });
  const spyMissions = await SpyMission.findAll({ where: { spyCountryId: c.id }, order: [['createdAt','DESC']], limit: 15 });
  const unread = await getUnread(user.id);
  res.render('diplomacy', { user, country: c, countries, spyMissions, unread });
});

app.post('/diplomacy/blockade/:targetId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const target = await Country.findByPk(req.params.targetId, { include: User });
  if (!target) return res.redirect('/diplomacy');
  target.isBlockaded = true;
  await target.save();
  await notify(target.userId, `🚫 ${user.Country.name} vous impose un blocus économique !`, 'diplomacy');
  res.redirect('/diplomacy');
});

app.post('/diplomacy/spy', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { target_id, mission_type } = req.body;
  const target = await Country.findByPk(target_id, { include: User });
  if (!target) return res.redirect('/diplomacy');
  const costs = { steal_money: 500, reveal_stats: 200, sabotage_army: 1000, sabotage_industry: 800 };
  const cost = costs[mission_type];
  if (!cost || c.money < cost) return res.redirect('/diplomacy');
  c.money -= cost;
  const successChance = 0.4 + c.techEspionage * 0.1;
  const success = Math.random() < successChance;
  let result = '';
  if (success) {
    if (mission_type === 'steal_money') {
      const amount = Math.min(target.money * 0.05, 2000);
      target.money = Math.max(0, target.money - amount);
      c.money += amount;
      result = `✅ Succès : ${Math.round(amount)} § volés à ${target.name}`;
      await notify(target.userId, `💰 Espionnage subi ! De l'argent a été volé.`, 'spy');
    } else if (mission_type === 'reveal_stats') {
      result = `✅ Succès : ${target.name} — Armée: ${Math.round(target.militaryPower)}, Argent: ${Math.round(target.money)}§, Pop: ${target.population.toLocaleString()}, Score: ${Math.round(target.score)}`;
    } else if (mission_type === 'sabotage_army') {
      const losses = Math.floor(target.infantry * 0.1);
      target.infantry = Math.max(0, target.infantry - losses);
      target.militaryPower = computeMilitaryPower(target);
      result = `✅ Succès : armée de ${target.name} sabotée (${losses} unités détruites)`;
      await notify(target.userId, `💣 Sabotage ! Votre armée a subi des pertes.`, 'spy');
    } else if (mission_type === 'sabotage_industry') {
      target.money = Math.max(0, target.money - 500);
      result = `✅ Succès : industrie de ${target.name} sabotée`;
      await notify(target.userId, `🏭 Sabotage ! Votre industrie a subi des dommages.`, 'spy');
    }
  } else {
    result = `❌ Échec : la mission contre ${target.name} a échoué.`;
    await notify(target.userId, `🕵️ Une tentative d'espionnage a été déjouée.`, 'spy');
  }
  await SpyMission.create({ spyCountryId: c.id, targetCountryId: target.id, missionType: mission_type, status: success ? 'success' : 'failed', result });
  await c.save(); await target.save();
  res.redirect('/diplomacy');
});

// ─── MARKET ───
app.get('/market', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const offers = await MarketOffer.findAll({ where: { status: 'open' }, order: [['createdAt','DESC']] });
  const myOffers = await MarketOffer.findAll({ where: { sellerId: c.id }, order: [['createdAt','DESC']], limit: 10 });
  const recentTrades = await MarketOffer.findAll({ where: { status: 'accepted' }, order: [['createdAt','DESC']], limit: 10 });
  const unread = await getUnread(user.id);
  const labels = { money:'Argent (§)', carbonCredits:'Crédits Carbone', researchPoints:'Points de Recherche', plains:'Territoire (km²)' };
  // Add seller country to offers
  for (const o of offers) { o.sellerCountry = await Country.findByPk(o.sellerId); }
  for (const o of recentTrades) { o.sellerCountry = await Country.findByPk(o.sellerId); o.buyerCountry = o.buyerId ? await Country.findByPk(o.buyerId) : null; }
  res.render('market', { user, country: c, offers, myOffers, recentTrades, labels, unread });
});

app.post('/market/create', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { give_type, give_amount, want_type, want_amount } = req.body;
  const giveAmt = parseFloat(give_amount)||0, wantAmt = parseFloat(want_amount)||0;
  const valid = ['money','carbonCredits','researchPoints','plains'];
  if (!valid.includes(give_type) || !valid.includes(want_type) || give_type === want_type) return res.redirect('/market');
  if (giveAmt <= 0 || wantAmt <= 0 || c[give_type] < giveAmt) return res.redirect('/market');
  await MarketOffer.create({ sellerId: c.id, giveType: give_type, giveAmount: giveAmt, wantType: want_type, wantAmount: wantAmt });
  res.redirect('/market');
});

app.post('/market/accept/:offerId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const buyer = user.Country;
  const offer = await MarketOffer.findByPk(req.params.offerId);
  if (!offer || offer.status !== 'open' || offer.sellerId === buyer.id) return res.redirect('/market');
  const seller = await Country.findByPk(offer.sellerId, { include: User });
  if (buyer[offer.wantType] < offer.wantAmount || seller[offer.giveType] < offer.giveAmount) return res.redirect('/market');
  seller[offer.giveType] -= offer.giveAmount;
  buyer[offer.giveType] = (buyer[offer.giveType]||0) + offer.giveAmount;
  buyer[offer.wantType] -= offer.wantAmount;
  seller[offer.wantType] = (seller[offer.wantType]||0) + offer.wantAmount;
  offer.status = 'accepted'; offer.buyerId = buyer.id;
  await seller.save(); await buyer.save(); await offer.save();
  await notify(seller.userId, `✅ Votre offre a été acceptée par ${buyer.name} !`, 'info');
  res.redirect('/market');
});

app.post('/market/cancel/:offerId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const offer = await MarketOffer.findByPk(req.params.offerId);
  if (offer && offer.sellerId === user.Country.id && offer.status === 'open') { offer.status = 'cancelled'; await offer.save(); }
  res.redirect('/market');
});

// ─── TERRITORY ───
app.get('/territory', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const unread = await getUnread(user.id);
  res.render('territory', { user, country: user.Country, unread });
});

app.post('/territory/action', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { action } = req.body;
  if (action === 'reforest' && c.desert > 0 && c.money >= 200) { c.desert--; c.forests += 500; c.money -= 200; c.pollution = Math.max(0, c.pollution - 2); }
  else if (action === 'deforest' && c.forests > 0 && c.money >= 100) { c.forests = Math.max(0, c.forests - 500); c.plains++; c.money -= 100; }
  else if (action === 'irrigate' && c.desert > 0 && c.money >= 300) { c.desert--; c.plains++; c.money -= 300; }
  else if (action === 'urbanize' && c.plains > 5 && c.money >= 500) { c.plains--; c.urban++; c.money -= 500; }
  await c.save();
  res.redirect('/territory');
});

// ─── RANKING ───
app.get('/ranking', requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, { include: Country });
    const countries = await Country.findAll({ include: User });
    for (const c of countries) {
      c.militaryPower = computeMilitaryPower(c);
      c.score = computeScore(c);
      await c.save();
      c.allianceName = c.allianceId ? ((await Alliance.findByPk(c.allianceId))?.name || '—') : '—';
    }
    countries.sort((a,b) => b.score - a.score);
    const unread = await getUnread(user.id);
    res.render('ranking', { user, country: user.Country, countries, unread });
  } catch(err) {
    console.error('Ranking error:', err);
    res.status(500).send('Erreur classement: ' + err.message);
  }
});

// ─── ALLIANCES ───
app.get('/alliances', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const alliances = await Alliance.findAll();
  for (const a of alliances) { a.members = await Country.findAll({ where: { allianceId: a.id } }); }
  const unread = await getUnread(user.id);
  res.render('alliances', { user, country: user.Country, alliances, unread });
});

app.post('/alliances/create', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const { name, description } = req.body;
  if (!name || await Alliance.findOne({ where: { name } })) return res.redirect('/alliances');
  const alliance = await Alliance.create({ name, description, leaderId: user.id });
  user.Country.allianceId = alliance.id;
  await user.Country.save();
  res.redirect('/alliances');
});

app.post('/alliances/join/:id', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  user.Country.allianceId = parseInt(req.params.id);
  await user.Country.save();
  res.redirect('/alliances');
});

app.post('/alliances/leave', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  user.Country.allianceId = null;
  await user.Country.save();
  res.redirect('/alliances');
});

// ─── CHAT ───
app.get('/chat', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const alliance = user.Country.allianceId ? await Alliance.findByPk(user.Country.allianceId) : null;
  const unread = await getUnread(user.id);
  res.render('chat', { user, country: user.Country, alliance, unread });
});

app.get('/api/chat/messages', requireLogin, async (req, res) => {
  const { channel, alliance_id } = req.query;
  let where = { isDeleted: false };
  if (channel === 'alliance' && alliance_id) { where.channel = 'alliance'; where.allianceId = parseInt(alliance_id); }
  else { where.channel = 'general'; }
  const msgs = await ChatMessage.findAll({ where, include: User, order: [['createdAt','DESC']], limit: 50 });
  res.json(msgs.reverse().map(m => ({ id: m.id, username: m.User.username, role: m.User.role, content: m.content, time: m.createdAt.toTimeString().slice(0,5) })));
});

// Anti-spam : limite 3 messages par 10 secondes
const chatCooldowns = new Map();
app.post('/api/chat/send', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  if (user.isBanned) return res.status(403).json({ error: 'Banni' });
  const { content, channel, alliance_id } = req.body;
  if (!content || content.length > 500) return res.status(400).json({ error: 'Invalide' });
  // Spam check
  const now = Date.now();
  const key = user.id;
  if (!chatCooldowns.has(key)) chatCooldowns.set(key, []);
  const times = chatCooldowns.get(key).filter(t => now - t < 10000);
  if (times.length >= 3) return res.status(429).json({ error: 'Trop rapide ! Attendez quelques secondes.' });
  times.push(now);
  chatCooldowns.set(key, times);
  await ChatMessage.create({ userId: user.id, content, channel: channel||'general', allianceId: alliance_id ? parseInt(alliance_id) : null });
  res.json({ success: true });
});

app.post('/api/chat/delete/:id', requireMod, async (req, res) => {
  const msg = await ChatMessage.findByPk(req.params.id);
  if (msg) { msg.isDeleted = true; await msg.save(); }
  res.json({ success: true });
});

// ─── FORUM ───
app.get('/forum', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const categories = await ForumCategory.findAll({ order: [['order','ASC']] });
  for (const cat of categories) { cat.topicCount = await ForumTopic.count({ where: { categoryId: cat.id } }); }
  const unread = await getUnread(user.id);
  res.render('forum', { user, categories, unread });
});

app.get('/forum/category/:id', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const category = await ForumCategory.findByPk(req.params.id);
  if (!category) return res.redirect('/forum');
  const topics = await ForumTopic.findAll({ where: { categoryId: category.id }, order: [['isPinned','DESC'],['updatedAt','DESC']] });
  for (const t of topics) { t.author = await User.findByPk(t.authorId); t.postCount = await ForumPost.count({ where: { topicId: t.id } }); }
  const unread = await getUnread(user.id);
  res.render('forum_category', { user, category, topics, unread });
});

app.get('/forum/topic/:id', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const topic = await ForumTopic.findByPk(req.params.id);
  if (!topic) return res.redirect('/forum');
  topic.category = await ForumCategory.findByPk(topic.categoryId);
  topic.authorUser = await User.findByPk(topic.authorId);
  const posts = await ForumPost.findAll({ where: { topicId: topic.id, isDeleted: false }, order: [['createdAt','ASC']] });
  for (const p of posts) { p.authorUser = await User.findByPk(p.authorId); }
  const unread = await getUnread(user.id);
  res.render('forum_topic', { user, topic, posts, unread });
});

app.post('/forum/topic/:id/reply', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const topic = await ForumTopic.findByPk(req.params.id);
  if (!topic || (topic.isLocked && !['admin','moderator'].includes(user.role))) return res.redirect(`/forum/topic/${req.params.id}`);
  const { content } = req.body;
  if (content && content.trim()) {
    await ForumPost.create({ topicId: topic.id, authorId: user.id, content: content.trim() });
    topic.changed('updatedAt', true); await topic.save();
  }
  res.redirect(`/forum/topic/${topic.id}`);
});

app.post('/forum/new/:categoryId', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const cat = await ForumCategory.findByPk(req.params.categoryId);
  if (!cat || (cat.isOfficial && !['admin','moderator'].includes(user.role))) return res.redirect('/forum');
  const { title, content } = req.body;
  if (title && content) {
    const topic = await ForumTopic.create({ categoryId: cat.id, authorId: user.id, title });
    await ForumPost.create({ topicId: topic.id, authorId: user.id, content });
  }
  res.redirect(`/forum/category/${cat.id}`);
});

app.post('/forum/topic/:id/lock', requireMod, async (req, res) => {
  const topic = await ForumTopic.findByPk(req.params.id);
  if (topic) { topic.isLocked = !topic.isLocked; await topic.save(); }
  res.redirect(`/forum/topic/${req.params.id}`);
});

app.post('/forum/topic/:id/pin', requireMod, async (req, res) => {
  const topic = await ForumTopic.findByPk(req.params.id);
  if (topic) { topic.isPinned = !topic.isPinned; await topic.save(); }
  res.redirect(`/forum/topic/${req.params.id}`);
});

// ─── NOTIFICATIONS ───
app.get('/notifications', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const notifs = await Notification.findAll({ where: { userId: user.id }, order: [['createdAt','DESC']], limit: 50 });
  await Notification.update({ isRead: true }, { where: { userId: user.id } });
  res.render('notifications', { user, notifs, unread: 0 });
});

app.get('/api/notifications/count', requireLogin, async (req, res) => {
  res.json({ count: await getUnread(req.session.userId) });
});

// ─── GUIDE ───
app.get('/guide', async (req, res) => {
  const user = req.session.userId ? await User.findByPk(req.session.userId, { include: Country }) : null;
  const unread = user ? await getUnread(user.id) : 0;
  const currentCountry = user && user.Country ? user.Country : null;
  res.render('guide', { user, unread, currentCountry, session: req.session });
});

// ─── ADMIN ───
app.get('/admin', requireAdmin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const allUsers = await User.findAll({ order: [['createdAt','DESC']] });
  for (const u of allUsers) { u.Country = await Country.findOne({ where: { userId: u.id } }); }
  const users = allUsers;
  const unread = await getUnread(user.id);
  res.render('admin', { user, users, unread });
});

app.post('/admin/run_turn', requireAdmin, async (req, res) => {
  await processTurn();
  res.json({ success: true, message: 'Tour traité !' });
});

app.post('/admin/set_role/:userId/:role', requireAdmin, async (req, res) => {
  const u = await User.findByPk(req.params.userId);
  if (u && ['player','moderator','admin'].includes(req.params.role)) { u.role = req.params.role; await u.save(); }
  res.json({ success: true });
});

app.post('/admin/ban/:userId', requireMod, async (req, res) => {
  const u = await User.findByPk(req.params.userId);
  if (u && u.role !== 'admin') { u.isBanned = !u.isBanned; await u.save(); }
  res.json({ success: true, banned: u.isBanned });
});

app.post('/admin/forum/category', requireAdmin, async (req, res) => {
  const { name, description, is_official } = req.body;
  if (name) await ForumCategory.create({ name, description: description||'', isOfficial: is_official === 'on', order: await ForumCategory.count() });
  res.redirect('/admin');
});

app.post('/admin/announce', requireAdmin, async (req, res) => {
  const { message } = req.body;
  if (message && message.trim()) {
    const users = await User.findAll();
    for (const u of users) {
      await notify(u.id, '📢 Annonce admin : ' + message.trim(), 'info');
    }
  }
  res.redirect('/admin');
});


// ─── PROFIL ───
app.get('/profile', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const unread = await getUnread(user.id);
  res.render('profile', { user, country: user.Country, unread });
});

app.post('/profile/update', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const { email, password, new_password } = req.body;
  if (email) user.email = email;
  if (password && new_password && new_password.length >= 6) {
    const valid = await bcrypt.compare(password, user.password);
    if (valid) user.password = await bcrypt.hash(new_password, 10);
  }
  await user.save();
  res.redirect('/profile');
});

// ─── JOUEURS CONNECTÉS ───
app.get('/connected', requireLogin, async (req, res) => {
  try {
    const user = await User.findByPk(req.session.userId, { include: Country });
    const allUsers = await User.findAll({ order: [['createdAt','DESC']] });
  for (const u of allUsers) { u.Country = await Country.findOne({ where: { userId: u.id } }); }
  const users = allUsers;
    const unread = await getUnread(user.id);
    res.render('connected', { user, country: user.Country, users, unread });
  } catch(err) {
    console.error('Connected error:', err);
    res.redirect('/dashboard');
  }
});

// ─── ADMIN EDIT COUNTRY ───
app.get('/admin/country/:countryId', requireAdmin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const country = await Country.findByPk(req.params.countryId, { include: User });
  if (!country) return res.redirect('/admin');
  const unread = await getUnread(user.id);
  res.render('admin_country', { user, country, unread });
});

app.post('/admin/country/:countryId', requireAdmin, async (req, res) => {
  const country = await Country.findByPk(req.params.countryId);
  if (!country) return res.redirect('/admin');
  const fields = ['money','agriculture','industry','commerce','population','satisfaction',
    'employment','health','food','plains','desert','urban','forests','pollution',
    'carbonCredits','infantry','tanks','aviation','navy','missiles','specialForces',
    'techAgriculture','techMilitary','techIndustry','techHealth','techEspionage',
    'budgetAgriculture','budgetIndustry','budgetHealth','budgetMilitary','budgetResearch'];
  fields.forEach(f => {
    if (req.body[f] !== undefined && req.body[f] !== '') {
      country[f] = parseFloat(req.body[f]);
    }
  });
  country.militaryPower = computeMilitaryPower(country);
  country.score = computeScore(country);
  await country.save();
  res.redirect('/admin');
});

// ─── MESSAGERIE PRIVÉE ───
app.get('/messages', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const unread = await getUnread(user.id);
  // Boîte de réception
  const received = await PrivateMessage.findAll({
    where: { toUserId: user.id, isDeletedByRecipient: false },
    order: [['createdAt','DESC']], limit: 50
  });
  // Boîte d'envoi
  const sent = await PrivateMessage.findAll({
    where: { fromUserId: user.id, isDeletedBySender: false },
    order: [['createdAt','DESC']], limit: 50
  });
  // Enrichir avec les noms
  for (const m of [...received, ...sent]) {
    m.fromUser = await User.findByPk(m.fromUserId);
    m.toUser = await User.findByPk(m.toUserId);
  }
  // Marquer comme lus
  await PrivateMessage.update({ isRead: true }, { where: { toUserId: user.id, isRead: false } });
  const users = await User.findAll({ where: { id: { [Sequelize.Op.ne]: user.id } }, include: Country });
  res.render('messages', { user, country: user.Country, received, sent, users, unread });
});

app.post('/messages/send', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const { to_user_id, content } = req.body;
  if (!to_user_id || !content || !content.trim()) return res.redirect('/messages');
  const target = await User.findByPk(to_user_id);
  if (!target) return res.redirect('/messages');
  await PrivateMessage.create({
    fromUserId: user.id,
    toUserId: parseInt(to_user_id),
    content: content.trim()
  });
  // Notification
  await notify(parseInt(to_user_id), `✉️ Nouveau message de ${user.username}`, 'info');
  res.redirect('/messages');
});

app.post('/messages/delete/:id', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const msg = await PrivateMessage.findByPk(req.params.id);
  if (!msg) return res.redirect('/messages');
  if (msg.fromUserId === user.id) msg.isDeletedBySender = true;
  if (msg.toUserId === user.id) msg.isDeletedByRecipient = true;
  await msg.save();
  res.redirect('/messages');
});

app.get('/api/messages/unread', requireLogin, async (req, res) => {
  const count = await PrivateMessage.count({ where: { toUserId: req.session.userId, isRead: false } });
  res.json({ count });
});


// ─── FINANCES PUBLIQUES ───
app.get('/finances', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  c.gdp = computeGDP(c);
  await c.save();
  const projections = computeProjections(c);
  const unread = await getUnread(user.id);
  res.render('finances', { user, country: c, projections, unread });
});

// ─── STATS GLOBALES ───
app.get('/stats', async (req, res) => {
  const user = req.session.userId ? await User.findByPk(req.session.userId, { include: Country }) : null;
  const unread = user ? await getUnread(user.id) : 0;
  const totalPlayers = await User.count();
  const totalCountries = await Country.count();
  const richest = await Country.findOne({ order: [['money','DESC']], include: User });
  const mostPop = await Country.findOne({ order: [['population','DESC']], include: User });
  const strongest = await Country.findOne({ order: [['militaryPower','DESC']], include: User });
  const topScore = await Country.findOne({ order: [['score','DESC']], include: User });
  res.render('stats', { user, unread, currentCountry: user?.Country||null, session: req.session,
    totalPlayers, totalCountries, richest, mostPop, strongest, topScore });
});

// ─── CLASSEMENT PUBLIC ───
app.get('/public/ranking', async (req, res) => {
  const countries = await Country.findAll({ include: User });
  for (const c of countries) { c.score = computeScore(c); }
  countries.sort((a,b) => b.score - a.score);
  res.render('public_ranking', { countries, session: req.session||{} });
});

// ─── CGU ───
app.get('/cgu', (req, res) => {
  const user = null;
  res.render('cgu', { user, unread: 0, currentCountry: null, session: req.session||{} });
});

// ─── HISTORIQUE DES TOURS ───
app.get('/history', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const history = await TurnHistory.findAll({
    where: { countryId: user.Country.id },
    order: [['createdAt','DESC']], limit: 30
  });
  const unread = await getUnread(user.id);
  res.render('history', { user, country: user.Country, history, unread });
});

// ─── JOURNAL DE GUERRE ───
app.get('/warlog', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const wars = await War.findAll({
    where: { [Sequelize.Op.or]: [{ attackerId: c.id }, { defenderId: c.id }] },
    order: [['createdAt','DESC']], limit: 20
  });
  for (const w of wars) {
    w.attacker = await Country.findByPk(w.attackerId);
    w.defender = await Country.findByPk(w.defenderId);
    w.battlesList = await Battle.findAll({ where: { warId: w.id }, order: [['createdAt','ASC']] });
  }
  const unread = await getUnread(user.id);
  res.render('warlog', { user, country: c, wars, unread });
});

// ─── LOIS ───
const LAW_DEFINITIONS = {
  fiscalite: [
    { value: 'low', name: 'Fiscalité légère', effect: 'Satisfaction +5%, Revenus -10%' },
    { value: 'medium', name: 'Fiscalité modérée', effect: 'Aucun effet particulier' },
    { value: 'heavy', name: 'Fiscalité lourde', effect: 'Satisfaction -5%, Revenus +15%' }
  ],
  liberte: [
    { value: 'liberal', name: 'Régime libéral', effect: 'Satisfaction +8%, Commerce +10%' },
    { value: 'moderate', name: 'Régime modéré', effect: 'Équilibré' },
    { value: 'authoritarian', name: 'Régime autoritaire', effect: 'Satisfaction -10%, Militaire +15%' }
  ],
  environnement: [
    { value: 'green', name: 'Politique verte', effect: 'Pollution -20%, Industrie -5%' },
    { value: 'neutral', name: 'Politique neutre', effect: 'Aucun effet' },
    { value: 'industrial', name: 'Politique industrielle', effect: 'Pollution +15%, Industrie +10%' }
  ],
  education: [
    { value: 'high', name: 'Education prioritaire', effect: 'Recherche +20%, Revenus -5%' },
    { value: 'medium', name: 'Education standard', effect: 'Équilibré' },
    { value: 'low', name: 'Education minimale', effect: 'Recherche -10%, Revenus +5%' }
  ]
};

app.get('/laws', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const laws = await Law.findAll({ where: { countryId: c.id } });
  const lawsMap = {};
  laws.forEach(l => { lawsMap[l.category] = l; });
  const unread = await getUnread(user.id);
  res.render('laws', { user, country: c, laws: lawsMap, lawDefs: LAW_DEFINITIONS, unread });
});

app.post('/laws/set', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const c = user.Country;
  const { category, value } = req.body;
  if (!LAW_DEFINITIONS[category]) return res.redirect('/laws');
  const lawDef = LAW_DEFINITIONS[category].find(l => l.value === value);
  if (!lawDef) return res.redirect('/laws');
  await Law.upsert({ countryId: c.id, category, value, name: lawDef.name, effect: lawDef.effect });
  await notify(user.id, `⚖️ Loi ${category} modifiée : ${lawDef.name}`, 'info');
  res.redirect('/laws');
});

// ─── SIGNALEMENT ───
app.post('/report', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const { target_user_id, target_message_id, reason, channel } = req.body;
  if (!reason || !reason.trim()) return res.json({ error: 'Raison requise' });
  await Report.create({
    reporterId: user.id,
    targetUserId: target_user_id ? parseInt(target_user_id) : null,
    targetMessageId: target_message_id ? parseInt(target_message_id) : null,
    reason: reason.trim(),
    channel: channel || ''
  });
  // Notifier les admins/modos
  const mods = await User.findAll({ where: { role: ['admin','moderator'] } });
  for (const m of mods) {
    await notify(m.id, `🚨 Signalement reçu de ${user.username} : ${reason.trim().substring(0,50)}`, 'info');
  }
  res.json({ success: true });
});

app.get('/admin/reports', requireMod, async (req, res) => {
  const user = await User.findByPk(req.session.userId);
  const reports = await Report.findAll({ order: [['createdAt','DESC']], limit: 50 });
  for (const r of reports) {
    r.reporter = await User.findByPk(r.reporterId);
    r.targetUser = r.targetUserId ? await User.findByPk(r.targetUserId) : null;
  }
  const unread = await getUnread(user.id);
  const currentCountry = await Country.findOne({ where: { userId: user.id } });
  res.render('admin_reports', { user, reports, unread, currentCountry, session: req.session });
});

app.post('/admin/reports/resolve/:id', requireMod, async (req, res) => {
  const report = await Report.findByPk(req.params.id);
  if (report) { report.status = 'resolved'; await report.save(); }
  res.json({ success: true });
});

// ─── TUTORIEL ───
app.get('/tutorial', requireLogin, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { include: Country });
  const unread = await getUnread(user.id);
  res.render('tutorial', { user, country: user.Country, unread });
});

// ─── TOUR ENGINE ───
async function processTurn() {
  const countries = await Country.findAll();
  for (const c of countries) {
    const total = c.budgetAgriculture + c.budgetIndustry + c.budgetHealth + c.budgetMilitary + c.budgetResearch || 100;

    // Appliquer les effets des lois
    const countryLaws = await Law.findAll({ where: { countryId: c.id } });
    const lawEffects = { satisfBonus: 0, incomeMulti: 1, industryMulti: 1, researchMulti: 1, pollutionMulti: 1 };
    countryLaws.forEach(l => {
      if (l.category === 'fiscalite') {
        if (l.value === 'low') { lawEffects.satisfBonus += 5; lawEffects.incomeMulti *= 0.9; }
        if (l.value === 'heavy') { lawEffects.satisfBonus -= 5; lawEffects.incomeMulti *= 1.15; }
      }
      if (l.category === 'liberte') {
        if (l.value === 'liberal') { lawEffects.satisfBonus += 8; lawEffects.industryMulti *= 1.1; }
        if (l.value === 'authoritarian') { lawEffects.satisfBonus -= 10; }
      }
      if (l.category === 'environnement') {
        if (l.value === 'green') { lawEffects.pollutionMulti *= 0.8; lawEffects.industryMulti *= 0.95; }
        if (l.value === 'industrial') { lawEffects.pollutionMulti *= 1.15; lawEffects.industryMulti *= 1.1; }
      }
      if (l.category === 'education') {
        if (l.value === 'high') { lawEffects.researchMulti *= 1.2; lawEffects.incomeMulti *= 0.95; }
        if (l.value === 'low') { lawEffects.researchMulti *= 0.9; lawEffects.incomeMulti *= 1.05; }
      }
    });

    // Revenus de base
    const agriIncome = Math.round(c.agriculture * 50 * (1 + c.techAgriculture * 0.15) * (c.budgetAgriculture / total));
    const industryIncome = Math.round(c.industry * 80 * (1 + c.techIndustry * 0.15) * (c.budgetIndustry / total) * lawEffects.industryMulti);
    const commerceIncome = c.isBlockaded ? 0 : Math.round(c.commerce * 60 * (c.budgetIndustry / total));
    const popTax = Math.round(c.population * 0.001);
    const militaryCost = Math.round(c.infantry * 0.5 + c.tanks * 5 + c.aviation * 10 + c.navy * 8 + c.missiles * 15 + c.specialForces * 20);
    const totalIncome = agriIncome + industryIncome + commerceIncome + popTax;
    c.money = Math.max(0, Math.round(c.money + totalIncome - militaryCost));

    // Investissement dans les secteurs (le budget alloué fait monter les niveaux progressivement)
    // Chaque tour, une partie du budget investi dans agri/industrie/commerce améliore les niveaux
    const investAgri = (c.budgetAgriculture / total) * totalIncome * 0.05;
    const investIndustry = (c.budgetIndustry / total) * totalIncome * 0.05;
    const investCommerce = (c.budgetIndustry / total) * totalIncome * 0.03;
    // Accumulation des points d'investissement (niveau monte tous les 100 points)
    c.investAgri = (c.investAgri || 0) + investAgri;
    c.investIndustry = (c.investIndustry || 0) + investIndustry;
    c.investCommerce = (c.investCommerce || 0) + investCommerce;
    const upgradeCost = 100;
    if (c.investAgri >= upgradeCost) { c.agriculture += 1; c.investAgri -= upgradeCost; }
    if (c.investIndustry >= upgradeCost) { c.industry += 1; c.investIndustry -= upgradeCost; }
    if (c.investCommerce >= upgradeCost) { c.commerce += 1; c.investCommerce -= upgradeCost; }

    // Population
    const foodProd = c.agriculture * 1000 * (1 + c.techAgriculture * 0.1);
    c.food = Math.min(100, Math.max(0, (foodProd / Math.max(c.population, 1)) * 50));
    c.health = Math.min(100, Math.max(0, (c.budgetHealth / total) * 100 * (1 + c.techHealth * 0.1)));
    const jobs = c.industry * 500 + c.commerce * 300;
    c.employment = Math.min(100, Math.max(0, (jobs / Math.max(c.population, 1)) * 100));
    c.satisfaction = Math.min(100, Math.max(0, ((c.food / 100 + c.health / 100 + c.employment / 100) / 3 * 100) + lawEffects.satisfBonus));
    const growthRate = c.satisfaction >= 50 ? 0.002 : -0.001;
    c.population = Math.max(1000, Math.round(c.population * (1 + growthRate)));

    // Pollution
    c.pollution = Math.max(0, Math.min(100, c.pollution + (c.industry * 0.5 + c.population * 0.00001) * lawEffects.pollutionMulti - c.forests * 0.1 - c.techIndustry * 0.5));
    // CC naturels toutes les 8 tours (approx 4 jours)
    if (Math.random() < 0.125) c.carbonCredits += 1;

    // Recherche
    const researchBudget = c.money * (c.budgetResearch / total) * 0.02 * lawEffects.researchMulti;
    c.researchPoints = (c.researchPoints || 0) + researchBudget;
    const totalAlloc = c.allocAgriculture + c.allocMilitary + c.allocIndustry + c.allocHealth + c.allocEspionage || 100;
    ['Agriculture','Military','Industry','Health','Espionage'].forEach(d => {
      c[`rp${d}`] = (c[`rp${d}`] || 0) + researchBudget * (c[`alloc${d}`] / totalAlloc);
    });

    c.turnCount = (c.turnCount || 0) + 1;
    // Protection nouveaux joueurs : retiree après 5 tours
    if (c.turnCount >= 5) c.isProtected = false;
    // Sauvegarder historique du tour
    await TurnHistory.create({
      countryId: c.id,
      turnNumber: c.turnCount,
      money: Math.round(c.money),
      income: Math.round(totalIncome),
      militaryCost: Math.round(militaryCost),
      population: c.population,
      satisfaction: Math.round(c.satisfaction * 10) / 10,
      pollution: Math.round(c.pollution * 100) / 100
    });
    c.militaryPower = computeMilitaryPower(c);
    c.score = computeScore(c);
    await c.save();
  }
  console.log(`Tour traité à ${new Date().toISOString()} - ${countries.length} pays`);
}

// ─── SCHEDULER (2 tours/jour à 10h et 20h UTC) ───
function scheduleturns() {
  const now = new Date();
  const targets = [10, 20]; // heures UTC
  const delays = targets.map(h => {
    const next = new Date();
    next.setUTCHours(h, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next - now;
  });
  delays.forEach((delay, i) => {
    setTimeout(async () => {
      console.log(`Tour automatique ${targets[i]}h déclenché`);
      await processTurn();
      // Replanifier pour le lendemain
      setInterval(async () => {
        await processTurn();
        console.log(`Tour automatique ${targets[i]}h récurrent`);
      }, 24 * 60 * 60 * 1000);
    }, delay);
  });
  console.log(`Tours planifiés dans ${Math.round(delays[0]/60000)}min et ${Math.round(delays[1]/60000)}min`);
}

// ─── PROJECTIONS ───
function computeProjections(c) {
  const total = Math.max(c.budgetAgriculture + c.budgetIndustry + c.budgetHealth + c.budgetMilitary + c.budgetResearch, 1);
  const popM = c.population / 1000000;
  const agriIncome     = Math.round(popM * 500 * c.agriculture * (1 + c.techAgriculture * 0.15) * (c.budgetAgriculture / total));
  const industryIncome = Math.round(popM * 800 * c.industry    * (1 + c.techIndustry    * 0.15) * (c.budgetIndustry    / total));
  const commerceIncome = c.isBlockaded ? 0 : Math.round(popM * 300 * c.commerce * (c.budgetIndustry / total));
  const popTax         = Math.round(c.population * 0.1);
  const militaryCost   = Math.round(c.infantry * 2 + c.tanks * 20 + c.aviation * 50 + c.navy * 35 + c.missiles * 80 + c.specialForces * 100);
  const incomeTotal    = agriIncome + industryIncome + commerceIncome + popTax;
  const moneyDelta     = incomeTotal - militaryCost;

  const foodProd  = c.agriculture * 5000 * (1 + c.techAgriculture * 0.1);
  const nextFood  = Math.min(100, Math.max(0, (foodProd / Math.max(c.population, 1)) * 100));
  const nextHealth= Math.min(100, Math.max(0, (c.budgetHealth / total) * 100 * (1 + c.techHealth * 0.1)));
  const employCapacity = (c.industry * 0.02 + c.commerce * 0.01 + c.agriculture * 0.01) * 100;
  const nextEmploy= Math.min(100, Math.max(0, employCapacity));
  const nextSatisf= Math.min(100, Math.max(0, nextFood * 0.35 + nextHealth * 0.35 + nextEmploy * 0.30));
  const growthRate= nextSatisf >= 60 ? 0.003 : nextSatisf >= 40 ? 0.001 : -0.002;
  const popDelta  = Math.round(c.population * growthRate);
  const pollDelta = Math.round(((c.industry * 0.3 + c.population * 0.000005) - (c.forests * 0.05 + c.techIndustry * 0.8)) * 100) / 100;
  const researchIncome = 10 + Math.round((c.budgetResearch / total) * 50);

  return {
    agriIncome, industryIncome, commerceIncome, popTax, militaryCost,
    moneyDelta, income: incomeTotal,
    popDelta,
    satisfDelta: Math.round((nextSatisf - c.satisfaction) * 10) / 10,
    pollDelta, researchIncome,
    nextFood: Math.round(nextFood), nextHealth: Math.round(nextHealth),
    nextEmploy: Math.round(nextEmploy), nextSatisf: Math.round(nextSatisf)
  };
}

// ─── INIT ───
async function init() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      const admin = await User.create({ username: 'admin', email: 'admin@anathas.com', password: hash, role: 'admin' });
      await Country.create({ name: 'Administration', userId: admin.id, money: 0 });
      console.log('Admin créé : admin / admin123 — CHANGEZ CE MOT DE PASSE !');
    }
    const catCount = await ForumCategory.count();
    if (catCount === 0) {
      await ForumCategory.bulkCreate([
        { name: 'Annonces officielles', description: 'Annonces des administrateurs', isOfficial: true, order: 0 },
        { name: 'Diplomatie', description: 'Accords, alliances et déclarations', isOfficial: false, order: 1 },
        { name: 'Roleplay', description: 'Histoires et événements', isOfficial: false, order: 2 },
        { name: 'Discussion générale', description: 'Discussions libres', isOfficial: false, order: 3 }
      ]);
    }
    scheduleturns();
    app.listen(PORT, () => console.log(`Anathas démarré sur le port ${PORT}`));
  } catch (err) {
    console.error('Erreur de démarrage:', err);
    process.exit(1);
  }
}

init();
