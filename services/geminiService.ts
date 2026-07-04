import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const initGenAI = () => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getSmartReply = async (
  currentUserName: string,
  partnerName: string,
  lastMessages: Message[]
): Promise<string> => {
  const ai = initGenAI();
  if (!ai) return "I can't think right now (Missing API Key).";

  // Format context for the AI
  const conversation = lastMessages.map(m => 
    `${m.senderId === 'me' ? currentUserName : partnerName}: ${m.type === 'TEXT' ? m.content : '[Media]'}`
  ).join('\n');

  const prompt = `
    You are a helpful romantic relationship assistant.
    The user "${currentUserName}" is chatting with "${partnerName}".
    Here is the recent conversation:
    ---
    ${conversation}
    ---
    Suggest a short, contextually appropriate, and engaging reply for "${currentUserName}" to send. 
    Keep it casual and authentic to modern texting. Do not include quotes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "Hmm, I'm not sure what to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating reply.";
  }
};
