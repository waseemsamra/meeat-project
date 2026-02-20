
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

### 3. 📦 Orders (Root Collection)
To ensure orders show up in the Admin Dashboard, the Android app **must** write to the root `orders` collection.

**Kotlin Save Order Example**:
```kotlin
val orderData = hashMapOf(
    "userId" to currentUserId,
    "total" to 150.0,
    "orderType" to "ONLINE", // Required for filtering
    "fulfillmentStatus" to "processing",
    "createdAt" to FieldValue.serverTimestamp(),
    "orderItemIds" to listOf(...) // Simplified list of items
)

db.collection("orders").add(orderData)
```

### 4. 🔍 Mobile Sync Checklist
1.  **Collection Path**: Verify you are writing to `db.collection("orders")` and NOT a subcollection.
2.  **Required Fields**: Ensure you include `userId`, `orderType`, and `createdAt`.
3.  **Indexes**: If you see an error in your Android logs about a missing index, click the link in the log to create it.

## Architecture Notes
- **Shared Data**: Both platforms use the same Firestore root collections (`/products`, `/categories`, `/orders`, etc.).
- **Authorization Independence**: The `userId` field is denormalized into order items and orders to allow mobile clients to perform fast, secure queries.
