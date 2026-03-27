# Anathas — Guide de déploiement

## Structure du projet
```
anathas/
├── app.py              # Application principale Flask
├── requirements.txt    # Dépendances Python
├── render.yaml         # Configuration Render
├── templates/          # Pages HTML
│   ├── base.html
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── chat.html
│   ├── ranking.html
│   ├── alliances.html
│   └── admin.html
└── static/
    ├── css/style.css
    └── js/main.js
```

## Déploiement sur Render

### Étape 1 — Créer un compte GitHub
1. Allez sur https://github.com
2. Créez un compte gratuit
3. Créez un nouveau dépôt appelé `anathas`
4. Uploadez tous les fichiers du projet

### Étape 2 — Déployer sur Render
1. Allez sur https://render.com
2. Cliquez sur "New +" → "Web Service"
3. Connectez votre dépôt GitHub `anathas`
4. Render détecte automatiquement render.yaml
5. Cliquez "Deploy"

### Étape 3 — Base de données
Render crée automatiquement une base PostgreSQL gratuite grâce au fichier render.yaml.

### Étape 4 — Accéder au jeu
Votre jeu sera accessible sur : `https://anathas.onrender.com`

## Compte admin par défaut
- Utilisateur : `admin`
- Mot de passe : `admin123`
- **⚠ CHANGEZ CE MOT DE PASSE dès la première connexion !**

## Fonctionnalités incluses (v1.0)
- ✅ Inscription / Connexion
- ✅ Création de pays
- ✅ Tableau de bord complet
- ✅ Gestion du budget d'état
- ✅ Chat général et d'alliance
- ✅ Système d'alliances
- ✅ Classement
- ✅ Panneau admin (ban, rôles)

## Prochaines étapes
- Moteur de tours (calculs automatiques 2x/jour)
- Système militaire (recrutement, guerres)
- Recherche technologique
- Diplomatie
- Espionnage
