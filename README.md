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

## Firebase Deployment

Before your Android app or web app can access the latest structure and security, you must deploy your configuration:

1.  **Login to Firebase**: `npx firebase login`
2.  **Deploy Security Rules**: `npm run firebase:deploy:rules`
3.  **Deploy Firestore Indexes**: `npm run firebase:deploy:indexes`

---

## Android Studio Configuration

To connect your Kotlin Android app to the same data source, follow these steps:

### 1. Firebase Console Setup
- Go to the [Firebase Console](https://console.firebase.google.com/).
- Select your project: `studio-7561999182-35b19`.
- If you haven't added your Android app yet, click **Add App** > **Android**.
- Register the app with your Android Package Name (e.g., `com.meeat.app`).
- **Download `google-services.json`**.

### 2. Android Project Setup
- Copy `google-services.json` into your Android project's `app/` folder.
- **Project-level `build.gradle`** (or `build.gradle.kts`):
  ```kotlin
  plugins {
    id("com.google.gms.google-services") version "4.4.2" apply false
  }
  ```
- **App-level `build.gradle`** (or `build.gradle.kts`):
  ```kotlin
  plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
  }

  dependencies {
    implementation(platform("com.google.firebase:firebase-bom:33.1.2"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
  }
  ```

### 3. Troubleshooting Android Access
If your app cannot access data, check the following:
- **SHA-1 Fingerprint**: Go to Project Settings in the Firebase Console and add your debug (and release) SHA-1 certificate fingerprints. This is required for many Firebase features.
- **Package Name**: Ensure the package name in `google-services.json` exactly matches your `applicationId` in `build.gradle`.
- **Sync Project**: Always "Sync Project with Gradle Files" after adding the JSON file.
- **Internet Permission**: Ensure `<uses-permission android:name="android.permission.INTERNET" />` is in your `AndroidManifest.xml`.

### 4. Fetching Data (Kotlin Examples)

**Fetch Featured Products**:
```kotlin
val db = Firebase.firestore
db.collection("products")
    .whereEqualTo("featured", true)
    .get()
    .addOnSuccessListener { documents ->
        for (document in documents) {
            Log.d("Firestore", "${document.id} => ${document.data}")
        }
    }
```

**Fetch Today's Deals**:
```kotlin
val db = Firebase.firestore
db.collection("products")
    .whereEqualTo("deal", true)
    .get()
    .addOnSuccessListener { documents ->
        // Handle deals
    }
```

**Fetch User Orders (Collection Group)**:
Ensure your user is signed in first.
```kotlin
val db = Firebase.firestore
db.collectionGroup("orders")
    .whereEqualTo("userId", Firebase.auth.currentUser?.uid)
    .orderBy("createdAt", Query.Direction.DESCENDING)
    .get()
    .addOnSuccessListener { documents ->
        // Loop through and display the user's order history
    }
```

## Architecture Notes
- **Shared Data**: Both platforms use the same Firestore root collections (`/products`, `/categories`, etc.).
- **Authorization Independence**: The `userId` field is denormalized into order items and orders to allow mobile clients to perform fast, secure queries without complex server-side joins.
