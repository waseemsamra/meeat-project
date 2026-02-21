
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
- **Personal Messages**: Document has `userId == currentUserId`.
- **Broadcast Messages**: Document has `userId == "ALL"` (Exact, uppercase string).
- **Scheduled Time**: The dashboard saves `scheduledAt` as an **ISO 8601 String**.

**Kotlin Listener Example**:
```kotlin
val now = ISO8601Utils.format(Date()) // Format current time as ISO 8601 string

db.collection("notifications")
    .whereIn("userId", listOf(currentUserId, "ALL")) // Fetch user-specific AND broadcast messages
    .whereLessThanOrEqualTo("scheduledAt", now)      // Only show if the scheduled time has arrived/passed
    .orderBy("scheduledAt", Query.Direction.DESCENDING)
    .addSnapshotListener { snapshots, e ->
        if (e != null) {
            Log.w("NotificationSync", "Listen failed.", e)
            return@addSnapshotListener
        }
        // Update your notification tray UI
    }
```

### 3. 📦 Orders (Mobile Synchronization Checklist)
The Android app **must** follow this schema to sync with the Admin Dashboard.

**COLLECTION NAME**: Ensure you are writing to the lower-case `orders` collection.

**CRITICAL FIELDS FOR MOBILE SYNC**:
- `userId`: String (Firebase Auth UID). **REQUIRED** for dashboard lookup.
- `orderNumber`: String (e.g., "ORD-12345").
- `createdAt`: ISO 8601 String OR Firestore Timestamp. (ISO String preferred).
- `orderType`: "ONLINE" (String). 
- `fulfillmentStatus`: "processing" (String, lowercase).
- `Status`: "Processing" (String, Capitalized). **REQUIRED** for legacy dashboard UI.
- `total`: Number (Double). Avoid currency symbols like "DH" in raw data.

**🔔 IMPORTANT: MANUAL NOTIFICATIONS**
If the Android app writes an order directly to Firestore, it should also create a document in `/notifications` so the dashboard and user are alerted:
- `userId`: The user's UID
- `title`: "Order Received"
- `body`: "Your order #... has been received."
- `type`: "order_update"
- `createdAt`: current ISO timestamp
- `scheduledAt`: current ISO timestamp
- `read`: false

---

## Architecture Notes
- **Broadcast System**: Notifications with `userId == "ALL"` are global announcements.
- **Multi-Field Sync**: The dashboard updates `Status`, `status`, and `fulfillmentStatus` simultaneously to ensure compatibility with all mobile filter versions.
