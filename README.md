 Bundesliga Quiz AI

Un quiz interactif sur la Bundesliga allemande alimenté par l'intelligence artificielle. Testez vos connaissances sur le football allemand avec des questions générées dynamiquement par OpenAI.

 Fonctionnalités

- **Quiz personnalisé** : Choisissez la difficulté (Facile, Moyen, Difficile)
- **Catégories multiples** : Général, Clubs, Joueurs, Histoire
- **IA intégrée** : Questions générées par OpenAI GPT-4
- **Mode local** : Fonctionne sans clé API OpenAI avec des questions prédéfinies
- **Statistiques** : Suivi des performances et historique des quiz
- **Interface responsive** : Design moderne avec Tailwind CSS

 Démarrage rapide

 Prérequis

- Node.js (version 16 ou supérieure)
- npm ou yarn
- Clé API OpenAI (optionnelle, pour le mode IA)

Installation

1. **Clonez le repository**
   ```bash
   git clone <votre-repo-url>
   cd aws-challenge
   ```

2. **Installez les dépendances**
   ```bash
   npm install
   ```

3. **Configurez les variables d'environnement**
   ```bash
   cp .env.example .env
   ```

   Éditez le fichier `.env` :
   ```env
   PORT=3000
   OPENAI_API_KEY=votre_clé_api_openai_ici
   OPENAI_MODEL=gpt-4o-mini
   ```

4. **Lancez l'application**
   ```bash
   # Mode développement
   npm run dev

   # Mode production
   npm start
   ```

5. **Accédez à l'application**
   Ouvrez votre navigateur à l'adresse : `http://localhost:3000`

Structure du projet

```
aws-challenge/
├── public/
│   ├── js/
│   │   └── app.js          # Logique frontend du quiz
│   └── css/
│       └── style.css       # Styles personnalisés
├── views/
│   └── index.ejs           # Template principal
├── config/
│   └── utils/
│       └── aiGenerator.js  # Utilitaires IA
├── controllers/
├── routes/
├── utils/
├── server.js               # Serveur Express principal
├── package.json
├── .env                    # Variables d'environnement
└── README.md
```

Utilisation

1. **Sélection du quiz** : Choisissez la difficulté et la catégorie
2. **Nombre de questions** : Définissez entre 5, 7 ou 10 questions
3. **Répondez** : Cliquez sur les options pour chaque question
4. **Résultats** : Consultez votre score et l'analyse IA
5. **Statistiques** : Suivez vos performances dans l'historique

Mode IA vs Mode Local

 Mode IA (avec OpenAI)
- Questions générées dynamiquement
- Analyse personnalisée des résultats
- Conseils adaptés à votre niveau

 Mode Local (sans API)
- Questions prédéfinies sur la Bundesliga
- Fonctionne sans connexion internet
- Analyse basique des performances

 Configuration

Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `PORT` | Port du serveur | `3000` |
| `OPENAI_API_KEY` | Clé API OpenAI | - |
| `OPENAI_MODEL` | Modèle OpenAI utilisé | `gpt-4o-mini` |

Difficultés disponibles

- **Facile** : Questions basiques pour débutants
- **Moyen** : Questions intermédiaires
- **Difficile** : Questions avancées pour experts

 Catégories

- **Général** : Questions diverses sur la Bundesliga
- **Clubs** : Focus sur les équipes et stades
- **Joueurs** : Questions sur les footballeurs célèbres
- **Histoire** : Événements historiques et records

 Technologies utilisées

- **Backend** : Node.js, Express.js
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Template Engine** : EJS
- **Styling** : Tailwind CSS
- **IA** : OpenAI GPT-4
- **Déploiement** : AWS (potentiellement)

API Endpoints

### Quiz
- `GET /` - Page principale
- `POST /api/quiz/generate` - Génère un nouveau quiz
- `POST /api/quiz/submit` - Soumet les réponses du quiz
- `GET /api/health` - Vérification de l'état du serveur

 Tests

```bash
npm test
```

 Déploiement

### Sur AWS
1. Configurez votre instance EC2
2. Installez Node.js
3. Clonez le repository
4. Configurez les variables d'environnement
5. Utilisez PM2 pour la gestion des processus

```bash
npm install -g pm2
pm2 start server.js --name "bundesliga-quiz"
```



## Auteur

Daniella Lonyama


⭐ Si ce projet vous plaît, n'hésitez pas à lui donner une étoile !