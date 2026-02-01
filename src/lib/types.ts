

export type Role = 'CUSTOMER' | 'CONTENT_MANAGER' | 'ADMIN' | 'STAFF' | 'ACCOUNTANT';

export type User = {
  id: string;
  email: string;
  name: string | null;
  groupIds?: string[];
  customerType: 'ONLINE' | 'LOCAL';
  accountStatus: 'active' | 'blocked';
  createdAt: string;
  updatedAt: string;
  code?: string;
  creditLimit?: number;
  currency?: string;
  billingAddress?: string;
  deliveryAddress?: string;
  telephone?: string;
  accountsReceivable?: number;
  availableCredit?: number;
  country?: string;
  // Denormalized for convenience
  groups?: Group[];
  roles?: Role[];
};

export type Group = {
    id: string;
    name: string;
    roles: Role[];
}

export type InventoryLot = {
  id: string;
  productId: string;
  vendorId: string;
  unit: string;
  quantity: number;
  qtyInHand?: number;
  qtyOrdered?: number;
  purchasePrice: number;
  shipmentId: string;
  purchaseDate: string; // ISO string
  shipmentDate: string; // ISO string
};

export type MediaItem = {
  type: 'image' | 'video';
  url: string;
};

export type LocalizedString = {
    [key: string]: string | undefined;
    en?: string;
    es?: string;
    fr?: string;
    ar?: string;
    ur?: string;
}

export type Product = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString | null;
  images: string[];
  videos?: string[];
  category: string;
  cutType: string;
  cutTypeId: string;
  price: number;
  perKgPrice?: number;
  cutWeight?: string;
  styles: string[];
  rubs: string[];
  featured: boolean;
  deal?: boolean;
  bestseller?: boolean;
  discount?: number;
  gradeQuality: string;
  countryOfOrigin: string;
  temperature: 'Fresh' | 'Frozen';
  points?: number;
  createdAt: string;
  updatedAt:string;
};

export type Order = {
  id: string;
  userId: string;
  orderType: 'ONLINE' | 'LOCAL';
  orderItemIds: {
    id: string;
    productId: string;
    quantity: number;
    price: number;
    selectedUnit: string;
    product?: { name: LocalizedString };
    selectedStyle?: string;
    selectedRub?: string;
  }[];
  total: number;
  shippingAddress?: Omit<Address, "id" | "userId" | "isDefault"> | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'unpaid';
  paymentMethod?: 'direct-bank-transfer' | 'card-payments' | 'cash-on-delivery' | 'paypal' | null;
  fulfillmentStatus: 'processing' | 'shipped' | 'delivered' | 'unfulfilled' | 'ready_for_pickup';
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
  qtyToDeliver?: number;
  shipdayOrderId?: number;
  // Denormalized for convenience
  customer?: User;
  description?: string | null;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number; // Snapshot of price at time of order
  selectedUnit: string | null;
  selectedStyle?: string | null;
  selectedRub?: string | null;
  // Denormalized for convenience
  product?: { name: LocalizedString; images: string[]; category: string; cutType: string; slug: string; };
};

export type Address = {
  id: string;
  userId: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
};

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  selectedUnit: string;
  price: number;
  selectedStyle: string;
  selectedRub: string;
  isBox: false;
};

export type BoxCartItem = {
    id: string;
    isBox: true;
    name: string;
    items: Product[];
    price: number; // The fixed price of the box
    quantity: number;
}

export type AnyCartItem = CartItem | BoxCartItem;

export interface Attribute {
  id: string;
  name: LocalizedString;
}

export interface Language extends Attribute {
    code: string;
}

export interface Category extends Attribute {
    description?: string;
}

export interface CutType extends Attribute {
    slug: string;
    categoryId: string;
    imageUrl?: string;
    description: LocalizedString;
}

export interface Grade extends Attribute {}

export interface Country extends Attribute {
  code: string;
}

export interface Currency {
    id: string;
    name: string;
    code: string;
    symbol: string;
    isDefault?: boolean;
    conversionRate?: number;
    status?: 'enabled' | 'disabled';
}

