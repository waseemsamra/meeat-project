
'use server';
/**
 * @fileOverview A server-side flow for creating customer orders and dispatching to Shipday.
 * 
 * - createOrder - A function that handles the entire order creation transaction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, writeBatch, collection, updateDoc } from 'firebase/firestore';
import type { Order, OrderItem, Address, Product, User, Notification } from '@/lib/types';


// Schemas remain in the server file, but are not exported.
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  cutType: z.string().optional(),
  price: z.number(),
});

const CartItemSchema = z.object({
  id: z.string(),
  product: ProductSchema,
  quantity: z.number(),
  selectedUnit: z.string().optional(),
  price: z.number(),
  selectedStyle: z.string().optional(),
  selectedRub: z.string().optional(),
  isBox: z.literal(false),
});

const BoxCartItemSchema = z.object({
  id: z.string(),
  isBox: z.literal(true),
  name: z.string(),
  items: z.array(ProductSchema),
  price: z.number(),
  quantity: z.number(),
});

const AnyCartItemSchema = z.union([CartItemSchema, BoxCartItemSchema]);

const CreateOrderFlowInputSchema = z.object({
  userId: z.string(),
  cartItems: z.array(AnyCartItemSchema),
  total: z.number(),
  shippingAddress: z.object({
    fullName: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  paymentMethod: z.string().optional(),
  orderNotes: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhoneNumber: z.string().optional(),
});
type CreateOrderFlowInput = z.infer<typeof CreateOrderFlowInputSchema>;


const createOrderFlow = ai.defineFlow(
  {
    name: 'createOrderFlow',
    inputSchema: CreateOrderFlowInputSchema,
    outputSchema: z.object({ orderId: z.string() }),
  },
  async (input) => {
    const { firestore } = initializeFirebase();
    if (!firestore) {
      throw new Error("Firestore is not initialized");
    }

    const { userId, cartItems, total, shippingAddress, paymentMethod, orderNotes, customerEmail, customerPhoneNumber } = input;

    const batch = writeBatch(firestore);

    // 1. Pre-generate Order ID in root /orders collection
    const orderRef = doc(collection(firestore, 'orders'));
    const orderId = orderRef.id;
    
    // 2. Process cart items and add them to the batch
    const orderItemReferencesForOrderDoc: Order['orderItemIds'] = [];
    let orderItemsTextSummary = '';

    for (const cartItem of cartItems) {
        const orderItemRef = doc(collection(firestore, 'orders_items'));
        const orderItemId = orderItemRef.id;
        
        const isRegularItem = !cartItem.isBox;
        const regularItem = isRegularItem ? (cartItem as z.infer<typeof CartItemSchema>) : null;

        const itemName = cartItem.isBox ? cartItem.name : regularItem!.product.name;
        orderItemsTextSummary += `${itemName} x${cartItem.quantity}\n`;

        const newOrderItem: Omit<OrderItem, 'product'> = {
            id: orderItemId,
            orderId: orderId,
            userId: userId, 
            productId: cartItem.isBox ? cartItem.id : regularItem!.product.id,
            quantity: cartItem.quantity,
            price: cartItem.price,
            selectedUnit: cartItem.isBox ? cartItem.name : (regularItem?.selectedUnit || null),
            selectedStyle: isRegularItem ? (regularItem?.selectedStyle || null) : null,
            selectedRub: isRegularItem ? (regularItem?.selectedRub || null) : null,
        };
        
        batch.set(orderItemRef, newOrderItem);

        orderItemReferencesForOrderDoc.push({
            id: newOrderItem.id,
            productId: newOrderItem.productId,
            quantity: newOrderItem.quantity,
            price: newOrderItem.price,
            selectedUnit: newOrderItem.selectedUnit!,
            selectedStyle: newOrderItem.selectedStyle || null,
            selectedRub: newOrderItem.selectedRub || null,
            product: {
                name: cartItem.isBox ? cartItem.name : regularItem!.product.name,
            },
        });
    }
    
    const orderData: Omit<Order, 'id'> = {
      userId: userId,
      orderType: 'ONLINE',
      orderItemIds: orderItemReferencesForOrderDoc,
      total: total,
      shippingAddress: shippingAddress,
      paymentStatus: 'pending',
      paymentMethod: (paymentMethod as any) || null,
      fulfillmentStatus: 'processing',
      stripePaymentIntentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: orderNotes || null,
    };
    
    batch.set(orderRef, { ...orderData, id: orderId });

    // 5. Create a notification for the user (standardized for mobile parity)
    const notificationRef = doc(collection(firestore, 'notifications'));
    const title = "Order Received";
    const body = `Thank you! Your order #${orderId.substring(0, 8)} has been received.`;
    
    const notificationData = {
        userId: userId,
        title: title,
        name: title, // Parity field
        body: body,
        info: body, // Parity field
        type: 'order_update',
        relatedId: orderId,
        read: false,
        createdAt: new Date().toISOString(),
        scheduledAt: new Date().toISOString(),
    };
    batch.set(notificationRef, { ...notificationData, id: notificationRef.id });
    
    await batch.commit();

    return { orderId };
  }
);


export async function createOrder(input: any): Promise<{orderId: string}> {
    const validatedInput = CreateOrderFlowInputSchema.parse(input);
    return await createOrderFlow(validatedInput);
}
