# RentConnect Mobile App - Complete Implementation Guide

> **Last Updated:** January 2026
> **Platform:** React Native (Expo)
> **Backend:** Supabase (shared with web app)
> **Currency:** KES (Kenyan Shillings)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Brand Guidelines](#brand-guidelines)
4. [Application Architecture](#application-architecture)
5. [User Types & Flows](#user-types--flows)
6. [Authentication System](#authentication-system)
7. [Tenant Features](#tenant-features)
8. [Agent Features](#agent-features)
9. [Database Schema](#database-schema)
10. [API Integration](#api-integration)
11. [Navigation Structure](#navigation-structure)
12. [Screens To Implement](#screens-to-implement)
13. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Project Overview

RentConnect (branded as **Yoombaa**) is a rental marketplace platform connecting:
- **Tenants**: People looking for rental properties
- **Agents**: Real estate agents/landlords with properties to rent

### Business Model
1. Tenants post rental requests ("leads") for FREE
2. Verified agents pay credits to unlock tenant contact information
3. Agents purchase credits via M-Pesa (Pesapal payment gateway)
4. Referral program rewards agents for inviting new agents

---

## 🛠 Tech Stack

### Mobile App
- **Framework:** React Native with Expo SDK
- **Navigation:** React Navigation (Native Stack + Bottom Tabs)
- **State Management:** React Context API
- **Storage:** AsyncStorage (for auth persistence)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)

### Web App (Reference)
- Next.js 14
- Supabase
- Tailwind CSS
- Pesapal (M-Pesa payments)
- Africa's Talking (SMS)

### Shared Backend
Both web and mobile apps connect to the **SAME Supabase backend**:
- Database: `https://yydwhwkvrvgkqnmirbrr.supabase.co`
- Same users, leads, agents, transactions

---

## 🎨 Brand Guidelines

### Colors (Tailwind/CSS)
| Name | Hex Code | Usage |
|------|----------|-------|
| Brand Orange | `#FE9200` | Primary buttons, accents, headers |
| Brand Purple | `#7A00AA` | Secondary accents, selected states |
| Brand Cream | `#FFF5E6` | Backgrounds, highlights |
| Orange Light | `#FFE4C4` | Shadows, subtle highlights |
| Orange Hover | `#E58300` | Button hover states |

### Typography
- **Headings:** Bold, 28-32px (mobile)
- **Body:** Regular, 14-16px
- **Labels:** Semibold, 12-14px
- **Captions:** Regular, 10-12px

### UI Components
- **Border Radius:** 12-16px for cards, 12px for buttons
- **Shadows:** Subtle, orange-tinted (`shadow-orange-100`)
- **Touch Targets:** Minimum 44px height (accessibility)

---

## 🏗 Application Architecture

```
RentConnect-Mobile/
├── App.js                      # Entry point
├── src/
│   ├── context/
│   │   └── AuthContext.js      # Authentication state
│   ├── lib/
│   │   └── supabase.js         # Supabase client
│   ├── navigation/
│   │   └── AppNavigator.js     # Navigation setup
│   ├── screens/
│   │   ├── auth/               # Auth screens
│   │   ├── tenant/             # Tenant-specific screens
│   │   ├── agent/              # Agent-specific screens
│   │   └── common/             # Shared screens
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   └── forms/              # Form components
│   ├── hooks/                  # Custom React hooks
│   ├── utils/                  # Helper functions
│   └── assets/                 # Images, fonts
├── package.json
└── app.json
```

---

## 👥 User Types & Flows

### 1. Tenant Flow
```
App Launch → Login/Register → Tenant Dashboard
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            My Requests      Create Request    Profile/Settings
                │                   │
                ▼                   ▼
          View/Edit/Delete   Multi-step Form
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             Location       Property Type      Budget
                                    │
                                    ▼
                            Contact Details
                                    │
                                    ▼
                            Submit Request ✓
```

### 2. Agent Flow
```
App Launch → Login/Register → Agent Dashboard
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼               ▼           ▼           ▼               ▼
   Leads Dashboard  My Properties  Wallet   Referrals    Profile
        │                                       │
        ▼                                       ▼
   Browse Leads                          Share Code
        │                                       │
        ▼                                       ▼
   Unlock Lead                           Earn Credits
   (Spend Credits)
        │
        ▼
   Contact Tenant
```

---

## 🔐 Authentication System

### Supported Auth Methods
1. **Email/Password** - Primary method
2. **Google OAuth** - Social login
3. **Password Reset** - Via email link

### Auth Flow (Supabase)

```javascript
// Supabase Client Setup (src/lib/supabase.js)
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://yydwhwkvrvgkqnmirbrr.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY'; // Get from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Registration Flow
1. User selects type: `tenant` or `agent`
2. Enters email, password, full name
3. Supabase creates auth user
4. App creates user record in `users` table
5. Email confirmation sent (optional based on Supabase settings)

### Login Flow
1. User enters email/password
2. Supabase validates credentials
3. App fetches user profile from `users` table
4. Redirects to appropriate dashboard based on `role`

### User Roles
| Role | Description | Dashboard |
|------|-------------|-----------|
| `tenant` | Looking for rentals | TenantDashboard |
| `agent` | Real estate agent | AgentDashboard |
| `admin` | Platform admin | AdminDashboard (web only) |

---

## 🏠 Tenant Features

### 1. Create Rental Request (Multi-Step Form)

**Step 1: Location**
- Google Places Autocomplete for location search
- Extracts: city, area, state, country, countryCode, pincode
- AI auto-fill option (parses natural language)

**Step 2: Property Type**
Options:
- 1 Bedroom
- 2 Bedroom
- 3+ Bedroom
- Studio
- Self Contain
- Duplex

**Step 3: Budget**
- Currency: KES (Kenyan Shillings)
- Quick presets: 10K, 15K, 20K, 25K, 30K, 40K, 50K+
- Custom amount input

**Step 4: Contact Details**
- Full Name (required)
- Email (required, validated)
- WhatsApp Number (optional, with country code picker)

### 2. My Requests Dashboard
- View all submitted requests
- Edit existing requests
- Delete requests
- See request status (active, contacted, closed)

### 3. Tenant Profile
- Update name, email, phone
- View account settings
- Logout

---

## 🏢 Agent Features

### 1. Leads Dashboard
**Main View:**
- List of available leads (tenant requests)
- Filter by: location, property type, budget range
- Search functionality
- Lead cards showing:
  - Location
  - Property type
  - Budget
  - Posted date
  - Views count
  - "Unlock" button

**Lead Unlock Flow:**
1. Agent clicks "Unlock Lead"
2. System checks wallet balance
3. Deducts credits (typically 1 credit per lead)
4. Reveals tenant contact info (phone, email, WhatsApp)
5. Records in `contact_history` table

### 2. My Properties (Unlocked Leads)
- List of leads agent has unlocked
- Contact status tracking:
  - `accepted` - Lead unlocked
  - `contacted` - Agent reached out
  - `converted` - Successful rental
  - `lost` - Did not convert

### 3. Wallet & Credits
**Wallet Balance Display:**
- Current credit balance
- Transaction history

**Purchase Credits:**
- Credit bundles available:
  | Bundle | Credits | Price (KES) | Per Lead |
  |--------|---------|-------------|----------|
  | Starter | 5 | 250 | KSh 50 |
  | Basic | 15 | 600 | KSh 40 |
  | Premium | 50 | 1,500 | KSh 30 |
  | Pro | 150 | 3,000 | KSh 20 |

**Payment Flow (Pesapal/M-Pesa):**
1. Agent selects bundle
2. Enters M-Pesa phone number
3. Initiates STK Push
4. Receives M-Pesa prompt on phone
5. Enters PIN to confirm
6. Credits added to wallet

### 4. Referral Program
**How It Works:**
- Each agent gets unique referral code
- Share code with other agents
- When referred agent makes first purchase:
  - Referrer gets 500 bonus credits
  - Referred agent gets 500 bonus credits

**Referral Dashboard:**
- Unique referral code
- Share buttons (WhatsApp, Copy)
- Referral statistics:
  - Total referrals
  - Pending referrals
  - Credits earned

### 5. Agent Profile
**Profile Fields:**
- Full Name
- Email
- Phone
- Agency Name
- Location/Areas Served
- Experience (years)
- Bio/Description
- Profile Photo

**Verification Status:**
- `pending` - Awaiting verification
- `verified` - ID verified
- `rejected` - Verification failed

**Verification Process:**
1. Agent uploads ID document
2. Takes selfie for face match
3. Admin reviews and approves/rejects
4. Verified badge shown on profile

### 6. Agent Assets (Optional)
- Upload property photos
- Organize in folders
- Share links with tenants

### 7. Rewards System
- Earn rewards for activity
- Redeem for credits or perks

---

## 📊 Database Schema

### Core Tables

#### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'tenant', -- tenant, agent, admin
  type VARCHAR(20), -- Legacy, same as role

  -- Agent-specific fields
  agency_name VARCHAR(255),
  location VARCHAR(255),
  experience VARCHAR(50),
  bio TEXT,
  avatar VARCHAR(500),

  -- Wallet & Credits
  wallet_balance NUMERIC(10,2) DEFAULT 0,

  -- Verification
  verification_status VARCHAR(20) DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT false,

  -- Referral
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES users(id),

  -- Ratings (agents)
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `leads` Table
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES users(id),

  -- Contact Info (hidden until unlocked)
  tenant_name VARCHAR(255),
  tenant_email VARCHAR(255),
  tenant_phone VARCHAR(50),

  -- Location
  location VARCHAR(255),
  city VARCHAR(100),
  area VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  country_code VARCHAR(10),

  -- Property Details
  property_type VARCHAR(50),
  bedrooms INTEGER,

  -- Budget
  budget NUMERIC(12,2),
  budget_formatted VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'KES',

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, contacted, closed, sold_out
  views INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `contact_history` Table
```sql
CREATE TABLE contact_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES users(id),
  lead_id UUID REFERENCES leads(id),
  contact_type VARCHAR(20), -- unlock, phone, email, whatsapp
  cost_credits INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'accepted', -- accepted, contacted, converted, lost
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `credit_transactions` Table
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20), -- purchase, deduction, bonus, refund
  amount INTEGER NOT NULL,
  balance_after INTEGER,
  description TEXT,
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `referrals` Table
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  referred_user_id UUID REFERENCES users(id),
  credits_awarded INTEGER DEFAULT 0,
  bonus_amount INTEGER DEFAULT 500,
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `notifications` Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50), -- new_lead, lead_unlocked, credits_added, etc.
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔌 API Integration

### Supabase Database Operations

```javascript
// src/lib/database.js

import { supabase } from './supabase';

// ============ USER OPERATIONS ============

export async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  return { success: !error, data, error };
}

export async function createUser(userId, userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ id: userId, ...userData }])
    .select()
    .single();

  return { success: !error, data, error };
}

export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { success: !error, data, error };
}

// ============ LEADS OPERATIONS ============

export async function getLeads(filters = {}) {
  let query = supabase
    .from('leads')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  if (filters.propertyType) {
    query = query.eq('property_type', filters.propertyType);
  }
  if (filters.minBudget) {
    query = query.gte('budget', filters.minBudget);
  }
  if (filters.maxBudget) {
    query = query.lte('budget', filters.maxBudget);
  }

  const { data, error } = await query;
  return { success: !error, data: data || [], error };
}

export async function createLead(leadData) {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();

  return { success: !error, data, error };
}

export async function updateLead(leadId, updates) {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', leadId)
    .select()
    .single();

  return { success: !error, data, error };
}

export async function deleteLead(leadId) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId);

  return { success: !error, error };
}

// Get leads for a specific tenant
export async function getTenantLeads(tenantId) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return { success: !error, data: data || [], error };
}

// ============ WALLET OPERATIONS ============

export async function getWalletBalance(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  return { success: !error, balance: data?.wallet_balance || 0, error };
}

export async function deductCredits(userId, amount, description, referenceId) {
  // Get current balance
  const { balance } = await getWalletBalance(userId);

  if (balance < amount) {
    return { success: false, error: 'Insufficient credits' };
  }

  const newBalance = balance - amount;

  // Update balance
  const { error: updateError } = await supabase
    .from('users')
    .update({ wallet_balance: newBalance })
    .eq('id', userId);

  if (updateError) return { success: false, error: updateError };

  // Record transaction
  await supabase.from('credit_transactions').insert([{
    user_id: userId,
    type: 'deduction',
    amount: -amount,
    balance_after: newBalance,
    description,
    reference_id: referenceId
  }]);

  return { success: true, newBalance };
}

// ============ LEAD UNLOCK OPERATIONS ============

export async function unlockLead(agentId, leadId, creditCost = 1) {
  // Check if already unlocked
  const { data: existing } = await supabase
    .from('contact_history')
    .select('id')
    .eq('agent_id', agentId)
    .eq('lead_id', leadId)
    .single();

  if (existing) {
    return { success: false, error: 'Lead already unlocked' };
  }

  // Deduct credits
  const deductResult = await deductCredits(
    agentId,
    creditCost,
    'Lead unlock',
    leadId
  );

  if (!deductResult.success) {
    return deductResult;
  }

  // Record unlock
  const { error } = await supabase.from('contact_history').insert([{
    agent_id: agentId,
    lead_id: leadId,
    contact_type: 'unlock',
    cost_credits: creditCost,
    status: 'accepted'
  }]);

  return { success: !error, error };
}

export async function getUnlockedLeads(agentId) {
  const { data, error } = await supabase
    .from('contact_history')
    .select(`
      *,
      lead:leads(*)
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  return { success: !error, data: data || [], error };
}

// ============ REFERRAL OPERATIONS ============

export async function getReferralCode(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (data?.referral_code) {
    return { success: true, code: data.referral_code };
  }

  // Generate new code if doesn't exist
  const newCode = `YMB${userId.substring(0, 6).toUpperCase()}`;

  await supabase
    .from('users')
    .update({ referral_code: newCode })
    .eq('id', userId);

  return { success: true, code: newCode };
}

export async function getReferralStats(userId) {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  const stats = {
    total: data?.length || 0,
    pending: data?.filter(r => r.status === 'pending').length || 0,
    completed: data?.filter(r => r.status === 'completed').length || 0,
    creditsEarned: data?.reduce((sum, r) => sum + (r.credits_awarded || 0), 0) || 0
  };

  return { success: !error, stats, error };
}

// ============ NOTIFICATIONS ============

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  return { success: !error, data: data || [], error };
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  return { success: !error, error };
}
```

---

## 🧭 Navigation Structure

### React Navigation Setup

```javascript
// src/navigation/AppNavigator.js

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack (unauthenticated users)
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Tenant Tab Navigator
function TenantTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={TenantDashboardScreen} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={TenantProfileScreen} />
    </Tab.Navigator>
  );
}

// Agent Tab Navigator
function AgentTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Leads" component={LeadsDashboardScreen} />
      <Tab.Screen name="Properties" component={MyPropertiesScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Referrals" component={ReferralsScreen} />
      <Tab.Screen name="Profile" component={AgentProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.role === 'agent' ? (
        <AgentTabs />
      ) : (
        <TenantTabs />
      )}
    </NavigationContainer>
  );
}
```

---

## 📱 Screens To Implement

### Authentication Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| `LandingScreen` | Welcome screen with tenant/agent options | High |
| `LoginScreen` | Email/password + Google login | High |
| `RegisterScreen` | User registration form | High |
| `ForgotPasswordScreen` | Password reset request | Medium |
| `ResetPasswordScreen` | Set new password | Medium |

### Tenant Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| `TenantDashboardScreen` | Overview, quick actions | High |
| `CreateRequestScreen` | Multi-step rental request form | High |
| `MyRequestsScreen` | List of tenant's requests | High |
| `RequestDetailScreen` | View/edit single request | High |
| `TenantProfileScreen` | Profile settings | Medium |
| `TenantSupportScreen` | Help & support tickets | Low |

### Agent Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| `LeadsDashboardScreen` | Browse available leads | High |
| `LeadDetailScreen` | View lead details, unlock | High |
| `MyPropertiesScreen` | Unlocked leads list | High |
| `WalletScreen` | Balance, transactions, top-up | High |
| `BuyCreditsScreen` | Credit bundle selection | High |
| `PaymentScreen` | M-Pesa payment flow | High |
| `ReferralsScreen` | Referral code, stats | Medium |
| `AgentProfileScreen` | Profile settings | Medium |
| `VerificationScreen` | ID verification flow | Medium |
| `AgentAssetsScreen` | Property photos | Low |
| `AgentRewardsScreen` | Rewards program | Low |

### Common Screens

| Screen | Description | Priority |
|--------|-------------|----------|
| `NotificationsScreen` | All notifications | Medium |
| `SettingsScreen` | App settings | Low |
| `HelpCenterScreen` | FAQs, support | Low |

---

## ✅ Implementation Checklist

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup with Expo
- [ ] Supabase client configuration
- [ ] Authentication context
- [ ] Navigation structure
- [ ] Basic UI components (Button, Input, Card)
- [ ] Login/Register screens
- [ ] User type selection

### Phase 2: Tenant Features (Week 3-4)
- [ ] Tenant dashboard
- [ ] Create request form (4 steps)
- [ ] Location autocomplete
- [ ] Property type selection
- [ ] Budget input
- [ ] Contact details form
- [ ] My requests list
- [ ] Edit/delete requests
- [ ] Tenant profile

### Phase 3: Agent Features (Week 5-7)
- [ ] Agent dashboard
- [ ] Leads list with filters
- [ ] Lead detail view
- [ ] Lead unlock flow
- [ ] Wallet balance display
- [ ] Credit purchase flow
- [ ] M-Pesa payment integration
- [ ] Unlocked leads (My Properties)
- [ ] Contact status tracking
- [ ] Agent profile
- [ ] Verification flow

### Phase 4: Engagement Features (Week 8-9)
- [ ] Referral system
- [ ] Notifications
- [ ] Push notifications (Expo)
- [ ] In-app messaging
- [ ] Ratings & reviews

### Phase 5: Polish & Launch (Week 10)
- [ ] Error handling
- [ ] Loading states
- [ ] Offline support
- [ ] Performance optimization
- [ ] App store assets
- [ ] Beta testing
- [ ] Production deployment

---

## 🔧 Key Implementation Notes

### 1. Phone Number Handling
Use `react-native-phone-number-input` for international phone numbers:
```javascript
import PhoneInput from 'react-native-phone-number-input';

<PhoneInput
  defaultCode="KE"
  layout="first"
  onChangeFormattedText={(text) => setPhone(text)}
/>
```

### 2. Location Autocomplete
Use Google Places API:
```javascript
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

<GooglePlacesAutocomplete
  placeholder="Search location"
  onPress={(data, details) => {
    // Extract city, area, country from details
  }}
  query={{
    key: 'YOUR_GOOGLE_API_KEY',
    language: 'en',
    components: 'country:ke', // Restrict to Kenya
  }}
/>
```

### 3. Currency Formatting
```javascript
export function formatCurrency(amount, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Usage: formatCurrency(25000) => "KES 25,000"
```

### 4. Date Formatting
```javascript
import { formatDistanceToNow } from 'date-fns';

// "2 hours ago", "3 days ago"
formatDistanceToNow(new Date(lead.created_at), { addSuffix: true });
```

### 5. Error Handling Pattern
```javascript
try {
  setLoading(true);
  const result = await someApiCall();

  if (!result.success) {
    throw new Error(result.error || 'Something went wrong');
  }

  // Handle success
} catch (error) {
  Alert.alert('Error', error.message);
} finally {
  setLoading(false);
}
```

### 6. Pull-to-Refresh Pattern
```javascript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  await fetchData();
  setRefreshing(false);
};

<FlatList
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
/>
```

---

## 📚 Additional Resources

### Web App Reference Files
- `components/AgentDashboard.jsx` - Agent dashboard implementation
- `components/TenantForm.jsx` - Multi-step tenant form
- `components/Login.jsx` - Authentication UI
- `lib/database.js` - Supabase operations
- `lib/auth-supabase.js` - Auth helpers

### Supabase Documentation
- [React Native Setup](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Authentication](https://supabase.com/docs/guides/auth)
- [Database](https://supabase.com/docs/guides/database)

### Design Reference
- Brand colors: Orange (#FE9200), Purple (#7A00AA)
- Web app: https://yoombaa.com (for UI reference)

---

*This document serves as the complete specification for building the RentConnect mobile app. Refer to the web app codebase for detailed implementation patterns.*

