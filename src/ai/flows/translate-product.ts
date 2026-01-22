
'use server';
/**
 * @fileOverview An AI flow to translate product information into multiple languages.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the schema for a single language's text
const LocalizedTextSchema = z.object({
  en: z.string().optional(),
  es: z.string().optional(),
  fr: z.string().optional(),
  ar: z.string().optional(),
  ur: z.string().optional(),
});

// Define the input schema for the translation flow
const TranslateProductInputSchema = z.object({
  name: z.string().describe("The product name to be translated."),
  description: z.string().describe("The product description to be translated."),
  sourceLanguage: z.enum(['en', 'es', 'fr', 'ar', 'ur']).describe("The source language of the provided text."),
});
export type TranslateProductInput = z.infer<typeof TranslateProductInputSchema>;

// Define the output schema for the translation flow
const TranslateProductOutputSchema = z.object({
  translatedName: LocalizedTextSchema.describe("The translated product name for all supported languages."),
  translatedDescription: LocalizedTextSchema.describe("The translated product description for all supported languages."),
});
export type TranslateProductOutput = z.infer<typeof TranslateProductOutputSchema>;


const translationPrompt = ai.definePrompt({
    name: 'translateProductPrompt',
    input: { schema: TranslateProductInputSchema },
    output: { schema: TranslateProductOutputSchema },
    prompt: `You are an expert multilingual translator.

    Translate the following information from the source language '{{{sourceLanguage}}}' into all of the following languages: English (en), Spanish (es), French (fr), Arabic (ar), and Urdu (ur).

    Ensure the translations are accurate and culturally appropriate. Maintain a consistent tone.
    If the input is a proper noun like a country name, provide its official or common name in the target language.

    **Examples for Country Name Translations:**
    - English: "Pakistan", Urdu: "پاکستان"
    - English: "Brazil", Urdu: "برازیل"

    **Information to Translate:**
    - Name: {{{name}}}
    - Description: {{{description}}}

    Provide the translations for the name and description in the specified JSON output format. If the description is empty, do not generate a description.
    `,
});

const translateProductFlow = ai.defineFlow(
  {
    name: 'translateProductFlow',
    inputSchema: TranslateProductInputSchema,
    outputSchema: TranslateProductOutputSchema,
  },
  async (input) => {
    const { output } = await translationPrompt(input);
    return output!;
  }
);

// Export a single function for the action.
export async function translateProduct(input: TranslateProductInput): Promise<TranslateProductOutput> {
    return translateProductFlow(input);
}
