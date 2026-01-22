'use server';

/**
 * @fileOverview AI-powered product description generator.
 * 
 * - generateProductDescription - A function that generates product descriptions.
 * - GenerateProductDescriptionInput - The input type for the generateProductDescription function.
 * - GenerateProductDescriptionOutput - The return type for the generateProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDescriptionInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  category: z.string().describe('The category of the product (e.g., Beef, Lamb).'),
  cutType: z.string().describe('The specific cut type of the meat (e.g., Ribeye Steak, Ground Lamb).'),
  gradeQuality: z.string().describe('The grade or quality of the meat (e.g., Grass-Fed, Organic, Wagyu).'),
  additionalDetails: z.string().optional().describe('Any additional details to include in the description.'),
});
export type GenerateProductDescriptionInput = z.infer<typeof GenerateProductDescriptionInputSchema>;

const GenerateProductDescriptionOutputSchema = z.object({
  description: z.string().describe('The generated product description.'),
});
export type GenerateProductDescriptionOutput = z.infer<typeof GenerateProductDescriptionOutputSchema>;

export async function generateProductDescription(input: GenerateProductDescriptionInput): Promise<GenerateProductDescriptionOutput> {
  return generateProductDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductDescriptionPrompt',
  input: {schema: GenerateProductDescriptionInputSchema},
  output: {schema: GenerateProductDescriptionOutputSchema},
  prompt: `You are an expert copywriter specializing in writing engaging and informative product descriptions for high-quality meats.

  Write a compelling product description based on the following information:

  Product Name: {{{productName}}}
  Category: {{{category}}}
  Cut Type: {{{cutType}}}
  Grade/Quality: {{{gradeQuality}}}
  Additional Details: {{{additionalDetails}}}

  The description should highlight the key features and benefits of the product, and appeal to discerning customers who value quality and taste. The description should be 2-3 short paragraphs.
`,
});

const generateProductDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProductDescriptionFlow',
    inputSchema: GenerateProductDescriptionInputSchema,
    outputSchema: GenerateProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
