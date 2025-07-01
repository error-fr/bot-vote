const dotenv = require('dotenv');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
dotenv.config();

// Fonction de validation de la configuration Discord
function validateDiscordConfig() {
    const errors = [];
    
    if (!process.env.DISCORD_WEBHOOK_URL) {
        errors.push('DISCORD_WEBHOOK_URL non configuré');
    }
    
    if (!process.env.DISCORD_WEBHOOK_NAME || process.env.DISCORD_WEBHOOK_NAME.trim() === '') {
        errors.push('DISCORD_WEBHOOK_NAME non configuré ou vide');
    }
    
    if (!process.env.DISCORD_ID) {
        errors.push('DISCORD_ID non configuré');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration Discord incomplète: ${errors.join(', ')}`);
    }
}

async function sendToDiscord(status, desc) {
    try {
        // Vérifier la configuration avant d'envoyer
        validateDiscordConfig();
        
        const statusMap = {
            good: "✅ Processus terminé correctement",
            warning: "⚠️ Potentiel disfonctionnement",
            error: "⛔️ Une erreur est survenue"
        };
        const statusTitle = statusMap[status] || "";
        const statusDesc = desc || "Aucun détail fourni";
        
        let content = "";
        if (status !== "good" && process.env.DISCORD_ID) {
            content = `<@${process.env.DISCORD_ID}>`;
        }

        const embed = [
            {
                title: statusTitle,
                description: statusDesc,
                color: 5814783,
                footer: {
                    text: process.env.DISCORD_WEBHOOK_NAME
                },
                timestamp: new Date().toISOString()
            }
        ];

        const payload = {
            username: process.env.DISCORD_WEBHOOK_NAME,
            content: content,
            embeds: embed
        };

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log("[DISCORD] Message envoyé avec succès !");
        } else {
            console.error("[DISCORD] Erreur lors de l'envoi :", response.statusText);
        }
    } catch (error) {
        console.error("[DISCORD] Erreur :", error.message);
        throw error; // Re-lancer l'erreur pour que l'appelant puisse la gérer
    }
}

/**
 * Envoie un message Discord avec une image de captcha
 * @param {string} captchaText - Le texte du captcha
 * @param {string|Buffer} captchaImage - Le chemin vers l'image ou un buffer contenant l'image
 */
async function sendCaptchaToDiscord(captchaText, captchaImage = null) {
    try {
        // Vérifier la configuration avant d'envoyer
        validateDiscordConfig();
        
        // Préparer l'embed
        const embed = [
            {
                title: 'Analyse du Captcha : ' + captchaText,
                description: 'Voici en image le Captcha que le bot a récupéré et analysé avec l\'IA.',
                image: {
                    url: 'attachment://captcha.png'
                },
                color: 5814783,
                footer: {
                    text: process.env.DISCORD_WEBHOOK_NAME
                },
                timestamp: new Date().toISOString()
            }
        ];

        const payload = {
            username: process.env.DISCORD_WEBHOOK_NAME,
            embeds: embed
        };

        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        
        // Créer un FormData pour l'envoi multipart
        const form = new FormData();
        form.append('payload_json', JSON.stringify(payload));
        
        // Ajouter l'image si disponible
        if (captchaImage) {
            let imageBuffer;
            
            if (Buffer.isBuffer(captchaImage)) {
                imageBuffer = captchaImage;
            } else if (typeof captchaImage === 'string') {
                if (fs.existsSync(captchaImage)) {
                    imageBuffer = fs.readFileSync(captchaImage);
                } else {
                    throw new Error(`Le fichier ${captchaImage} n'existe pas`);
                }
            } else {
                throw new Error('Format d\'image non supporté');
            }
            
            form.append('file', imageBuffer, {
                filename: 'captcha.png',
                contentType: 'image/png'
            });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: form
        });

        if (response.ok) {
            console.log("[DISCORD] Message avec image envoyé avec succès !");
        } else {
            const errorText = await response.text();
            console.error("[DISCORD] Erreur lors de l'envoi :", response.status, response.statusText);
            console.error("[DISCORD] Détails de l'erreur :", errorText);
        }
    } catch (error) {
        console.error("[DISCORD] Erreur lors de l'envoi du captcha :", error.message);
        throw error;
    }
}

module.exports = {
    sendToDiscord,
    sendCaptchaToDiscord,
    validateDiscordConfig // Exporter la fonction de validation si besoin ailleurs
};
