
# PrimeCuts Hub - Me'Eat

This is a NextJS-based e-commerce platform for premium meats, integrated with Firebase for data and authentication. It is designed to work seamlessly with a companion Android application.

## Getting Started

To connect this project to your GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit from Firebase Studio"
git branch -M main
git remote add origin https://github.com/waseemsamra/meeat-project.git
git push -u origin main
```

## 🚀 Firebase Deployment (CRITICAL)

Before your Android app or web app can access the latest structure and security, you **must** deploy your configuration:

1.  **Login to Firebase**: `npx firebase login`
2.  **Deploy Firestore**: `npm run firebase:deploy` (Deploys Rules and Indexes)

---

## 📱 Android Studio Configuration

### 1. Firebase Console Setup
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Select your project: `studio-7561999182-35b19`.
- Register the app with your Android Package Name (e.g., `com.meeat.app`).
- **Download `google-services.json`** and place it in `app/`.

### 2. ⚠️ BREAKING CHANGE: Handling Localized Data
We have enabled multi-language support. Fields like `name` and `description` are no longer strings; they are Maps in Firestore. If your Android app tries to read them as strings, it will fail to show data.

**Kotlin Data Model Example**:
```kotlin
data class Product(
    val id: String = "",
    val name: Map<String, String> = emptyMap(),
    val description: Map<String, String> = emptyMap(),
    val price: Double = 0.0,
    val images: List<String> = emptyList()
) {
    // Helper to get English name
    fun getEnName(): String = name["en"] ?: ""
}
```

### 3. 📦 Order History (Root Collection)
Orders are stored in a root collection called `orders`. Each order document contains a `userId` field matching the user's Firebase UID.

**Kotlin Query Example**:
```kotlin
val ordersRef = db.collection("orders")
val query = ordersRef.whereEqualTo("userId", currentUserId)
    .orderBy("createdAt", Query.Direction.DESCENDING)

query.get().addOnSuccessListener { documents ->
    for (document in documents) {
        val order = document.toObject(Order::class.java)
        // Add to your list
    }
}
```

### 4. Handling AWS S3 Images
The database stores relative paths. Prepend the base URL in your UI code:
**Base URL**: `https://primemeeat.s3.us-east-1.amazonaws.com`

```kotlin
fun getImageUrl(path: String?): String {
    val baseUrl = "https://primemeeat.s3.us-east-1.amazonaws.com"
    if (path.isNullOrEmpty()) return "https://picsum.photos/seed/placeholder/600/400"
    return if (path.startsWith("/")) "$baseUrl$path" else "$baseUrl/$path"
}
```

### 5. 🔍 Checklist for Data Visibility
1.  **Deploy Check**: Did you run `npm run firebase:deploy`? (This applies the "allow all" testing rules)
2.  **SHA-1 Fingerprint**: Add your debug SHA-1 to the Firebase Console. This is mandatory for Firestore and Auth.
3.  **Data Casting**: Ensure you are not casting `name` or `description` directly to `String`. Cast them to `Map<String, String>`.

## Architecture Notes
- **Shared Data**: Both platforms use the same Firestore root collections (`/products`, `/categories`, `/orders`, etc.).
- **Authorization Independence**: The `userId` field is denormalized into order items and orders to allow mobile clients to perform fast, secure queries.
