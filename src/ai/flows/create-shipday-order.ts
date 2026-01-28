
'use server';
/**
 * @fileOverview A server-side flow for creating a delivery order with Shipday.
 * 
 * - createShipdayOrder - A function that will send order details to the Shipday API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the expected input from our application (order and customer details)
const CreateShipdayOrderInputSchema = z.object({
    orderId: z.string(),
    customerName: z.string(),
    customerAddress: z.string(),
    customerEmail: z.string().optional(),
    customerPhoneNumber: z.string().optional(),
    orderItemsText: z.string().describe("A summary of the items in the order."),
    total: z.number(),
});
export type CreateShipdayOrderInput = z.infer<typeof CreateShipdayOrderInputSchema>;

const CreateShipdayOrderOutputSchema = z.object({
  success: z.boolean(),
  shipdayOrderId: z.number().optional(),
  errorMessage: z.string().optional(),
});
export type CreateShipdayOrderOutput = z.infer<typeof CreateShipdayOrderOutputSchema>;


const createShipdayOrderFlow = ai.defineFlow(
  {
    name: 'createShipdayOrderFlow',
    inputSchema: CreateShipdayOrderInputSchema,
    outputSchema: CreateShipdayOrderOutputSchema,
  },
  async (input) => {
    
    const apiKey = process.env.SHIPDAY_API_KEY;
    if (!apiKey) {
      console.error('Shipday API key is not configured.');
      return { success: false, errorMessage: 'Shipday API key is not configured.' };
    }

    try {
        const now = new Date();
        const deliveryTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

        const response = await fetch('https://api.shipday.com/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${apiKey}`
            },
            body: JSON.stringify({
                orderNumber: `#${input.orderId.substring(0, 8)}`,
                customerName: input.customerName,
                customerAddress: input.customerAddress,
                customerEmail: input.customerEmail,
                customerPhoneNumber: input.customerPhoneNumber,
                restaurantName: "Me'eat",
                restaurantAddress: "Mazreat Al Wadi Dubai",
                // A placeholder phone number
                restaurantPhoneNumber: "+971501234567",
                expectedDeliveryDate: deliveryTime.toISOString().split('T')[0],
                expectedDeliveryTime: deliveryTime.toTimeString().split(' ')[0], // HH:mm:ss format
                deliveryInstruction: `Order Items:\n${input.orderItemsText}`,
                total: input.total,
                orderSource: "Website"
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Shipday API Error Response:', responseData);
            throw new Error(responseData.message || `Failed to create Shipday order. Status: ${response.status}`);
        }

        return { success: true, shipdayOrderId: responseData.orderId };

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error('Shipday API Error:', message, error);
        return { success: false, errorMessage: message };
    }
  }
);

export async function createShipdayOrder(input: CreateShipdayOrderInput): Promise<CreateShipdayOrderOutput> {
    return createShipdayOrderFlow(input);
}
