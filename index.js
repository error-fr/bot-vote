const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const { CronExpressionParser } = require('cron-parser');

const { sleep, mainModule, getUserInput } = require('./functions/main.js');
const { sendToDiscord, sendCaptchaToDiscord } = require('./functions/discord.js');

async function scriptVote() {
    const browser = await puppeteer.launch({
        headless: process.env.HEADLESS,
        // executablePath: '/usr/bin/chromium-browser', // Décommentez si vous avez besoin de spécifier le chemin de Chromium (par exemple sur un Raspberry/serveur Linux)
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
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

    // Boucle de tentatives pour le captcha
    let maxRetries = 3;
    let attempt = 0;
    let retry = true;

    while (retry && attempt <= maxRetries) {
        if (!successText || successText.includes('Veuillez réessayer..') || successText.includes('rechargement')) {
            console.error('Captcha incorrect, on recommence...');
            await sendToDiscord("warning", `Captcha incorrect, tentative ${attempt + 1}/${maxRetries}.`);
            await sendCaptchaToDiscord(captcha, './functions/captcha.png');
            await sleep(2000);
            attempt++;

            if (attempt >= maxRetries) {
                console.error("Trop d'échecs de captcha, arrêt.");
                await sendToDiscord("error", "Trop d'échecs de captcha, arrêt.");
                await browser.close();
                return;
            }

            const mainResultRetry = await mainModule(browser, page);
            if (Array.isArray(mainResultRetry)) {
                [successText, captcha] = mainResultRetry;
            } else {
                successText = mainResultRetry;
                captcha = null;
            }
        } else if (successText.includes('Vérifié avec succès')) {
            console.log('Captcha vérifié avec succès dans l\'iframe.');
            retry = false;
        } else {
            console.error('Message inattendu dans l\'iframe', successText);
            await sendToDiscord("error", "Message inattendu dans l'iframe : " + successText);
            await browser.close();
            return;
        }
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
        sendToDiscord("success", "Vote comptabilisé. Page de succès détectée.");
    }).catch(async () => {
        const currentUrl = page.url();

        if (currentUrl === 'https://top-serveurs.net/gta/vote/evoma/failed') {
            console.error('Vote échoué : page d\'erreur détectée.');
            await sendToDiscord("error", "Vote échoué : page d\'erreur détectée.");
        } else {
            console.error('La page de succès du vote n\'a pas été détectée.');

            // Récupérer le titre de la page
            const pageTitle = await page.title();
            // Récupérer le texte principal de la page
            const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000)); // Limite à 1000 caractères

            console.log('Titre de la page:', pageTitle);
            console.log('URL actuelle:', currentUrl);
            console.log('Extrait du contenu de la page:', bodyText);

            await sendToDiscord("warning", "La page de succès du vote n'a pas été détectée.");
            await sendCaptchaToDiscord(captcha, './functions/captcha.png');
        }
    });

    await browser.close();
}

let lastRandomDelay = 0;

(async () => {
    console.log('Script de vote prêt !');

    const testMode = process.env.TEST_MODE === 'true';
    if (testMode) {
        scriptVote().catch(error => {
            console.error('Erreur lors de l\'exécution du script de vote :', error);
        });
    }

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
            sendToDiscord("error", 'Erreur lors de l\'exécution du script de vote :\n', error);
        });
    });
})();

//class="mtcap-show-if-nocss" aria-label="image captcha." id="mtcap-image-nocss-1"
