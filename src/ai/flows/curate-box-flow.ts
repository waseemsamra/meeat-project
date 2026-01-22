
'use server';

/**
 * @fileOverview An AI-powered flow to curate a box of meats based on user preferences.
 * 
 * - curateBox - A function that takes a user prompt and returns a curated list of products.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Product } from '@/lib/types';

const ProductSchemaForCuration = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  cutType: z.string(),
  price: z.number(),
  bestseller: z.boolean().optional(),
});

const CurateBoxInputSchema = z.object({
  prompt: z.string().describe('The user\'s request for their meat box (e.g., "planning a barbecue for friends", "need easy weeknight meals").'),
  availableProducts: z.array(ProductSchemaForCuration).describe('The list of all available products the AI can choose from.'),
});
type CurateBoxInput = z.infer<typeof CurateBoxInputSchema>;


const CurateBoxOutputSchema = z.object({
  productIds: z.array(z.string()).describe('An array of product IDs that have been selected to be in the box.'),
  reasoning: z.string().describe('A short, friendly explanation of why these items were chosen for the user.'),
});
type CurateBoxOutput = z.infer<typeof CurateBoxOutputSchema>;


export async function curateBox(input: CurateBoxInput): Promise<CurateBoxOutput> {
  return curateBoxFlow(input);
}

const curationPrompt = ai.definePrompt({
  name: 'curateBoxPrompt',
  input: { schema: CurateBoxInputSchema },
  output: { schema: CurateBoxOutputSchema },
  prompt: `You are an expert butcher and personal shopping assistant for "Me'Eat", a premium online butchery. Your task is to curate a box of meats based on a customer's request.

  **Constraints:**
  - Base your selections on the user's prompt and the provided list of available products.
  - Prioritize variety and relevance to the user's prompt. A good box usually contains between 5 and 8 items.
  - If a product is marked as a 'bestseller', it's a good option to consider if it fits the prompt.
  - Return ONLY the IDs of the selected products in the \`productIds\` array.
  - Provide a short, friendly, and helpful 'reasoning' for your selection that directly addresses the user's prompt.

  **Customer Request:**
  "{{{prompt}}}"

  **Available Products (Name, Category, etc.):**
  ---
  {{#each availableProducts}}
  - ID: {{id}}, Name: "{{name}}", Category: {{category}}, Cut: {{cutType}}, Price: {{price}}, Bestseller: {{bestseller}}
  {{/each}}
  ---

  Now, curate the perfect box!`,
});

const curateBoxFlow = ai.defineFlow(
  {
    name: 'curateBoxFlow',
    inputSchema: CurateBoxInputSchema,
    outputSchema: CurateBoxOutputSchema,
  },
  async (input) => {
    const { output } = await curationPrompt(input);
    return output!;
  }
);
