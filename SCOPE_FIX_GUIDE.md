# 🔧 Gmail API Scope Fix - CRITICAL UPDATE

## 🚨 ISSUE IDENTIFIED: Insufficient OAuth Scopes

The Gmail API is rejecting requests because the current OAuth token doesn't have sufficient permissions (scopes).

## ✅ WHAT WAS FIXED

### **Updated OAuth Scopes:**
- **Before**: `gmail.send` only
- **After**: `gmail.send` + `gmail.readonly`

### **New Scope Configuration:**
```typescript
scope: "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
```

## 🔄 IMMEDIATE ACTION REQUIRED

### **Step 1: Complete Sign Out**
1. Go to: [http://localhost:3000/auth-test](http://localhost:3000/auth-test)
2. Click **"Sign Out"** (important: must fully sign out)
3. **Clear browser data** for localhost:3000 (cookies, storage)

### **Step 2: Fresh Authentication**
1. Click **"Sign In with Google"**
2. **Important**: Google will ask for **additional permissions**
3. **Grant all permissions** when prompted (including Gmail access)
4. Complete the authorization flow

### **Step 3: Verify New Scopes**
1. After signing in, click **"Test Gmail API Access"**
2. You should see:
   ```
   ✅ Gmail Profile Access: SUCCESS
   ✅ Token Info Retrieved:
      Scopes: [should include gmail.readonly and gmail.send]
   ```

## 📋 VERIFICATION CHECKLIST

### **Expected Success Results:**

#### **1. Auth Test Page:**
```
✅ Gmail Profile Access: SUCCESS
   Email: your@email.com
   Messages Total: [number]

✅ Token Info Retrieved:
   Scopes: openid email profile gmail.send gmail.readonly
   Expires in: [seconds]
```

#### **2. Email Sending Test:**
```json
{
  "results": [
    {
      "email": "your@email.com", 
      "status": "success"
    }
  ]
}
```

#### **3. Campaign Saved to Supabase:**
```
✅ Campaign saved to Supabase: {
  "id": "uuid",
  "subject": "Test Email",
  "status": "completed"
}
```

## 🛠️ TROUBLESHOOTING

### **If Still Getting Scope Errors:**

1. **Clear all browser data** for localhost:3000
2. **Sign out from Google completely** (google.com)
3. **Restart browser**
4. **Try authentication again**

### **If Google Doesn't Ask for New Permissions:**

1. Go to: [Google Account Permissions](https://myaccount.google.com/permissions)
2. **Remove** the EchoMail application
3. **Try authentication again** - Google will ask for all permissions

### **Alternative: Use Incognito/Private Window:**

1. Open **incognito/private browser window**
2. Go to: http://localhost:3000/auth-test
3. **Sign in fresh** (will ask for all permissions)

## 🎯 REQUIRED SCOPES EXPLANATION

- **`openid email profile`**: Basic user information
- **`gmail.send`**: Send emails via Gmail API
- **`gmail.readonly`**: Read Gmail profile and basic info (needed for testing API access)

## ✅ AFTER SUCCESSFUL RE-AUTH

Once you see "Gmail Profile Access: SUCCESS", the application will have:

1. **Full Gmail API access** for sending emails
2. **Proper scope validation** for all features
3. **Real-time Supabase integration** working
4. **Mobile-friendly interface** fully functional

The scope fix is now complete - you just need to re-authenticate with the new permissions!
