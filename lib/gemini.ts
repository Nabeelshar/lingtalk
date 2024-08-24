import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!);

export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Translate the following text to ${targetLanguage}: "${text}"`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const translatedText = response.text();

  return translatedText;
}
