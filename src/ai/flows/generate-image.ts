'use server';
/**
 * @fileOverview An AI-powered flow to generate an image from a text prompt.
 *
 * - generateImage - A function that takes a text prompt and returns an image data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MediaPart } from 'genkit';

// Define schemas at the top level.
const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('A descriptive prompt for image generation.'),
  imageDataUri: z.string().optional().describe('An optional image to use as a basis for generation, as a data URI.'),
  logoDataUri: z.string().optional().describe('An optional logo to place in the background, as a data URI.'),
  contextImageDataUri: z.string().optional().describe('An optional third image for additional context, as a data URI.'),
});
const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI.'),
});

// Define types for external use.
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

// Define the flow at the top level.
const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const promptParts: (string | MediaPart)[] = [];
    let textPrompt = input.prompt;

    const addMediaPart = (uri: string) => {
      const match = uri.match(/^data:(image\/[a-zA-Z]+);base64,/);
      if (!match) {
        console.warn('Invalid image data URI, skipping media part:', uri.substring(0, 50) + '...');
        return;
      }
      const contentType = match[1];
      promptParts.push({ media: { url: uri, contentType } });
    };

    if (input.imageDataUri) addMediaPart(input.imageDataUri);
    if (input.contextImageDataUri) addMediaPart(input.contextImageDataUri);
    if (input.logoDataUri) {
      addMediaPart(input.logoDataUri);
      textPrompt += "\n\nImportant: Place the provided logo image on a wall in the background of the scene.";
    }
    promptParts.push({ text: textPrompt });
    
    // Consolidate to a single, powerful multi-modal model to bypass potential rate limits on other models.
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: promptParts,
      config: {
          responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const media = result.media;

    if (!media || !media.url) {
      throw new Error('Image generation failed to return a URL.');
    }

    return { imageUrl: media.url };
  }
);

// Export a single function to be called by the application.
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  // Validate the input and run the flow
  const validatedInput = GenerateImageInputSchema.parse(input);
  return generateImageFlow(validatedInput);
}
