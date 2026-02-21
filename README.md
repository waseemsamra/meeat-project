
# PrimeCuts Hub - Me'Eat

This is a NextJS-based e-commerce platform for premium meats, integrated with Firebase for data and authentication. It is designed to work seamlessly with a companion Android application.

## 🚀 Firebase Deployment (CRITICAL)

Before your Android app or web app can access the latest structure and security, you **must** deploy your configuration:

1.  **Login to Firebase**: `npx firebase login`
2.  **Deploy Firestore**: `npm run firebase:deploy` 
    - *Note: If asked "Would you like to delete these indexes?", type **y** and press Enter.*
3.  **Wait for Indexes**: After deployment, visit the [Firebase Console Indexes Page](https://console.firebase.google.com/project/studio-7561999182-35b19/firestore/indexes). Wait until all indexes (especially `orderNumber` and `notifications`) show as **Active**. This takes 3-5 minutes.

---

## 📱 Android Studio Configuration

### 1. Firebase Console Setup
- Select your project: `studio-7561999182-35b19`.
- Download `google-services.json` and place it in `app/`.

### 2. 🔔 Notification Synchronization (Personal + Broadcast)
To show both personal messages and app-wide broadcasts, your mobile app **must** query the root `/notifications` collection.

**CRITICAL SYNC LOGIC**:
- **Collection**: Always use the root `/notifications` collection.
- **Broadcast Filter**: Document has `userId == "all"` (lowercase) or `userId == "broadcast"`.
- **Unique IDs**: Web-generated broadcasts use the prefix `broadcast_`.
- **Field Mapping**: The dashboard sends `title` AND `name`, and `body` AND `info`.
- **Scheduled Time**: Saved as an **ISO 8601 String**.

**Kotlin Listener Example**:
```kotlin
val now = ISO8601Utils.format(Date()) 

db.collection("notifications")
    .whereIn("userId", listOf(currentUserId, "all", "broadcast")) 
    .whereLessThanOrEqualTo("scheduledAt", now)      
    .orderBy("scheduledAt", Query.Direction.DESCENDING)
    .addSnapshotListener { snapshots, e ->
        if (e != null) return@addSnapshotListener
        // Map fields 'name' or 'title' for heading
        // Map fields 'info' or 'body' for content
    }
```

### 3. 📦 Orders (Mobile Synchronization Checklist)
**COLLECTION NAME**: Ensure you are writing to the lower-case `orders` collection.

**🔔 IMPORTANT: MANUAL NOTIFICATIONS**
If the Android app writes an order directly to Firestore, it should also create a document in the root `/notifications` collection:
- `userId`: The user's UID
- `title`: "Order Received"
- `name`: "Order Received" (for legacy sync)
- `body`: "Your order #... has been received."
- `info`: "Your order #... has been received." (for legacy sync)
- `type`: "order_update"
- `createdAt`: current ISO timestamp
- `scheduledAt`: current ISO timestamp
- `read`: false

---

## Architecture Notes
- **Broadcast System**: Use `userId == "all"` for global announcements.
- **Multi-Field Sync**: The dashboard updates `Status`, `status`, and `fulfillmentStatus` simultaneously.
