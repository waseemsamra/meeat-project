
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
To ensure orders show up correctly in the Admin Dashboard, the Android app **must** follow this schema when writing to the root `orders` collection.

**CRITICAL FIELDS**:
- `userId`: String (Firebase Auth UID). Required for filtering in the "My Orders" area.
- `createdAt`: ISO String or Timestamp. Required for sorting.
- `orderType`: "ONLINE" (String). Required for filtering.
- `fulfillmentStatus`: "processing" (String).
- `Status`: "Processing" (Capitalized, used for legacy mobile filtering).
- `total`: Number (Double). Avoid putting currency symbols in the data.
- `orderItemIds`: Array of maps containing `productId`, `quantity`, and `price`.

**Kotlin Save Order Example**:
```kotlin
val orderData = hashMapOf(
    "userId" to currentUserId, // CRITICAL: Link to authenticated user
    "total" to 135.0, // Use number, not string
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

db.collection("orders").add(orderData)
```

### 4. 🔍 Troubleshooting Mobile Sync
1.  **Missing Orders**: If orders don't show up, check that the `userId` field exactly matches the UID of the logged-in user in the web app.
2.  **Status Sync**: The Web Admin Dashboard updates both `fulfillmentStatus` (lowercase) and `Status` (Capitalized). Ensure your mobile app filters use one of these.
3.  **Sorting Issues**: Ensure `createdAt` is a valid ISO date string.
4.  **Permissions**: If you get a "permission-denied" error, ensure you have run `npm run firebase:deploy`.

## Architecture Notes
- **Shared Data**: Both platforms use the same Firestore root collections (`/products`, `/categories`, `/orders`, etc.).
- **Authorization Independence**: The `userId` field is denormalized into order items and orders to allow mobile clients to perform fast, secure queries.
