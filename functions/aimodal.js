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
          content: process.env.CHATGPT_PROMPT,
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
          content: process.env.MISTRAL_PROMPT,
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
              imageUrl: imagePath
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
