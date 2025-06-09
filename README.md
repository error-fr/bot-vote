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

CHATGPT_API_KEY='' # Clé API ChatGPT
```

## Installation supplémentaire

Si vous exécutez le script sur un Raspberry Pi ou un environnement Linux, vous devrez installer Chromium ou des paquets supplémentaires.
Pour cela, exécutez les commandes suivantes :

### Raspberry Pi

- Assurez-vous que votre Raspberry Pi est à jour :
```bash
sudo apt-get update && sudo apt-get upgrade
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
