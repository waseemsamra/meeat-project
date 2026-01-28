'use client';

import Link from 'next/link';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart } from 'lucide-react';
import type { CartItem, BoxCartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createOrder } from '@/ai/flows/create-order';
import { useSettings } from '@/hooks/useSettings';


const addressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  street: z.string().min(1, 'Street address is required'),
  city: z.enum(['Dubai', 'Sharjah', 'Ajman'], {
    required_error: 'City is required',
  }),
  apartment: z.string().optional(),
});

const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema.optional(),
  shipToDifferentAddress: z.boolean(),
  orderNotes: z.string().optional(),
  paymentMethod: z.enum([
    'direct-bank-transfer',
    'card-payments',
    'cash-on-delivery',
    'paypal',
  ]),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvc: z.string().optional(),
  paypalEmail: z.string().email().optional().or(z.literal('')),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

const UAE_CITIES = ['Dubai', 'Sharjah', 'Ajman'];

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, isUserLoading } = useUser();
  const { defaultCurrency } = useSettings();
  const router = useRouter();
  const { toast } = useToast();
  const shippingFee = 10.0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormValues | null>(null);

  const currencySymbol = defaultCurrency?.symbol || '$';

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      phone: '',
      billingAddress: {
        fullName: '',
        street: '',
        city: 'Dubai',
        apartment: '',
      },
      shipToDifferentAddress: false,
      paymentMethod: 'direct-bank-transfer',
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    control,
  } = form;

  const shipToDifferentAddress = watch('shipToDifferentAddress');
  const paymentMethod = watch('paymentMethod');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/checkout');
    }
    if (user) {
      setValue('email', user.email || '');
      const nameParts = user.name?.split(' ') || [];
      setValue('firstName', nameParts[0] || '');
      setValue('lastName', nameParts.slice(1).join(' ') || '');
      setValue('billingAddress.fullName', user.name || '');
    }
  }, [user, isUserLoading, router, setValue]);
  
  const onFormSubmit = (data: CheckoutFormValues) => {
    setFormData(data);
    setIsConfirming(true);
  };

  const handlePlaceOrder = async () => {
    if (!formData || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User or form data is missing.' });
      return;
    }
    setIsConfirming(false);
    setIsSubmitting(true);

    const finalShippingAddress = formData.shipToDifferentAddress
      ? formData.shippingAddress
      : formData.billingAddress;

    if (!finalShippingAddress) {
      toast({ variant: 'destructive', title: 'Error', description: 'Shipping address is required.' });
      setIsSubmitting(false);
      return;
    }

    try {
      const simplifiedCartItems = cartItems.map(item => {
        if (item.isBox) {
            return {
                id: item.id,
                isBox: true,
                name: (item as BoxCartItem).name,
                items: (item as BoxCartItem).items.map(p => ({ id: p.id, name: p.name, price: p.price, images: p.images, category: p.category, cutType: p.cutType })),
                price: item.price,
                quantity: item.quantity,
            };
        }
        const regularItem = item as CartItem;
        return {
            id: regularItem.id,
            isBox: false,
            product: {
                id: regularItem.product.id,
                name: regularItem.product.name,
                price: regularItem.product.price,
                images: regularItem.product.images,
                category: regularItem.product.category,
                cutType: regularItem.product.cutType,
            },
            quantity: regularItem.quantity,
            selectedUnit: regularItem.selectedUnit,
            price: regularItem.price,
            selectedStyle: regularItem.selectedStyle,
            selectedRub: regularItem.selectedRub,
        };
      });
      
      const orderInput = {
        userId: user.id,
        cartItems: simplifiedCartItems,
        total: cartTotal + shippingFee,
        shippingAddress: {
          fullName: `${formData.firstName} ${formData.lastName}`,
          street: finalShippingAddress.street,
          city: finalShippingAddress.city,
          state: finalShippingAddress.city,
          zipCode: '00000',
          country: 'United Arab Emirates',
        },
        paymentMethod: formData.paymentMethod,
        orderNotes: formData.orderNotes,
        customerEmail: user.email,
        customerPhoneNumber: user.telephone || formData.phone,
      };
      
      const { orderId } = await createOrder(orderInput);
      
      clearCart();
      router.push(`/order-confirmation?orderId=${orderId}`);

    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
          variant: 'destructive',
          title: 'Order Failed',
          description: error instanceof Error ? error.message : 'There was an error placing your order. Please check your details and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="container flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0 && !isSubmitting) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-headline">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">
            You can't checkout with an empty cart. Add some items first!
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-12">
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-12">
          <div className="lg:col-span-6">
            <h1 className="text-3xl font-bold font-headline mb-8">
              Billing details
            </h1>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-destructive text-sm">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-destructive text-sm">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street address *</Label>
                <Input
                  id="street"
                  {...register('billingAddress.street')}
                  placeholder="House number and street name"
                />
                {errors.billingAddress?.street && (
                  <p className="text-destructive text-sm">
                    {errors.billingAddress.street.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  {...register('billingAddress.apartment')}
                  placeholder="Apartment, suite, unit, etc. (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Town / City *</Label>
                <Controller
                  control={control}
                  name="billingAddress.city"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a city" />
                      </SelectTrigger>
                      <SelectContent>
                        {UAE_CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.billingAddress?.city && (
                  <p className="text-destructive text-sm">
                    {errors.billingAddress.city.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...register('phone')} />
                {errors.phone && (
                  <p className="text-destructive text-sm">
                    {errors.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address *</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="shipToDifferentAddress"
                  {...register('shipToDifferentAddress')}
                />
                <Label htmlFor="shipToDifferentAddress">
                  Ship to a different address?
                </Label>
              </div>
              {shipToDifferentAddress && (
                <Card className="p-6 mt-4 bg-muted/50">
                  <h3 className="text-xl font-bold font-headline mb-4">
                    Shipping Address
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping_street">Street address *</Label>
                      <Input
                        id="shipping_street"
                        {...register('shippingAddress.street')}
                        placeholder="House number and street name"
                      />
                      {errors.shippingAddress?.street && (
                        <p className="text-destructive text-sm">
                          {errors.shippingAddress.street.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        {...register('shippingAddress.apartment')}
                        placeholder="Apartment, suite, unit, etc. (optional)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping_city">Town / City *</Label>
                      <Controller
                        control={control}
                        name="shippingAddress.city"
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                            <SelectContent>
                              {UAE_CITIES.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.shippingAddress?.city && (
                        <p className="text-destructive text-sm">
                          {errors.shippingAddress.city.message}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}
              <div className="space-y-2 pt-4">
                <Label htmlFor="orderNotes">
                  Order notes (optional)
                </Label>
                <Textarea id="orderNotes" {...register('orderNotes')} placeholder="Notes about your order, e.g. special notes for delivery."/>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <Card className="sticky top-24 border-2 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-bold font-headline">Your order</h2>
                <div className="border-t border-b">
                  <div className="flex justify-between py-4 font-semibold">
                    <span>Product</span>
                    <span>Subtotal</span>
                  </div>
                  <Separator />
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between py-3 text-sm text-muted-foreground"
                    >
                      {item.isBox ? (
                        <p className="truncate pr-2">
                          {item.name} &times; {item.quantity}
                        </p>
                      ) : (
                        <p className="truncate pr-2">
                          {(item as CartItem).product.name} ({(item as CartItem).selectedUnit}) &times;{' '}
                          {item.quantity}
                        </p>
                      )}
                      <span>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between py-4 font-semibold">
                    <span>Subtotal</span>
                    <span>{currencySymbol}{cartTotal.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-4 font-semibold">
                    <span>Shipping</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      Flat rate: {currencySymbol}{shippingFee.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-4 font-bold text-lg">
                    <span>TOTAL</span>
                    <span>{currencySymbol}{(cartTotal + shippingFee).toFixed(2)}</span>
                  </div>
                </div>

                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-1"
                    >
                      <Label
                        htmlFor="direct-bank-transfer"
                        className="flex items-start space-x-2 p-4 rounded-md has-[:checked]:bg-muted/50 has-[:checked]:border border-transparent cursor-pointer"
                      >
                        <RadioGroupItem
                          value="direct-bank-transfer"
                          id="direct-bank-transfer"
                          className="mt-1"
                        />
                        <div className="grid gap-1.5">
                          <span className="font-semibold">Direct bank transfer</span>
                           {paymentMethod === 'direct-bank-transfer' && (
                            <div className="text-sm text-muted-foreground">
                              <p>Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.</p>
                              <div className="mt-2 p-3 bg-background rounded-md border text-xs">
                                <p><strong>Bank:</strong> Emirates NBD</p>
                                <p><strong>Account Name:</strong> PrimeCuts Hub LLC</p>
                                <p><strong>IBAN:</strong> AE12 3456 7890 1234 5678 901</p>
                              </div>
                            </div>
                           )}
                        </div>
                      </Label>
                      
                       <Label
                        htmlFor="card-payments"
                        className="flex items-start space-x-2 p-4 rounded-md has-[:checked]:bg-muted/50 has-[:checked]:border border-transparent cursor-pointer"
                      >
                        <RadioGroupItem
                          value="card-payments"
                          id="card-payments"
                          className="mt-1"
                        />
                        <div className="grid gap-1.5 w-full">
                            <span className="font-semibold">Card Payments</span>
                            {paymentMethod === 'card-payments' && (
                                <div className="pl-6 text-sm text-muted-foreground space-y-4">
                                    <p>Pay with your credit/debit card.</p>
                                    <div className="space-y-2">
                                        <Label htmlFor="cardNumber">Card Number</Label>
                                        <Input id="cardNumber" {...register('cardNumber')} placeholder="**** **** **** ****" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="expiryDate">Expiry</Label>
                                            <Input id="expiryDate" {...register('expiryDate')} placeholder="MM / YY" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cvc">CVC</Label>
                                            <Input id="cvc" {...register('cvc')} placeholder="CVC" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                      </Label>

                      <Label
                        htmlFor="cash-on-delivery"
                        className="flex items-start space-x-2 p-4 rounded-md has-[:checked]:bg-muted/50 has-[:checked]:border border-transparent cursor-pointer"
                      >
                        <RadioGroupItem
                          value="cash-on-delivery"
                          id="cash-on-delivery"
                          className="mt-1"
                        />
                        <div className="grid gap-1.5">
                           <span className="font-semibold">Cash on delivery</span>
                           {paymentMethod === 'cash-on-delivery' && (
                            <p className="text-sm text-muted-foreground">Pay with cash upon delivery.</p>
                           )}
                        </div>
                      </Label>

                      <Label
                        htmlFor="paypal"
                        className="flex items-start space-x-2 p-4 rounded-md has-[:checked]:bg-muted/50 has-[:checked]:border border-transparent cursor-pointer"
                      >
                        <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
                        <div className="grid gap-1.5 w-full">
                           <span className="font-semibold">PayPal</span>
                           {paymentMethod === 'paypal' && (
                             <div className="pl-6 text-sm text-muted-foreground space-y-2">
                               <p>You will be redirected to PayPal to complete your payment.</p>
                               <div className="space-y-2">
                                  <Label htmlFor="paypalEmail">PayPal Email</Label>
                                  <Input id="paypalEmail" type="email" {...register('paypalEmail')} placeholder="you@example.com"/>
                               </div>
                             </div>
                           )}
                        </div>
                      </Label>
                    </RadioGroup>
                  )}
                />

                <p className="text-xs text-muted-foreground pt-4">
                  Your personal data will be used to process your order,
                  support your experience throughout this website, and for
                  other purposes described in our privacy policy.
                </p>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={isSubmitting || isConfirming}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'PLACE ORDER'
                  )}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </form>
    </div>
    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please review your order details. Your total is <strong>{currencySymbol}{(cartTotal + shippingFee).toFixed(2)}</strong>. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFormData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlaceOrder}>
              Confirm Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
