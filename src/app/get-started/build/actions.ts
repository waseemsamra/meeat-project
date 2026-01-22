
'use server';

import { collection, getDocs } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/server';
import { curateBox } from '@/ai/flows/curate-box-flow';
import type { Product } from '@/lib/types';
import { z } from 'zod';

const ProductSchemaForCuration = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  cutType: z.string(),
  price: z.number(),
  bestseller: z.boolean().optional(),
});

const CurateBoxFlowInputSchema = z.object({
  prompt: z.string().describe('The user\'s request for their meat box (e.g., "planning a barbecue for friends", "need easy weeknight meals").'),
  availableProducts: z.array(ProductSchemaForCuration).describe('The list of all available products the AI can choose from.'),
});

const ActionInputSchema = z.object({
    prompt: z.string(),
});

export async function getAiCuratedBox(input: z.infer<typeof ActionInputSchema>) {
    const validatedInput = ActionInputSchema.parse(input);
    const { firestore } = initializeFirebase();

    try {
        // 1. Fetch all available products from Firestore
        const productsRef = collection(firestore, 'products');
        const productsSnapshot = await getDocs(productsRef);
        const availableProducts = productsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

        // 2. Prepare the input for the Genkit flow
        const flowInput = {
            prompt: validatedInput.prompt,
            availableProducts: availableProducts.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                cutType: p.cutType,
                price: p.price,
                bestseller: p.bestseller || false,
            })),
        };
        
        // Ensure the input matches the schema before calling the flow
        const validatedFlowInput = CurateBoxFlowInputSchema.parse(flowInput);

        // 3. Call the Genkit flow
        const result = await curateBox(validatedFlowInput);

        // 4. Map the resulting IDs back to full product objects
        const productMap = new Map(availableProducts.map(p => [p.id, p]));
        const selectedProducts = result.productIds.map(id => productMap.get(id)).filter(Boolean) as Product[];

        return {
            success: true,
            products: selectedProducts,
            reasoning: result.reasoning,
        };

    } catch (error) {
        console.error("Error in getAiCuratedBox action:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "An unknown error occurred while curating your box.",
        };
    }
}
