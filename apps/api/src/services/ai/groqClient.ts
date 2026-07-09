import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn('Warning: GROQ_API_KEY is not set in environment variables.');
}

export const groq = apiKey ? new Groq({ apiKey }) : null;

/**
 * Sends a chat completion prompt to Llama-3.3-70b on Groq with JSON Mode enabled.
 */
export const generateGroqJson = async (prompt: string): Promise<string> => {
  if (!groq) {
    throw new Error('Groq client is not initialized. Please verify GROQ_API_KEY.');
  }

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: 0.1,
  });

  return response.choices[0]?.message?.content || '';
};
