# Yoombaa Mobile vs Web Version Comparison

## Overview

This document compares the Yoombaa Web version (Next.js) with the Mobile version (React Native/Expo) to identify missing features, differences in implementation, and gaps that need to be addressed.

---

## 1. Technology Stack Comparison

| Aspect | Web Version | Mobile Version |
|--------|-------------|----------------|
| **Framework** | Next.js 14 (App Router) | React Native + Expo |
| **Styling** | Tailwind CSS | React Native StyleSheet |
| **Icons** | Lucide React | @expo/vector-icons (Feather) |
| **Backend** | Firebase (Auth, Firestore, Storage) | Supabase (Auth, Database, Storage) |
| **Payment** | Paystack | PesaPal + M-Pesa |
| **Notifications** | WhatsApp + Email | Push Notifications + In-App |
| **Analytics** | Firebase Analytics | (Not implemented) |

---

## 2. Web Components vs Mobile Screens

### Web Components (37 total in `/components/`)

| Web Component | Mobile Equivalent | Status |
|---------------|-------------------|--------|
| `AdminDashboard.jsx` | ❌ Not needed | N/A (Backend only) |
| `AgentAssets.jsx` | `AgentAssetsScreen.js` | ✅ **Implemented** |
| `AgentDashboard.jsx` | `AgentLeadsScreen.js` | ⚠️ **Partial** - Missing some features |
| `AgentDetailPage.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `AgentInquiryManagement.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `AgentProfile.jsx` | `AgentProfileEditScreen.js` | ✅ **Implemented** |
| `AgentRegistration.jsx` | `SignUpScreen.js` | ✅ **Implemented** |
| `AgentReviews.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `AgentRewards.jsx` | `AgentRewardsScreen.js` | ✅ **Implemented** |
| `AgentsListingPage.jsx` | ❌ Missing | ❌ **Not Implemented** (Tenant view of agents) |
| `DebugPanel.jsx` | ❌ Not needed | N/A (Dev only) |
| `EditLeadModal.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `EmailConfirmationSuccess.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `Header.jsx` | `AppNavigator.js` (tab bars) | ✅ **Implemented** (different pattern) |
| `HelpCenter.jsx` | `SupportScreen.js` | ⚠️ **Partial** |
| `LandingPage.jsx` | `LandingScreen.js` | ✅ **Implemented** |
| `LeadDetailModal.jsx` | `LeadDetailScreen.js` | ✅ **Implemented** |
| `LiveActivityTicker.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `Login.jsx` | `LoginScreen.js` | ✅ **Implemented** |
| `NotificationBell.jsx` | `NotificationsScreen.js` | ✅ **Implemented** (different pattern) |
| `NotificationModal.jsx` | `NotificationsScreen.js` | ✅ **Implemented** |
| `PasswordResetForm.jsx` | `ForgotPasswordScreen.js` | ✅ **Implemented** |
| `PasswordResetSuccess.jsx` | ❌ Missing | ⚠️ **Partial** (in ForgotPassword flow) |
| `PaymentMethodModal.jsx` | `BuyCreditsScreen.js` | ✅ **Implemented** |
| `PersonaVerification.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `PropertiesPage.jsx` | `AgentPropertiesScreen.js` | ✅ **Implemented** |
| `RatingModal.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `RatingPrompt.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `SearchFilter.jsx` | `LeadFiltersScreen.js` | ✅ **Implemented** |
| `SubscriptionModal.jsx` | ❌ Missing | ❌ **Not Implemented** (credits only) |
| `SubscriptionPage.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `TenantForm.jsx` | `TenantLeadScreen.js` | ✅ **Implemented** |
| `UserDashboard.jsx` | `TenantDashboardScreen.js` | ✅ **Implemented** |
| `UserProfile.jsx` | `ProfileScreen.js` | ✅ **Implemented** |
| `UserSubscriptionPage.jsx` | ❌ Missing | ❌ **Not Implemented** |
| `WalletManagement.jsx` | `AgentWalletScreen.js` | ✅ **Implemented** |

---

## 3. Features Missing in Mobile Version

### 🔴 Critical Missing Features

1. **Persona Verification** (`PersonaVerification.jsx`)
   - KYC identity verification for agents
   - Document upload and verification flow
   - Mobile needs: Camera integration, document scanning

2. **Agent Reviews System** (`AgentReviews.jsx`, `RatingModal.jsx`, `RatingPrompt.jsx`)
   - Rating agents after contact
   - Review display on agent profile
   - Star rating system (1-5)

3. **Subscription Plans** (`SubscriptionModal.jsx`, `SubscriptionPage.jsx`, `UserSubscriptionPage.jsx`)
   - Monthly subscription option (web has premium plans)
   - Mobile only has credit bundles, no subscription

4. **Live Activity Ticker** (`LiveActivityTicker.jsx`)
   - Real-time feed of platform activity
   - Shows recent leads, contacts, etc.

### 🟡 Moderate Missing Features

5. **Agent Detail Page** (`AgentDetailPage.jsx`)
   - Public agent profile view for tenants
   - Agent portfolio, reviews, contact info

6. **Agents Listing Page** (`AgentsListingPage.jsx`)
   - Browse all verified agents
   - Filter by location, specialty

7. **Inquiry Management** (`AgentInquiryManagement.jsx`)
   - Manage inquiries from tenants
   - Track inquiry status

