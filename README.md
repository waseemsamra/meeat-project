
# PrimeCuts Hub - Me'Eat

This is a NextJS-based e-commerce platform for premium meats, integrated with Firebase for data and authentication. It is designed to work seamlessly with a companion Android application.

## 🚀 Firebase Deployment (CRITICAL)

Before your Android app or web app can access the latest structure and security, you **must** deploy your configuration:

1.  **Login to Firebase**: `npx firebase login`
2.  **Deploy Firestore**: `npm run firebase:deploy` 
    - *Note: If asked "Would you like to delete these indexes?", type **y** and press Enter.*
3.  **Wait for Indexes**: After deployment, visit the [Firebase Console Indexes Page](https://console.firebase.google.com/project/studio-7561999182-35b19/firestore/indexes). Wait until `orderNumber` and `createdAt` show as **Active**. This takes 3-5 minutes.

---

## 📱 Android Studio Configuration

### 1. Firebase Console Setup
- Select your project: `studio-7561999182-35b19`.
- Download `google-services.json` and place it in `app/`.

### 2. 🔔 Notification Synchronization
To show notifications in your Android app, query the root `/notifications` collection.

**Kotlin Listener Example**:
```kotlin
// Fetch both personal AND broadcast notifications
db.collection("notifications")
    .whereIn("userId", listOf(currentUserId, "ALL"))
    .orderBy("createdAt", Query.Direction.DESCENDING)
    .addSnapshotListener { snapshots, e ->
        // Update your UI tray
    }
```

### 3. 📦 Orders (Mobile Synchronization Checklist)
The Android app **must** follow this schema to sync with the Admin Dashboard.

**CRITICAL: STOP WRITING TO SUBCOLLECTIONS**
The Android app should ONLY write to the top-level `/orders` collection. Do NOT write to `/users/{userId}/orders`.

**CRITICAL FIELDS FOR MOBILE SYNC**:
- `userId`: String (Firebase Auth UID). **REQUIRED** for dashboard lookup.
- `createdAt`: ISO String or Timestamp.
- `orderType`: "ONLINE" (String). 
- `fulfillmentStatus`: "processing" (String, lowercase).
- `Status`: "Processing" (String, Capitalized). **REQUIRED** for dashboard UI.
- `total`: Number (Double). Avoid currency symbols like "DH" in raw data.

---

## Architecture Notes
- **Broadcast System**: Notifications with `userId == "ALL"` are global announcements.
- **Multi-Field Sync**: The dashboard updates `Status`, `status`, and `fulfillmentStatus` simultaneously to ensure compatibility with all mobile filter versions.
