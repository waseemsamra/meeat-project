
'use server';
/**
 * @fileOverview An AI flow to generate a social media post for a product.
 *
 * - generateSocialMediaPost - A function that takes product details and generates a post.
 * - GenerateSocialMediaPostInput - The input type for the function.
 * - GenerateSocialMediaPostOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSocialMediaPostInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  description: z.string().optional().describe('A short description of the product.'),
  price: z.string().describe('The price of the product.'),
  category: z.string().describe('The category of the product (e.g., Beef, Lamb).'),
  platform: z.enum(['Facebook', 'Instagram']).describe('The target social media platform.'),
});
export type GenerateSocialMediaPostInput = z.infer<typeof GenerateSocialMediaPostInputSchema>;

const GenerateSocialMediaPostOutputSchema = z.object({
  postText: z.string().describe('The generated social media post, including hashtags.'),
});
export type GenerateSocialMediaPostOutput = z.infer<typeof GenerateSocialMediaPostOutputSchema>;


const prompt = ai.definePrompt({
  name: 'generateSocialMediaPostPrompt',
  input: { schema: GenerateSocialMediaPostInputSchema },
  output: { schema: GenerateSocialMediaPostOutputSchema },
  prompt: `You are a social media marketing expert for a premium butcher shop called "Me'Eat". 
  Your task is to generate a short, engaging, and enticing social media post to promote a product for the specified platform.

  **Platform Specific Instructions:**
  - **Instagram:** Keep it concise and visually focused. Use a friendly, excited tone. Include 5-7 relevant and popular hashtags. Emojis are great.
  - **Facebook:** Can be slightly more detailed than Instagram. Include a clear call to action and a link. Use 3-5 relevant hashtags.

  **Platform:** {{{platform}}}

  **Product Information:**
  - Name: {{{productName}}}
  - Description: {{{description}}}
  - Price: {{{price}}}
  - Category: {{{category}}}

  Generate the post text now.`,
});

const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

// Export a single function for the action.
export async function generateSocialMediaPost(input: GenerateSocialMediaPostInput): Promise<GenerateSocialMediaPostOutput> {
    return generateSocialMediaPostFlow(input);
}
