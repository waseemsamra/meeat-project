
'use server';

/**
 * @fileOverview An AI-powered flow to generate a video from a text prompt and an optional image.
 * 
 * - generateVideo - A function that takes a text prompt and an optional image data URI, and returns a video data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MediaPart } from 'genkit';

export type GenerateVideoInput = {
  prompt: string;
  imageDataUri?: string;
  contextImageDataUri?: string;
  durationSeconds?: number;
};
export type GenerateVideoOutput = {
  videoUrl: string;
};

const GenerateVideoInputSchema = z.object({
  prompt: z.string().describe('A descriptive prompt for the video generation.'),
  imageDataUri: z.string().optional().describe('An optional image to use as a basis for generation, as a data URI.'),
  contextImageDataUri: z.string().optional().describe('An optional second image for additional context, as a data URI.'),
  durationSeconds: z.number().optional().describe('The duration of the video in seconds.'),
});
const GenerateVideoOutputSchema = z.object({
  videoUrl: z.string().describe('The generated video as a data URI.'),
});

async function downloadAndEncodeVideo(videoUrl: string, apiKey: string): Promise<string> {
    const fetch = (await import('node-fetch')).default;
    const fullUrl = `${videoUrl}&key=${apiKey}`;
    
    try {
        const response = await fetch(fullUrl);
        if (!response.ok || !response.body) {
            throw new Error(`Failed to download video. Status: ${response.status}`);
        }
        
        const chunks: Buffer[] = [];
        for await (const chunk of response.body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const base64Data = buffer.toString('base64');
        
        return `data:video/mp4;base64,${base64Data}`;
    } catch (error) {
        console.error("Error downloading or encoding video:", error);
        throw new Error("Could not retrieve the generated video file.");
    }
}


const generateVideoFlow = ai.defineFlow(
  {
    name: 'generateVideoFlow',
    inputSchema: GenerateVideoInputSchema,
    outputSchema: GenerateVideoOutputSchema,
  },
  async (input) => {

    const promptParts: (string | MediaPart)[] = [{ text: input.prompt }];
    if (input.imageDataUri) {
        const match = input.imageDataUri.match(/^data:(image\/[a-zA-Z]+);base64,/);
        if (!match) {
            throw new Error('Invalid image data URI: could not determine content type.');
        }
        const contentType = match[1];
        promptParts.push({ media: { url: input.imageDataUri, contentType } });
    }
    
    if (input.contextImageDataUri) {
        const match = input.contextImageDataUri.match(/^data:(image\/[a-zA-Z]+);base64,/);
        if (match) {
            const contentType = match[1];
            promptParts.push({ media: { url: input.contextImageDataUri, contentType } });
        }
    }
    
    // Using Veo 2.0 as Veo 3.0 is not available. This model does not support sound.
    let { operation } = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: promptParts,
      config: {
        durationSeconds: input.durationSeconds || 8,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
        throw new Error('Expected the model to return an operation');
    }

    // Poll for the result, waiting between checks
    while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await ai.checkOperation(operation);
    }
    
    if (operation.error) {
        throw new Error('Failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media?.url) {
        throw new Error('Failed to find the generated video URL in the operation result.');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    
    const videoDataUri = await downloadAndEncodeVideo(video.media.url, apiKey);
    
    return { videoUrl: videoDataUri };
  }
);


export async function generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
  const validatedInput = GenerateVideoInputSchema.parse(input);
  return generateVideoFlow(validatedInput);
}
