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

CHATGPT_API_KEY = '' # Clé API ChatGPT
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