8. **Edit Lead Modal** (`EditLeadModal.jsx`)
   - Edit tenant lead information
   - Update contact status

### 🟢 Minor/Optional Features

9. **Email Confirmation Success Page**
   - Dedicated success screen for email verification

10. **Password Reset Success Page**
    - Dedicated success screen after password reset

---

## 4. Agent Dashboard Feature Comparison

### Web AgentDashboard Features:

| Feature | Mobile Status |
|---------|---------------|
| Leads list with filters | ✅ Implemented |
| Lead unlock (standard/exclusive) | ✅ Implemented |
| Credit balance display | ✅ Implemented |
| Buy credits button | ✅ Implemented |
| Filter by location/type/budget | ✅ Implemented |
| Search leads | ✅ Implemented |
| Call tenant | ✅ Implemented |
| WhatsApp tenant | ✅ Implemented |
| **Refer & Earn section** | ✅ In AgentRewardsScreen |
| **My Connected Leads** | ⚠️ Partial (in LeadDetailScreen) |
| **Verification Status badge** | ❌ Missing |
| **Subscription Status section** | ❌ Missing |
| **Live Activity Ticker** | ❌ Missing |

---

## 5. Assets Folder Format Comparison

### Web Public Assets (`/public/`)
```
public/
├── favicon.ico
├── favicon.png
├── hero-section.jpg
├── manifest.json
├── mpesa-logo.png
├── og-image.svg
├── pesapal-logo.png
├── robots.txt
├── sitemap.xml
├── yoombaa-favicon.png
├── yoombaa-loading-logo.svg
├── yoombaa-logo-dark.svg
├── yoombaa-logo.png
└── yoombaa-logo.svg
```

### Mobile Assets (`/assets/`)
```
assets/
├── M-PESA-logo-2 (1).png
├── Yoombaa Favicon.png
├── adaptive-icon.png
├── favicon.png
├── hero section img.jpg
├── icon.png
├── mpesa logo.png
├── mpesa.png
├── pesapal.png
├── splash-icon.png
├── yoombaa logo svg.svg
└── yoombaa logo.png
```

### 🔧 Asset Improvements Needed:
1. **Naming convention**: Use kebab-case consistently (e.g., `hero-section.jpg` not `hero section img.jpg`)
2. **Add dark mode logo variant**: `yoombaa-logo-dark.svg`
3. **Add loading animation logo**: `yoombaa-loading-logo.svg`
4. **Remove duplicate files**: `mpesa logo.png` and `mpesa.png` - keep one
5. **Add OG image**: For deep linking/sharing

---

## 6. Database Schema Comparison

### Web (Firebase/Supabase)

| Collection | Mobile Implementation |
|------------|----------------------|
| `users` | ✅ Via `users` table |
| `leads` | ✅ Via `leads` table |
| `properties` | ✅ Via `assets` table |
| `subscriptions` | ⚠️ Partial - credits only |
| `contactHistory` | ✅ Via `lead_unlocks` |
| `notifications` | ✅ Via `notifications` table |
| `agent_reviews` | ❌ Missing |
| `referral_codes` | ✅ Implemented |

---

## 7. API Routes Comparison

### Web API Routes (To be Created)
- `/api/send-email` - Email notifications
- `/api/paystack/webhook` - Payment webhooks
- `/api/whatsapp/send` - WhatsApp integration

### Mobile Equivalent
- Email: Via Supabase Edge Functions (Resend)
- Payment: PesaPal IPN/Webhooks  
- WhatsApp: Deep linking only (no server integration)

---

## 8. Priority Action Items

### 🔴 High Priority (Agent Dashboard Completion)

1. **Add Verification Status Badge**
   - Show "Verified", "Pending", or "Not Verified" 
   - Location: AgentAccountScreen header
   
2. **Add Subscription/Plan Status**
   - Show current plan status
   - Expiry date if applicable

3. **Implement Agent Reviews**
   - Create review submission flow
   - Display ratings on agent profile

### 🟡 Medium Priority

4. **Persona/Identity Verification**
   - Integrate with Persona or similar KYC
   - Add document upload capability

5. **Agent Public Profile**
   - Allow tenants to view agent profiles
   - Show reviews, rating, portfolio

6. **Edit Lead Functionality**
   - Allow tenants to update their leads

### 🟢 Low Priority

7. **Live Activity Ticker**
   - Real-time activity feed on dashboard

8. **Subscription Plans**
   - Monthly subscription options
   - Auto-renewal system

---

## 9. Mobile-Specific Enhancements (Not in Web)

Features in Mobile that Web doesn't have:

1. ✅ **Dark Mode / Theme Support** - Appearance settings
2. ✅ **Multi-Language Support** - 10 languages
3. ✅ **Push Notifications** - Native push support
4. ✅ **Biometric Auth** - (potential future)
5. ✅ **Offline Support** - (potential future)

---

## 10. Recommended Next Steps

1. **Fix FONTS error** - Critical bug blocking app
2. **Add Verification Badge** - Quick win for AgentAccountScreen
3. **Implement Agent Reviews** - New screen + database table
4. **Add Subscription Status** - Display on dashboard
5. **Clean up assets** - Rename files, add missing variants
6. **Implement Persona Verification** - For agent KYC

---

*Generated: January 2026*
