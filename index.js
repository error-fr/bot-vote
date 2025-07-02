
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();
const cron = require('node-cron');
const { CronExpressionParser } = require('cron-parser');

const { sleep, mainModule, getUserInput } = require('./functions/main.js');
const { sendToDiscord, sendCaptchaToDiscord } = require('./functions/discord.js');

// Table globale pour stocker les IPs utilisées récemment
global.recentIPs = global.recentIPs || [];

async function scriptVote() {
    let ipAddress = null;

    const launchOptions = {
        headless: process.env.HEADLESS === 'true',
        args: [
            '--ignore-certificate-errors',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu'
        ]
    };

    if (process.env.EXECUTABLE_PATH && process.env.EXECUTABLE_PATH.trim() !== '') {
        launchOptions.executablePath = process.env.EXECUTABLE_PATH;
    }

    if (process.env.PROXY && process.env.PROXY === 'true') {
        if (process.env.PROXY_SERVER && process.env.PROXY_SERVER.trim() !== '') {
            console.log('Proxy activé, ajout des options de proxy...');
            launchOptions.args.push('--proxy-server=' + process.env.PROXY_SERVER);
        } else {
            console.error("PROXY_SERVER n'est pas défini ou est vide dans le fichier .env alors que le proxy est activé.");
            await sendToDiscord("error", "PROXY_SERVER n'est pas défini ou est vide dans le fichier .env alors que le proxy est activé.");
            return;
        }
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    if (process.env.PROXY && process.env.PROXY === 'true') {
        console.log("Proxy configuré. Authentification en cours...");
        await page.authenticate({
            username: process.env.PROXY_USER,
            password: process.env.PROXY_PASSWORD
        });

        console.log("Proxy authentifié avec succès.");

        if( process.env.TEST_PROXY && process.env.TEST_PROXY === 'true') {
            console.log("Test du proxy activé, vérification de la connexion...");
            if (!process.env.TEST_PROXY_URL || process.env.TEST_PROXY_URL.trim() === '') {
                console.error("TEST_PROXY_URL n'est pas défini ou est vide dans le fichier .env.");
                await browser.close();
                return;
            }

            // Test de connexion au proxy
            try {
                console.log("Test de connexion au proxy...");
                await page.goto(process.env.TEST_PROXY_URL, { waitUntil: 'domcontentloaded' });
                const geoData = await page.evaluate(() => document.body.innerText);
                console.log('Connexion au proxy réussie.\nInfos:', geoData);
                
                console.log('Test du proxy sur Google...');
                await page.goto('https://www.google.com', { waitUntil: 'networkidle2', timeout: 10000 });
                console.log("Test du proxy sur Google réussi.");
                
                await browser.close();
                return;
            } catch (error) {
                console.error("Erreur de connexion au proxy :", error);
                await browser.close();
                return;
            }
        }

        // Camouflage Puppeteer
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });
    }

    if (process.env.PROXY_SAFE_MODE && process.env.PROXY_SAFE_MODE === 'true') {
        await page.goto(process.env.TEST_PROXY_URL, { waitUntil: 'domcontentloaded' });
        const geoData = await page.evaluate(() => {
            try {
                return JSON.parse(document.body.innerText);
            } catch (e) {
                return { ip: null };
            }
        });
        ipAddress = geoData.ip;

        if (!ipAddress) {
            console.error("Impossible de récupérer l'adresse IP.");
            // await sendToDiscord("error", "Impossible de récupérer l'adresse IP.");
            await browser.close();
            return;
        }

        // Nettoyer les IPs plus vieilles que 2h
        const now = Date.now();
        global.recentIPs = global.recentIPs.filter(entry => now - entry.time < 2 * 60 * 60 * 1000);

        // Vérifier si l'IP a déjà été utilisée dans les 2 dernières heures
        if (global.recentIPs.some(entry => entry.ip === ipAddress)) {
            console.error(`L'adresse IP ${ipAddress} a déjà été utilisée dans les 2 dernières heures.`);
            // await sendToDiscord("warning", `L'adresse IP ${ipAddress} a déjà été utilisée dans les 2 dernières heures. Vote annulé.`);
            await browser.close();
            return;
        }

        console.log(`Nouvelle IP utilisée par encore enregistrée : ${ipAddress}`);
    }

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
    if (typeof mainResult === 'number') {
        if( process.env.SAFE_MODE && process.env.SAFE_MODE === 'true') {
            console.log(`mainModule a retourné un nombre (${mainResult}), attente de ${mainResult} minutes...`);
            await sleep((mainResult * 60 * 1000)); // Convertir les minutes en millisecondes
            mainResult = await mainModule(browser, page);
        } else {
            console.error(`mainModule a retourné un nombre (${mainResult}), arrêt du script.`);
            await browser.close();
            return;
        }
    }
    if (mainResult == null) {
        console.error("mainModule a retourné null, arrêt du script.");
        await browser.close();
        return;
    }
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
        { timeout: 15000 },
        process.env.URL_VOTE_TOPSERVEURS + '/success'
    ).then(async () => {
        try {
            console.log('Vote validé : page de succès détectée.');
            await sendToDiscord("good", "Vote comptabilisé. Page de succès détectée.");

            if (process.env.PROXY_SAFE_MODE && process.env.PROXY_SAFE_MODE === 'true') {
                const now = Date.now();
                global.recentIPs.push({ ip: ipAddress, time: now });
                console.log(`IP ${ipAddress} enregistrée.`);
            }
        } catch (err) {
            console.error('Vote validé, mais une erreur a été détectée :', err);
        }
    }).catch(async () => {
        const currentUrl = page.url();

        if (currentUrl === process.env.URL_VOTE_TOPSERVEURS + '/failed') {
            console.error('Vote échoué : page d\'erreur détectée.');
            await sendToDiscord("error", "Vote échoué : page d\'erreur détectée.");
        } else {
            // revérifier l'URL si cest pas la page de succès

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
        try {
            console.log('Mode test activé, exécution immédiate du script de vote...');
            await scriptVote();
        } catch (error) {
            console.error('Erreur lors de l\'exécution du script de vote :', error);
        }
        return;
    } else {
        // Demander à l'utilisateur s'il veut définir un délai par défaut

        if (process.env.DEFINE_DEFAULT_DELAY && process.env.DEFINE_DEFAULT_DELAY === 'true') {
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

            if( process.env.SAFE_MODE && process.env.SAFE_MODE === 'true') {
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
            }

            now = new Date(); // Mettre à jour l'heure après le délai

            console.log(`${now.toLocaleString()} - Exécution du script de vote...`);
            scriptVote()
                .then(() => {
                    console.log('Exécution du script de vote terminé.');
                })
                .catch(error => {
                    console.error('Erreur lors de l\'exécution du script de vote :', error);
                    sendToDiscord("error", `Erreur lors de l\'exécution du script de vote :\n${error}`);
                });
        });
    };
})();
