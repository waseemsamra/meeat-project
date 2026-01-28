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
import { doc, getDoc, writeBatch, collection } from 'firebase/firestore';
import type { Order, OrderItem, Address, Product, User } from '@/lib/types';
import { createShipdayOrder } from './create-shipday-order';


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

    // 1. Pre-generate Order ID
    const orderRef = doc(collection(firestore, `users/${userId}/orders`));
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
            productId: cartItem.isBox ? cartItem.id : regularItem!.product.id,
            quantity: cartItem.quantity,
            price: cartItem.price,
            selectedUnit: cartItem.isBox ? cartItem.name : (regularItem?.selectedUnit || null),
            selectedStyle: isRegularItem ? (regularItem?.selectedStyle || null) : null,
            selectedRub: isRegularItem ? (regularItem?.selectedRub || null) : null,
        };
        
        // Add the OrderItem document to the batch
        batch.set(orderItemRef, newOrderItem);

        // Prepare the reference object for the main Order document, ensuring no undefined fields.
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
    
    // 3. Construct the main Order document
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
    
    // 4. Add the Order document to the batch
    batch.set(orderRef, { ...orderData, id: orderId });
    
    // 5. Atomically commit all writes
    await batch.commit();

    // 6. After successful order creation, trigger Shipday integration
    // We do this after the commit to ensure the order exists before we try to dispatch it.
    // We will not block the response to the user on this integration.
    createShipdayOrder({
        orderId: orderId,
        customerName: shippingAddress.fullName,
        customerAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.country}`,
        customerEmail: customerEmail,
        customerPhoneNumber: customerPhoneNumber,
        orderItemsText: orderItemsTextSummary.trim(),
        total: total,
    }).then(shipdayResult => {
        if (!shipdayResult.success) {
            console.error(`Failed to create Shipday order for orderId ${orderId}:`, shipdayResult.errorMessage);
            // Here you might want to add more robust error handling,
            // like saving the failed Shipday order to a separate collection for retry.
        } else {
            console.log(`Successfully created Shipday order ${shipdayResult.shipdayOrderId} for orderId ${orderId}`);
        }
    });

    return { orderId };
  }
);


export async function createOrder(input: any): Promise<{orderId: string}> {
    const validatedInput = CreateOrderFlowInputSchema.parse(input);
    return await createOrderFlow(validatedInput);
}
