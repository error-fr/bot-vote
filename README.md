# Bot Vote

## Fonctionnalités

- Permet de voter automatiquement pour le serveur de votre choix sur Top Serveurs

## Installation

```bash
git clone https://github.com/votre-utilisateur/bot-vote.git
cd bot-vote
npm install
```

Créer un fichier ".env" et configurer le avec les informations requises :

```
URL_VOTE_TOPSERVEURS = '' # L'URL ne doit pas contenir le pseudo, il est à définir en dessous
URL_VOTE_TOPSERVEURS_NAME = 'BOT' # Pas d'espace et/ou caractère spéciaux

DISCORD_ID = '' # ID Discord qui sera ping pour les Webhooks en cas d'erreur
DISCORD_WEBHOOK_URL = '' # Webhook utilisé pour envoyer les erreurs
DISCORD_WEBHOOK_NAME = 'BOT Vote' # Nom du Webhook

CRON_TIME = '0 */2 * * *' # Heure d'exécution du cron, ici toutes les 2 heures
HEADLESS = false # True : Le navigateur sera lancé en mode headless (sans interface graphique), False : Le navigateur sera lancé avec une interface graphique

CHATGPT_API_KEY = '' # Clé API ChatGPT
```

## Installation supplémentaire

Si vous exécutez le script sur un Raspberry ou un environnement Linux, vous allez avoir besoin d'installer Chromium.
Pour cela, faites les commandes suivantes :

- Assurez-vous que votre Raspberry soit à jour
```bash
sudo apt-get update & apt-get upgrade
```

- Installez Chromium
```bash
sudo apt install chromium-browser chromium-codecs-ffmpeg
```

Renseignez dans `index.js` le chemin d'installation de chromium.
Résultat attendu :

```js
const browser = await puppeteer.launch({
        headless: process.env.HEADLESS,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

```

## Utilisation

Lancez le bot avec :

```bash
node .
```

## Contribution

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou soumettre une pull request.

## Auteur

Developper par ERROR
Discord: error_fr

## Licence

Ce projet est sous licence MIT.
