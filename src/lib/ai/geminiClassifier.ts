/**
 * geminiClassifier.ts — AI email classification using Google Gemini.
 * Port of the _classify_with_gemini() function from app.py.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, CLASSIFICATION_BATCH_SIZE } from '@/lib/config';
import type { ClassificationResult } from '@/types';

export async function classifyWithGemini(
  emails: string[],
  apiKey: string
): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const business: string[] = [];
  const individual: string[] = [];

  for (let i = 0; i < emails.length; i += CLASSIFICATION_BATCH_SIZE) {
    const batch = emails.slice(i, i + CLASSIFICATION_BATCH_SIZE);
    const prompt = `Classify each email address as 'business' or 'individual' based on the domain and local-part conventions. Business emails typically use company domains (not gmail/yahoo/hotmail/outlook), or contain company-indicative keywords. Return a JSON object mapping each email to its label.\n\nEmails: ${JSON.stringify(batch)}\n\nRespond ONLY with valid JSON, e.g. {"email@corp.com": "business", ...}`;

    try {
      const response = await model.generateContent(prompt);
      const text = response.response.text().trim();

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(text.slice(start, end)) as Record<string, string>;
        for (const [email, label] of Object.entries(parsed)) {
          if (label.toLowerCase() === 'business') {
            business.push(email);
          } else {
            individual.push(email);
          }
        }
      } else {
        // Fallback: treat entire batch as individual
        individual.push(...batch);
      }
    } catch {
      // On error, treat batch as individual
      individual.push(...batch);
    }
  }

  return { business, individual };
}
