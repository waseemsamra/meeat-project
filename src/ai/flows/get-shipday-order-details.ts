
'use server';
/**
 * @fileOverview A server-side flow for fetching order details from Shipday.
 * 
 * - getShipdayOrderDetails - A function that fetches details for a given Shipday order ID.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ShipdayOrderDetails } from '@/lib/types';

const GetShipdayOrderDetailsInputSchema = z.object({
    shipdayOrderId: z.number(),
});
export type GetShipdayOrderDetailsInput = z.infer<typeof GetShipdayOrderDetailsInputSchema>;

// This schema is a representation of the expected data and may not match the Shipday API 1:1.
// It's used to structure the output of our flow.
const ShipdayOrderDetailsOutputSchema = z.object({
    orderStatus: z.string().optional(),
    deliverTo: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
    }).optional(),
    pickupFrom: z.object({
        name: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
    }).optional(),
    delivery: z.object({
        placementTime: z.string().optional(),
        assignedTime: z.string().optional(),
        eta: z.string().optional(),
        actualPickupTime: z.string().optional(),
        actualDeliveryTime: z.string().optional(),
        deliveryCompleteTime: z.string().optional(),
        driver: z.object({ name: z.string().optional() }).optional(),
        deliveryInstruction: z.string().optional(),
        requestedPickupTime: z.string().optional(),
        requestedDeliveryTime: z.string().optional(),
        orderCompletionTime: z.number().optional(),
    }).optional(),
    payment: z.object({
        paymentMethod: z.string().optional(),
    }).optional(),
    deliveryLocation: z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
    }).optional(),
    pod: z.string().optional(),
}).optional();

const getShipdayOrderDetailsFlow = ai.defineFlow(
  {
    name: 'getShipdayOrderDetailsFlow',
    inputSchema: GetShipdayOrderDetailsInputSchema,
    outputSchema: ShipdayOrderDetailsOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.SHIPDAY_API_KEY;
    if (!apiKey) {
      throw new Error('Shipday API key is not configured.');
    }

    try {
        // Fetching from the /status endpoint as per the provided sample response.
        const response = await fetch(`https://api.shipday.com/orders/${input.shipdayOrderId}/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Shipday API Error:', errorData);
            throw new Error(errorData.message || `Failed to fetch Shipday order status. Status: ${response.status}`);
        }

        const responseData = await response.json();
        
        // Destructure the expected main objects from the response.
        const { fixedData, dynamicData } = responseData;

        // Map the data to the ShipdayOrderDetails type, handling potential undefined values.
        const mappedData: ShipdayOrderDetails = {
            orderStatus: dynamicData?.orderStatus?.status,
            deliverTo: {
                name: fixedData?.customer?.name,
                address: fixedData?.customer?.address,
                phone: fixedData?.customer?.phoneNumber,
                email: fixedData?.customer?.email,
            },
            pickupFrom: {
                name: fixedData?.restaurant?.name,
                address: fixedData?.restaurant?.address,
                phone: fixedData?.restaurant?.phoneNumber,
            },
            delivery: {
                // Timeline from dynamicData
                placementTime: dynamicData?.orderStatus?.startTime,
                assignedTime: dynamicData?.orderStatus?.assignedTime,
                eta: dynamicData?.estimatedTimeInMinutes,
                actualPickupTime: dynamicData?.orderStatus?.pickedTime,
                actualDeliveryTime: dynamicData?.orderStatus?.deliveryTime,
                deliveryCompleteTime: dynamicData?.orderStatus?.deliveryTime,

                // Driver from fixedData
                driver: { name: fixedData?.carrier?.name },
                
                // These might come from a different endpoint, so they will likely be undefined here.
                deliveryInstruction: undefined, 
                requestedPickupTime: undefined,
                requestedDeliveryTime: undefined,
                orderCompletionTime: undefined,
            },
            payment: {
                paymentMethod: undefined,
            },
            deliveryLocation: dynamicData?.carrierLocation,
            pod: undefined,
        };
        
        return mappedData;

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error('getShipdayOrderDetailsFlow Error:', message, error);
        throw new Error(message);
    }
  }
);

export async function getShipdayOrderDetails(input: GetShipdayOrderDetailsInput): Promise<ShipdayOrderDetails> {
    return getShipdayOrderDetailsFlow(input);
}
