# Firebase Setup Instructions

## Fixing "auth/configuration-not-found" Error

This error occurs when Firebase Authentication is not properly configured. Follow these steps:

### Step 1: Enable Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `vrcapstonrit213123`
3. Click on **Authentication** in the left sidebar
4. Click **Get Started** (if you haven't enabled it yet)
5. Go to the **Sign-in method** tab
6. Click on **Email/Password**
7. **Enable** the Email/Password provider
8. Click **Save**

### Step 2: Verify API Key Permissions

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Make sure your web app is listed
4. Verify the API key matches the one in `script.js`

### Step 3: Check Firestore Rules

1. Go to **Firestore Database** in Firebase Console
2. Click on **Rules** tab
3. Make sure you have rules that allow read/write (for development):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click **Publish**

### Step 4: Verify Firebase Config

Check that your `script.js` has the correct configuration:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD24pVQfAdnLizfcDt7WMi_YHG8cfEweGU",
    authDomain: "vrcapstonrit213123.firebaseapp.com",
    projectId: "vrcapstonrit213123",
    storageBucket: "vrcapstonrit213123.firebasestorage.app",
    messagingSenderId: "560615276492",
    appId: "1:560615276492:web:4b44fe0a89cbb05afa2769",
    measurementId: "G-M22TYYTYB0"
}
```

### Step 5: Test Authentication

After enabling Email/Password authentication:
1. Refresh your application
2. Try to sign up with a new email
3. Check the browser console for any errors

### Common Issues:

- **400 Bad Request**: Usually means Email/Password authentication is not enabled
- **auth/configuration-not-found**: Authentication service is not enabled in Firebase
- **auth/operation-not-allowed**: Email/Password provider is disabled

### Need Help?

If you continue to have issues:
1. Check Firebase Console > Authentication > Sign-in method
2. Verify Email/Password is enabled
3. Check browser console for specific error codes
4. Make sure you're using the correct Firebase project

