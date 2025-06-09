const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const { CronExpressionParser } = require('cron-parser');

const { sleep, mainModule, getUserInput } = require('./functions/main.js');
const { sendToDiscord } = require('./functions/discord.js');

async function scriptVote() {
    const browser = await puppeteer.launch({
        headless: process.env.HEADLESS,
        // executablePath: '/usr/bin/chromium-browser', // Décommentez si vous avez besoin de spécifier le chemin de Chromium (par exemple sur un Raspberry/serveur Linux)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.goto(process.env.URL_VOTE_TOPSERVEURS + '?pseudo=' + process.env.URL_VOTE_TOPSERVEURS_NAME, {
        timeout: 60000 // Timeout de 60 secondes
    });
    console.log("Page chargée, en attente de la pop-up cookies...");

    // Validation de la pop-up cookies
    const cookies = await page.waitForSelector('button.fc-button.fc-cta-consent.fc-primary-button', { timeout: 15000 }).catch(() => null);
    if (cookies) {
        await cookies.click();
    }

    console.log("Pop-up cookies passée. Début de la recherche du captcha...");

    let mainResult = await mainModule(browser, page);
    let successText, captcha;
    if (Array.isArray(mainResult)) {
        [successText, captcha] = mainResult;
    } else {
        successText = mainResult;
        captcha = null;
    }

    // if (!successText) {
    //     await browser.close();
    //     await sendToDiscord("error", "Aucun texte récupéré dans l'iframe.");
    //     return;
    // }

    let retryCount = 0;

    if (successText.includes('Vérifié avec succès')) {
        console.log('Captcha vérifié avec succès dans l\'iframe.');
    } else if (successText.includes('Veuillez réessayer..') || successText.includes('rechargement ...')) {
        console.error('Captcha incorrect, on recommence...');
        await sendToDiscord("warning", "Captcha incorrect, nouvelle tentative.\nRéponse extraite : " + captcha);
        await sleep(2000);
        retryCount++;

        const [ retryText, captcha ] = await mainModule(browser, page);
        if (!retryText) {
            await browser.close();
            return;
        }

        if (retryText.includes('Vérifié avec succès')) {
            console.log('Captcha vérifié avec succès dans l\'iframe.');
        } else if (retryText.includes('Veuillez réessayer..')) {
            retryCount++;
        }

        if (retryCount >= 2) {
            console.error("Trop d'échecs de captcha, arrêt.");
            await sendToDiscord("error", "Trop d'échecs de captcha, arrêt.");
            await browser.close();
            return;
        }
    } else {
        console.error('Message inattendu dans l\'iframe', successText);
        await sendToDiscord("error", "Message inattendu dans l'iframe : " + successText);
        await browser.close();
        return;
    }

    // Cliquer sur le bouton "Voter" (hors iframe)
    const voteButton = await page.$('button.btn-submit-vote');
    if (voteButton) {
        await voteButton.click();
        console.log('Bouton "Voter" cliqué.');
    } else {
        console.error('Bouton "Voter" introuvable sur la page.');
        await sendToDiscord("error", 'Bouton "Voter" introuvable sur la page.');
        await browser.close();
        return;
    }

    // Attendre que l'URL change vers la page de succès (max 10 secondes)
    await page.waitForFunction(
        expectedUrl => window.location.href === expectedUrl,
        { timeout: 10000 },
        process.env.URL_VOTE_TOPSERVEURS + '/success'
    ).then(() => {
        console.log('Vote validé : page de succès détectée.');
        sendToDiscord("success", "Vote comptabilisé. Page de succès détectée.\nRéponse extraite : " + captcha);
        // Tu peux envoyer une notification Discord ici si tu veux
    }).catch(() => {
        console.error('La page de succès du vote n\'a pas été détectée.');
        sendToDiscord("warning", "La page de succès du vote n'a pas été détectée.");
        // Tu peux gérer ici le cas d’échec
    });

    await browser.close();
}

let lastRandomDelay = 0;

(async () => {
    console.log('Script de vote prêt !');

    // Décommentez la ligne suivante pour exécuter le script de vote immédiatement (pour les tests)
    // scriptVote().catch(error => {
    //     console.error('Erreur lors de l\'exécution du script de vote :', error);
    // });

    // Demander à l'utilisateur s'il veut définir un délai par défaut
    const response = await getUserInput('Souhaitez-vous définir un délai par défaut ? (nombre de minutes, ou Entrée pour ignorer): ');
    
    if (response.trim() !== '') {
        const delay = parseInt(response);
        if (!isNaN(delay) && delay >= 0) {
            lastRandomDelay = delay;
            console.log(`Délai par défaut défini à ${lastRandomDelay} minute(s).`);
        } else {
            console.log('Entrée invalide. Délai par défaut conservé à 0.');
        }
    } else {
        console.log('Aucun délai par défaut spécifié. Valeur conservée à 0.');
    }

    // Annonce de la prochaine exécution
    try {
        const interval = CronExpressionParser.parse(process.env.CRON_TIME);
        const nextDate = interval.next().toDate();
        const nextExecution = new Date(nextDate.getTime() + lastRandomDelay * 60000);
        console.log(`Prochaine exécution prévue à : ${nextExecution.toLocaleString()}`);
    } catch (err) {
        console.log('Impossible de calculer la prochaine exécution (cron invalide ?)');
        console.error(`Erreur détaillée: ${err.message}`);
        console.error(`Valeur de CRON_TIME: "${process.env.CRON_TIME}"`);
    }

    cron.schedule(process.env.CRON_TIME, async () => {
        let now = new Date();
        const hour = now.getHours();

        console.log(`Cron déclenché à ${now.toLocaleString()}`);

        // Si l'heure est entre 3h et 7h, on skip l'exécution et reset le delay
        if (hour >= 3 && hour < 7) {
            console.log("Exécution du script ignorée entre 3h et 7h.");
            lastRandomDelay = 0;
            return;
        }

        // Générer un délai aléatoire entre 1 et 2 minutes
        let newDelay = lastRandomDelay + Math.floor(Math.random() * 2) + 1;

        lastRandomDelay = newDelay;

        console.log(`Attente supplémentaire de ${newDelay} minute(s) avant exécution du script de vote...`);
        await sleep(newDelay * 60 * 1000);

        now = new Date(); // Mettre à jour l'heure après le délai

        console.log(`${now.toLocaleString()} - Exécution du script de vote...`);
        scriptVote().catch(error => {
            console.error('Erreur lors de l\'exécution du script de vote :', error);
        });
    });
})();

//class="mtcap-show-if-nocss" aria-label="image captcha." id="mtcap-image-nocss-1"
