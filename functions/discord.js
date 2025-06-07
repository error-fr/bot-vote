const dotenv = require('dotenv');
dotenv.config();

async function sendToDiscord(status, desc) {
    const statusMap = {
        good: "✅ Processus terminé correctement",
        warning: "⚠️ Potentiel disfonctionnement",
        error: "⛔️ Une erreur est survenue"
    };
    const statusTitle = statusMap[status] || "";
    const statusDesc = desc || "Aucun détail fourni";
    const content = `<@${process.env.DISCORD_ID}>`;

    const embed = [
        {
            title: statusTitle,
            description: statusDesc,
            color: 5814783,
            footer: {
                text: process.env.DISCORD_WEBHOOK_NAME || ""
            },
            timestamp: new Date().toISOString()
        }
    ];

    const payload = {
        username: process.env.DISCORD_WEBHOOK_NAME || "",
        content: content,
        embeds: embed
    };

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => {
    if (response.ok) {
        console.log("[DISCORD] Message envoyé avec succès !");
    } else {
        console.error("[DISCORD] Erreur lors de l'envoi :", response.statusText);
    }
    })
    .catch(error => {
        console.error("[DISCORD] Erreur réseau :", error);
    });
}

module.exports = {
  sendToDiscord,
};
