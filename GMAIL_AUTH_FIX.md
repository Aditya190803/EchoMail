# 🔧 Gmail Authentication Fix Guide

## 🚨 Issue: OAuth Token Expired

The Gmail API authentication has failed because the OAuth access token has expired. This is normal behavior for Google OAuth tokens which have a limited lifespan.

## ✅ SOLUTION: Refresh Authentication

### **Step 1: Sign Out and Sign In Again**

1. Go to: [http://localhost:3000/auth-test](http://localhost:3000/auth-test)
2. Click **"Refresh Authentication"** or **"Sign Out"**
3. Then click **"Sign In with Google"**
4. Re-authorize the application when prompted

### **Step 2: Test Gmail Access**

1. After signing in, click **"Test Gmail API Access"**
2. You should see: ✅ Gmail API access working!

### **Step 3: Test Email Sending**

1. Go to: [http://localhost:3000/test-email](http://localhost:3000/test-email)
2. Click **"Test Email Sending + Database Save"**
3. This should now work and save to Supabase

## 🔄 What We Fixed

### **1. Enhanced NextAuth Configuration**
- Added automatic token refresh functionality
- Added `access_type: "offline"` and `prompt: "consent"` 
- Implemented refresh token handling
- Added token expiration tracking

### **2. Better Error Handling**
- API now saves campaigns to Supabase even when emails fail
- Added detailed error logging
- Enhanced status tracking (completed/failed/partial)

### **3. Improved Testing**
- Updated auth test page to show token errors
- Added comprehensive database testing
- Better error messages and debugging

## 🧪 Test Flow

1. **Auth Test**: [http://localhost:3000/auth-test](http://localhost:3000/auth-test)
2. **Database Test**: [http://localhost:3000/test-email](http://localhost:3000/test-email)
3. **Full Flow**: [http://localhost:3000/compose](http://localhost:3000/compose)

## 📝 Expected Results After Fix

### **Email Sending Should Work:**
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

### **Campaign Should Save to Supabase:**
```json
{
  "id": "uuid",
  "subject": "Test Email",
  "recipients": 1,
  "sent": 1,
  "failed": 0,
  "status": "completed"
}
```

### **Dashboard Should Update in Real-time:**
- Campaign appears immediately on dashboard
- Analytics update automatically
- No page refresh needed

## 🔧 If Issues Persist

1. **Clear browser data** for localhost:3000
2. **Check Google Cloud Console** - ensure OAuth app is configured correctly
3. **Verify environment variables** in `.env` file
4. **Check browser console** for additional error messages

The authentication system now has proper token refresh, so this issue should not occur again once you re-authenticate!
