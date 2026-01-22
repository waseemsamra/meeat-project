
"use server";

import { generateProductDescription } from "@/ai/flows/generate-product-description";
import type { GenerateProductDescriptionInput } from "@/ai/flows/generate-product-description";
import { translateProduct } from "@/ai/flows/translate-product";
import type { TranslateProductInput } from "@/ai/flows/translate-product";
import { generateSocialMediaPost } from '@/ai/flows/generate-social-post';
import type { GenerateSocialMediaPostInput } from '@/ai/flows/generate-social-post';
import { z } from 'zod';

export async function generateDescriptionAction(
  input: GenerateProductDescriptionInput
): Promise<{ description?: string; error?: string }> {
  try {
    if (!input.productName || !input.cutType || !input.gradeQuality) {
        return {
            error: "Product name, cut type, and grade are required to generate a description."
        }
    }

    const result = await generateProductDescription(input);
    return { description: result.description };
  } catch (error) {
    console.error("Error generating product description:", error);
    return {
      error: "Failed to generate description. Please try again.",
    };
  }
}

export async function translateProductAction(input: TranslateProductInput) {
    try {
        const result = await translateProduct(input);
        return { success: true, ...result };
    } catch(error) {
        console.error("Error translating product:", error);
        return {
            success: false,
            error: "Failed to translate product details. Please try again.",
        };
    }
}


// This input schema should live with the action that uses it.
const GeneratePostActionInputSchema = z.object({
  productName: z.string(),
  description: z.string().optional(),
  price: z.string().optional(),
  category: z.string().optional(),
  platform: z.enum(['Facebook', 'Instagram']),
});


export async function generateSocialMediaPostAction(
  input: z.infer<typeof GeneratePostActionInputSchema>
) {
  try {
    const validatedInput = GeneratePostActionInputSchema.parse(input);
    
    // The AI flow expects a slightly different input structure, so we adapt it.
    const flowInput: GenerateSocialMediaPostInput = {
        productName: validatedInput.productName,
        description: validatedInput.description || '',
        price: validatedInput.price || '',
        category: validatedInput.category || '',
        platform: validatedInput.platform,
    };

    const result = await generateSocialMediaPost(flowInput);

    return { success: true, postText: result.postText };
  } catch (error) {
    console.error('Error generating social media post:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate post.';
    return { success: false, error: errorMessage };
  }
}
