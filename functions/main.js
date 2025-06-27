const readline = require('readline');
const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');

const { newQueryChatGPT, newQueryMistral } = require('./aimodal.js');
const { sendToDiscord } = require('./discord.js');

async function mainModule(browser, page) {
    // Attendre que le captcha soit visible (img ou div)
    await page.waitForSelector('#mtcap-image-nocss-1, #mtcap-image-1', { timeout: 10000 }).catch(() => null);

    // Attendre que l'iframe du captcha soit présent
    const iframeSelector = '#mtcaptcha-iframe-1';
    const iframeWait = await page.waitForSelector(iframeSelector, { timeout: 10000 }).catch(() => null);

    if (!iframeWait) {
        // Timeout : vérifier la présence de l'alerte "Veuillez patienter"
        const alertSelector = '.alert.alert-warning.alert-dismissible.fade.show';
        const alertHtml = await page.$eval(alertSelector, el => el.innerText).catch(() => null);
        if (alertHtml && alertHtml.includes('Veuillez patienter')) {
            // Extraire la phrase exacte et le temps restant
            const match = alertHtml.match(/Vous devez patienter\s+([0-9]+ [a-zA-Z]+)\s+avant de pouvoir voter/);
            const tempsRestant = match ? match[1] : null;
            console.error('Alerte détectée :', alertHtml.trim());
            let message = "Alerte détectée : " + alertHtml.trim();
            if (tempsRestant) {
                message += `\n**(Temps restant : ${tempsRestant})**`;
            }
            await sendToDiscord("error", message);
            return null;
        } else {
            console.error('Captcha non trouvé et aucune alerte "Veuillez patienter" détectée.');
            await sendToDiscord("error", 'Captcha non trouvé et aucune alerte "Veuillez patienter" détectée.');
            return null;
        }
    }

    const iframeElement = await page.$('#mtcaptcha-iframe-1');
    const iframe = await iframeElement.contentFrame();

    let captchaSrc = null;

    // Essayer d'abord l'élément <img> dans l'iframe
    const captchaImg = await iframe.$('#mtcap-image-nocss-1');
    if (captchaImg) {
        const srcProperty = await captchaImg.getProperty('src');
        const srcValue = await srcProperty.jsonValue();
        if (srcValue && !srcValue.startsWith('data:') && srcValue !== '') {
            captchaSrc = srcValue;
        }
    }

    // Si pas trouvé ou vide, essayer le background-image du <div> dans l'iframe
    if (!captchaSrc) {
        const bgImage = await iframe.$eval('#mtcap-image-1', el => {
            const bg = window.getComputedStyle(el).backgroundImage;
            const match = bg && bg.match(/url\("?([^")]+)"?\)/);
            return match ? match[1] : null;
        }).catch(() => null);
        captchaSrc = bgImage;
    }

    // Debug : afficher le HTML si rien trouvé
    if (!captchaSrc) {
        const html = await iframe.$eval('body', el => el.innerHTML).catch(() => null);
        console.log('HTML de l\'iframe captcha:', html);
    }

    if (captchaSrc) {
        // console.log('Captcha src:', captchaSrc);
        console.log('Captcha trouvé et extrait avec succès !');
        
        // Enregister le captcha dans un fichier pour vérification
        const captchaPath = path.join(__dirname, 'captcha.png');

        if (captchaSrc.startsWith('data:image')) {
            // Extraire la partie base64
            const base64Data = captchaSrc.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(captchaPath, buffer);
            console.log('Captcha enregistré dans', captchaPath);
        } else {
            // Cas d'une URL classique
            const response = await fetch(captchaSrc);
            const buffer = await response.buffer();
            fs.writeFileSync(captchaPath, buffer);
            console.log('Captcha enregistré dans', captchaPath);
        }
    } else {
        console.error("Captcha introuvable, arrêt du script.");
        await sendToDiscord("error", "Captcha introuvable, arrêt du script.");
        await browser.close();
        return;
    }

    // Choisir le modèle selon la variable d'environnement AI_MODEL ("chatgpt" ou "mistral")
    let result;
    const aiModel = process.env.AI_MODEL ? process.env.AI_MODEL.toLowerCase() : 'mistral';
    if (aiModel === 'chatgpt') {
        result = await newQueryChatGPT(captchaSrc);
    } else {
        result = await newQueryMistral(captchaSrc);
    }
    // const result = "L'inscription sur l'image est : GZHM";

    if (!result) {
        console.error("Erreur lors de l'analyse du captcha.");
        await sendToDiscord("error", "Erreur lors de l'analyse du captcha.");
        await browser.close();
        return;
    }

    let answer = await formatAnswer(result);
    // let answer = result;

    if (answer) {
        // Remplir l'input du captcha dans l'iframe
        const input = await iframe.$('#mtcap-inputtext-1'); // Problème ici
        if (input) {
            await input.type(answer, { delay: 100 }); // Simule la saisie humaine
            console.log('Réponse captcha saisie dans le champ :', answer);
        } else {
            console.error("Impossible de trouver l'input du captcha dans l'iframe.");
            await sendToDiscord("error", "Impossible de trouver l'input du captcha dans l'iframe.");
            await browser.close();
            return;
        }
    } else {
        console.error("Aucune réponse extraite pour le captcha.");
        await sendToDiscord("error", "La réponse extraite pour le captcha n'a pas correctement été formattée.");
        await browser.close();
        return;
    }

    await sleep(1000);

    // Attendre que le message de l'iframe change si "Propulsé par MTCaptcha™"
    const successSelector = '#mtcap-msg-1 p';
    // Attendre que le texte devienne "Vérifié avec succès" OU "Veuillez réessayer.."
    await iframe.waitForFunction(
        selector => {
            const txt = document.querySelector(selector)?.textContent.trim();
            return txt === 'Vérifié avec succès' || txt === 'Veuillez réessayer..' || txt === 'rechargement ...';
        },
        { timeout: 15000 },
        successSelector
    ).catch(() => {});

    let successText = await iframe.$eval(successSelector, el => el.textContent.trim()).catch(() => '');
    if (!successText) {
        console.error("Impossible de récupérer le texte de l'iframe. (Ou aucun texte trouvé)");
        return null;
    }
    
    console.log('Texte dans l\'iframe :', successText);
    return [successText, answer];
}

async function formatAnswer(result) {
    let answerText = '';
    if (result.includes(':')) {
        answerText = result.split(':').pop().trim();
        console.log('Texte extrait après le ":" : ', answerText);
    } else {
        answerText = result.trim();
    }
    // Enlever les espaces, les guillemets et mettre en majuscule
    answerText = answerText.replace(/["'«»“”‘’]/g, ''); // retire tous types de guillemets
    answerText = answerText.replace(/\s+/g, '').toUpperCase();
    // Extraire une séquence de 4 à 8 caractères alphanumériques
    const match = answerText.match(/[A-Z0-9]{4,8}/);
    const answer = match ? match[0] : '';

    console.log('Résultat / Réponse transformé pour le captcha :', answer);
    return answer;
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
    mainModule,
    formatAnswer,
    getUserInput,
    sleep
}