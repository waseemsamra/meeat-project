
'use server';

/**
 * @fileOverview An AI flow to suggest a currency based on a selected language.
 * 
 * - suggestCurrency - A function that takes a language name and suggests a currency code.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestCurrencyInputSchema = z.object({
  language: z.string().describe('The name of the language (e.g., "Spanish").'),
});
export type SuggestCurrencyInput = z.infer<typeof SuggestCurrencyInputSchema>;

const SuggestCurrencyOutputSchema = z.object({
  currencyCode: z.string().length(3).describe('The suggested 3-letter ISO 4217 currency code (e.g., "EUR").'),
});
export type SuggestCurrencyOutput = z.infer<typeof SuggestCurrencyOutputSchema>;

const suggestCurrencyPrompt = ai.definePrompt({
  name: 'suggestCurrencyPrompt',
  input: { schema: SuggestCurrencyInputSchema },
  output: { schema: SuggestCurrencyOutputSchema },
  prompt: `You are an expert financial assistant. Based on the provided language, suggest the most common official currency code for the primary country where that language is spoken.
  
  Examples:
  - Input: "English", Output: "USD"
  - Input: "Spanish", Output: "EUR"
  - Input: "Japanese", Output: "JPY"
  - Input: "Arabic", Output: "AED"

  Language: {{{language}}}

  Return only the 3-letter ISO 4217 currency code.`,
});

const suggestCurrencyFlow = ai.defineFlow(
  {
    name: 'suggestCurrencyFlow',
    inputSchema: SuggestCurrencyInputSchema,
    outputSchema: SuggestCurrencyOutputSchema,
  },
  async (input) => {
    const { output } = await suggestCurrencyPrompt(input);
    return output!;
  }
);


export async function suggestCurrency(input: SuggestCurrencyInput): Promise<SuggestCurrencyOutput> {
  return suggestCurrencyFlow(input);
}
