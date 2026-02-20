
# PrimeCuts Hub - Me'Eat

This is a NextJS-based e-commerce platform for premium meats, integrated with Firebase for data and authentication. It is designed to work seamlessly with a companion Android application.

## 🚀 Firebase Deployment (CRITICAL)

Before your Android app or web app can access the latest structure and security, you **must** deploy your configuration:

1.  **Login to Firebase**: `npx firebase login`
2.  **Deploy Firestore**: `npm run firebase:deploy` 
    - *Note: If asked "Would you like to delete these indexes?", type **y** and press Enter.*

---

## 📱 Android Studio Configuration

### 1. Firebase Console Setup
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Select your project: `studio-7561999182-35b19`.
- Register the app with your Android Package Name (e.g., `com.meeat.app`).
- **Download `google-services.json`** and place it in `app/`.

### 2. ⚠️ IMPORTANT: Handling Localized Data
We have enabled multi-language support. Fields like `name` and `description` are now **Maps** in Firestore, not Strings. 

**Kotlin Data Model Example**:
```kotlin
data class Product(
    val id: String = "",
    val name: Map<String, String> = emptyMap(),
    val description: Map<String, String> = emptyMap(),
    val price: Double = 0.0,
    val images: List<String> = emptyList()
) {
    fun getEnName(): String = name["en"] ?: ""
}
```

### 3. 📦 Orders (Mobile Synchronization Checklist)
To ensure orders show up correctly in the Admin Dashboard and sync back to the mobile client, the Android app **must** follow this schema.

**CRITICAL: STOP WRITING TO SUBCOLLECTIONS**
The Android app should ONLY write to the top-level `/orders` collection. Do NOT write to `/users/{userId}/orders`. Writing to both locations causes sync delays.

**CRITICAL FIELDS FOR MOBILE SYNC**:
- `userId`: String (Firebase Auth UID). **REQUIRED** for the mobile app to find its own orders.
- `createdAt`: ISO String or Timestamp. Required for sorting.
- `orderType`: "ONLINE" (String). 
- `fulfillmentStatus`: "processing" (String, lowercase).
- `Status`: "Processing" (String, Capitalized). **REQUIRED** for current mobile filters.
- `total`: Number (Double). Avoid putting currency symbols like "DH" inside the data; use a number.
- `orderItemIds`: Array of maps containing `productId`, `quantity`, and `price`.

**Kotlin Save Order Example**:
```kotlin
val orderData = hashMapOf(
    "userId" to currentUserId, // CRITICAL: Link to authenticated user UID
    "total" to 135.0, // Use number, not string like "DH135"
    "orderType" to "ONLINE",
    "fulfillmentStatus" to "processing",
    "Status" to "Processing",
    "paymentStatus" to "pending",
    "createdAt" to SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'").format(Date()),
    "orderItemIds" to listOf(
        hashMapOf(
            "productId" to "product_id_here",
            "quantity" to 1,
            "price" to 125.0
        )
    )
)

// ONLY WRITE TO THE ROOT COLLECTION
db.collection("orders").add(orderData)
```

### 4. 🔍 Troubleshooting Mobile Sync
1.  **Duplicate Orders**: If orders appear twice, your Android app is likely writing to both `/orders` and `/users/{uid}/orders`. Delete the subcollection write.
2.  **Missing Orders**: Check that the `userId` field exactly matches the UID of the logged-in user.
3.  **Status Sync**: The Dashboard updates both `fulfillmentStatus` (lowercase) and `Status` (Capitalized). Ensure your mobile app filters use one of these.

## Architecture Notes
- **Shared Data**: Both platforms use the same Firestore root collections (`/products`, `/categories`, `/orders`, etc.).
- **Authorization Independence**: The `userId` field is denormalized into order items and orders to allow mobile clients to perform fast, secure queries.
