const readline = require('readline');
const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de stockage des IPs
const IP_STORAGE_FILE = path.join(__dirname, 'recent_ips.json');

async function formatAnswer(result) {
    // Chercher d'abord une séquence de 4 à 15 lettres majuscules entre guillemets doubles ou français (pas de guillemets simples)
    let match = result.match(/["«»“”]([A-Z ]{4,15})["«»“”]/i);
    let answer = '';
    if (match) {
        // Retirer les espaces pour ne garder que les lettres
        answer = match[1].replace(/\s+/g, '');
    } else {
        // Chercher une séquence de lettres majuscules avec des espaces ou tirets (ex: R Y Y W ou R-Y-Y-W)
        match = result.match(/([A-Z][\s\-]*[A-Z][\s\-]*[A-Z][\s\-]*[A-Z][\s\-]*[A-Z]?[\s\-]*[A-Z]?[\s\-]*[A-Z]?[\s\-]*[A-Z]?)/);
        if (match) {
            // Retirer les espaces et tirets pour ne garder que les lettres
            answer = match[1].replace(/[\s\-]/g, '');
        } else {
            // Sinon, fallback sur une séquence de 4 à 8 majuscules consécutives
            match = result.match(/[A-Z]{4,8}/);
            answer = match ? match[0] : '';
        }
    }
    console.log('Résultat / Réponse transformé pour le captcha :', answer);
    return answer.toUpperCase();
}

// Charger les IPs depuis le fichier
function loadRecentIPs() {
    try {
        if (fs.existsSync(IP_STORAGE_FILE)) {
            const data = fs.readFileSync(IP_STORAGE_FILE, 'utf8');
            const savedIPs = JSON.parse(data);
            
            // Nettoyer les IPs expirées au chargement
            const now = Date.now();
            return savedIPs.filter(entry => now - entry.time < 2 * 60 * 60 * 1000);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des IPs :', error);
    }
    return [];
}

// Sauvegarder les IPs dans le fichier
function saveRecentIPs() {
    try {
        fs.writeFileSync(IP_STORAGE_FILE, JSON.stringify(global.recentIPs, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des IPs :', error);
    }
}

function getUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    formatAnswer,
    getUserInput,
    loadRecentIPs,
    saveRecentIPs,
    sleep
}