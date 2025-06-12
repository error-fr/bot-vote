// https://platform.openai.com/docs/api-reference/chat/create
// https://platform.openai.com/docs/guides/images-vision?api-mode=responses&lang=javascript&format=base64-encoded

const OpenAI = require("openai");
const { Mistral } = require("@mistralai/mistralai");
const dotenv = require('dotenv');
dotenv.config();

const { sendToDiscord } = require('./discord.js');

async function newQueryChatGPT(imagePath) {
  const openai = new OpenAI({
    apiKey: process.env.CHATGPT_API_KEY,
  });

  try {
    console.log("-------------------------------- CHATGPT.JS --------------------------------");

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
          Tu vas passer un test de vue. Une image se trouve en pièce jointe, et comme avec une échelle de Monoyer, ton objectif est d’analyser attentivement l’image et d’identifier avec précision les inscriptions qui y figurent.
          \nNe t'arrête pas non plus à ce que l’analyse automatique (OCR) va détecter, approfondis ton analyse et donne moi le résultat le plus précis possible de ce que tu vois réellement/visuellement.
          \nUne grande attention et une rigueur particulière sont requises : ne confonds pas un "O" avec un "Q", ni un "J" avec un "I", un "l" avec un "I", un "4" avec un "A", un "0" avec un "O", etc.
          \nAfin de t'aider dans ton analyse, il y'a un minimum de 4 caractères systématiquement, pouvant aller jusqu'à 5 généralement ou 6 caractères.
          \nDonne moi directement le résultat de ton analyse, je veux un résultat concis, sans parole supplémentaire.
          \n\nVoici l'image :`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imagePath
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log(response.choices[0].message.content);
    console.log("----------------------------- FIN DE CHATGPT.JS ----------------------------");

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erreur lors de la requête : ", error);
    await sendToDiscord("error", error.message);
    console.log("----------------------------- FIN DE CHATGPT.JS ----------------------------");
    return null;
  }
}

async function newQueryMistral(imagePath) {
  const mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  try {
    console.log("-------------------------------- MISTRAL AI --------------------------------");

    const response = await mistral.chat.complete({
      model: "pixtral-large-latest",
      messages: [
        {
          role: "system",
          content: `
          Tu vas passer un test de vue. Une image se trouve en pièce jointe, et comme avec une échelle de Monoyer, ton objectif est d’analyser attentivement l’image et d’identifier avec précision les inscriptions qui y figurent.
          \nNe t'arrête pas non plus à ce que l’analyse automatique (OCR) va détecter, approfondis ton analyse et donne moi le résultat le plus précis possible de ce que tu vois réellement/visuellement.
          \nUne grande attention et une rigueur particulière sont requises : ne confonds pas un "O" avec un "Q", ni un "J" avec un "I", un "l" avec un "I", un "4" avec un "A", un "0" avec un "O", etc.
          \nAfin de t'aider dans ton analyse, il y'a un minimum de 4 caractères systématiquement, pouvant aller jusqu'à 5 généralement ou 6 caractères.
          \nDonne moi directement le résultat de ton analyse, je veux un résultat concis, sans parole supplémentaire.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Voici l'image :"
            },
            {
              type: "image_url",
              image_url: {
                url: imagePath
              },
            },
          ],
        },
      ],
    });

    console.log(response.choices[0].message.content);
    console.log("----------------------------- FIN DE MISTRAL AI ----------------------------");

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Erreur lors de la requête : ", error);
    await sendToDiscord("error", error.message);
    console.log("----------------------------- FIN DE MISTRAL AI ----------------------------");
    return null;
  }
}

module.exports = {
  newQueryChatGPT,
  newQueryMistral
};
