# Bot Vote

## Fonctionnalités

- Permet de voter automatiquement pour le serveur de votre choix sur Top Serveurs.

## Installation

```bash
git clone https://github.com/votre-utilisateur/bot-vote.git
cd bot-vote
npm install
```

Créez un fichier `.env` et configurez-le avec les informations requises :

```
URL_VOTE_TOPSERVEURS='' # L'URL ne doit pas contenir le pseudo, il est à définir ci-dessous
URL_VOTE_TOPSERVEURS_NAME='BOT' # Pas d'espaces ni de caractères spéciaux

DISCORD_ID='' # ID Discord à ping via les Webhooks en cas d'erreur
DISCORD_WEBHOOK_URL='' # Webhook utilisé pour envoyer les erreurs
DISCORD_WEBHOOK_NAME='BOT Vote' # Nom du Webhook

CRON_TIME='0 */2 * * *' # Heure d'exécution du cron, ici toutes les 2 heures
HEADLESS=false # true : Le navigateur sera lancé en mode headless (sans interface graphique), false : avec interface graphique
EXECUTABLE_PATH = '' # Chemin vers l'exécutable de Chromium, ou laisser vide pour utiliser le chemin par défaut
TEST_MODE = false # true : Le script sera immédiatement exécuté, puis continuera à s'exécuter selon le cron, false : Le bot votera uniquement selon le cron

AI_MODEL = 'chatgpt' # Modèle d'IA à utiliser, 'chatgpt' ou 'mistral'
CHATGPT_API_KEY='' # Clé API ChatGPT
MISTRAL_API_KEY = '' # Clé API Mistral
CHATGPT_PROMPT = "Tu vas passer un test de vue. Une image se trouve en pièce jointe, et comme avec une échelle de Monoyer, ton objectif est d’analyser attentivement l’image et d’identifier avec précision les inscriptions qui y figurent.
    \nNe t'arrête pas non plus à ce que l’analyse automatique (OCR) va détecter, approfondis ton analyse et donne moi le résultat le plus précis possible de ce que tu vois réellement/visuellement.
    \nUne grande attention et une rigueur particulière sont requises : ne confonds pas un "O" avec un "Q", ni un "J" avec un "I", un "l" avec un "I", un "4" avec un "A", un "0" avec un "O", etc.
    \nAfin de t'aider dans ton analyse, il y'a un minimum de 4 caractères systématiquement, pouvant aller jusqu'à 5 généralement ou 6 caractères.
    \nDonne moi directement le résultat de ton analyse, je veux un résultat concis, sans parole supplémentaire.
    \n\nVoici l'image :" # Prompt à utiliser pour l'IA ChatGPT
MISTRAL_PROMPT = "Quel est le texte sur l'image ? Donne moi directement le résultat" # Prompt à utiliser pour l'IA Mistral
```

## Installation supplémentaire

Si vous exécutez le script sur un Raspberry Pi ou un environnement Linux, vous devrez installer Chromium ou des paquets supplémentaires.
Pour cela, exécutez les commandes suivantes :

### Raspberry Pi

- Assurez-vous que votre Raspberry Pi est à jour :
```bash
sudo apt update && sudo apt upgrade
```

- Installez Chromium :
```bash
sudo apt install chromium-browser
```

Indiquez dans `index.js` le chemin d'installation de Chromium.
Exemple attendu :

```js
const browser = await puppeteer.launch({
    headless: process.env.HEADLESS,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### Debian 12

- Assurez-vous que votre Debian est à jour :
```bash
sudo apt-get update && sudo apt-get upgrade
```

- Installez les bibliothèques nécessaires pour Chromium :
```bash
sudo apt install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libatspi2.0-0 \
  libgtk-3-0
```

Aucune modification supplémentaire n'est nécessaire, vous pouvez passer à la suite.

## Utilisation

Lancez le bot avec :

```bash
node .
```

## Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou soumettre une pull request.

## Auteur

Développé par ERROR  
Discord : error_fr

## Licence

Ce projet est sous licence MIT.