export interface MeasurementUnit {
    id: string;
    name: string;
    symbol: string;
}

export interface Style {
    id: string;
    name: string;
}

export interface Rub {
    id: string;
    name: string;
}

export interface Temperature {
    id: string;
    name: string;
}


export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phoneNumber?: string;
  address?: string;
  country: string;
  type: 'Local Supplier' | 'Foreign Supplier';
}

export interface DeliveryChallan {
  id: string;
  orderId: string;
  challanDate: string;
  dispatchedBy: string;
  vehicleNumber?: string;
  status: 'dispatched' | 'in_transit' | 'delivered';
  name: string; // For compatibility with AttributeManagementPage
  description?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'unpaid';
  name: string; // For compatibility with AttributeManagementPage
  order?: Order;
}

export type PaymentType = 'Cash' | 'Cheque';

export interface Payment {
    id: string;
    userId: string;
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentType: PaymentType;
    name: string; // For compatibility
    payeeName?: string;
    bankName?: string;
    chequeNumber?: string;
}

export interface CreditNote {
    id: string;
    userId: string;
    amount: number;
    reason: string;
    issueDate: string;
    name?: string; // For compatibility
}

export interface DebitNote {
    id: string;
    vendorId: string;
    amount: number;
    reason: string;
    issueDate: string;
    name?: string; // For compatibility
}

export interface HomepageSection {
    id: string;
    title: string;
    imageUrl: string;
    link: string;
    order: number;
    category: string;
    countryOfOrigin?: string;
    name?: string;
}

export interface HeroSettings {
    imageUrl?: string | null;
    title?: LocalizedString | null;
    subtitle?: LocalizedString | null;
    buttonText?: LocalizedString | null;
    buttonLink?: string | null;
    titleAlignment?: 'left' | 'center' | 'right';
    subtitleAlignment?: 'left' | 'center' | 'right';
    buttonAlignment?: 'left' | 'center' | 'right';
}

export interface PromiseSettings {
    grassFedPromise?: LocalizedString | null;
    freeRangePromise?: LocalizedString | null;
    ethicallyRearedPromise?: LocalizedString | null;
    sustainableFarmingPromise?: LocalizedString | null;
    description?: LocalizedString | null;
}

export interface BoxOption {
  id: string;
  name: string;
  people: string;
  weight: string;
  price: number;
  imageId: string;
  description: string;
  order: number;
  points: number;
}

export type SocialPostPlatform = 'Facebook' | 'Instagram';

export interface SocialPost {
    id: string;
    productId: string;
    productName: string;
    postText: string;
    imageUrl: string;
    platform: SocialPostPlatform;
    createdAt: string;
}

export interface ChooseBoxStep {
  id: string;
  order: number;
  title: LocalizedString;
  description: LocalizedString;
  imageId: string;
  imageHint?: string;
  name: string; // for compatibility with AttributeManagementPage
}

export interface ExploreRangeItem {
  id: string;
  order: number;
  name: LocalizedString;
  imageUrl: string;
  link: string;
}

export interface ShipdayOrderDetails {
    orderStatus?: string;
    deliverTo?: {
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    pickupFrom?: {
        name?: string;
        address?: string;
        phone?: string;
    };
    delivery?: {
        placementTime?: string;
        assignedTime?: string;
        requestedPickupTime?: string;
        requestedDeliveryTime?: string;
        eta?: string;
        actualPickupTime?: string;
        actualDeliveryTime?: string;
        deliveryCompleteTime?: string;
        orderCompletionTime?: number; // In minutes
        driver?: { name?: string; };
        deliveryInstruction?: string;
    };
    payment?: {
        paymentMethod?: string;
    };
    deliveryLocation?: {
        latitude?: number;
        longitude?: number;
    };
    pod?: string;
}

export interface MeasuringGuideSettings {
    imageUrl?: string | null;
    description?: LocalizedString | null;
}
    
