
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
        // Assuming Shipday API endpoint for fetching an order is `GET /orders/{orderId}`
        const response = await fetch(`https://api.shipday.com/orders/${input.shipdayOrderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Shipday API Error:', errorData);
            throw new Error(errorData.message || `Failed to fetch Shipday order. Status: ${response.status}`);
        }

        const responseData = await response.json();
        
        // Map the response to our schema.
        const mappedData: ShipdayOrderDetails = {
            orderStatus: responseData.orderStatus,
            deliverTo: {
                name: responseData.customerName,
                address: responseData.customerAddress,
                phone: responseData.customerPhoneNumber,
                email: responseData.customerEmail,
            },
            pickupFrom: {
                name: responseData.restaurantName,
                address: responseData.restaurantAddress,
                phone: responseData.restaurantPhoneNumber,
            },
            delivery: {
                placementTime: responseData.activity?.placementTime,
                assignedTime: responseData.activity?.assignedTime,
                eta: responseData.activity?.eta,
                actualPickupTime: responseData.activity?.actualPickupTime,
                actualDeliveryTime: responseData.activity?.actualDeliveryTime,
                deliveryCompleteTime: responseData.activity?.deliveryCompleteTime,
                driver: { name: responseData.assignedDriver?.name },
                deliveryInstruction: responseData.deliveryInstruction,
                requestedPickupTime: responseData.expectedPickupTime,
                requestedDeliveryTime: responseData.expectedDeliveryTime,
                orderCompletionTime: responseData.orderCompletionTimeInMinutes,
            },
            payment: {
                paymentMethod: responseData.payment?.paymentMethod
            },
            deliveryLocation: responseData.deliveryLocation,
            pod: responseData.proofOfDelivery?.podText
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
