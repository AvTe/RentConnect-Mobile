# RentConnect: Web vs Mobile Comparison Report

**Generated:** 2025-01-XX  
**Web Version:** Next.js at `C:\Users\amitv\Desktop\RentConnect`  
**Mobile Version:** Expo SDK 54 / React Native 0.81.5 at `C:\Users\amitv\Desktop\RentConnect-Mobile`  
**Shared Backend:** Supabase (same project/keys)

---

## Executive Summary

| Metric | Web | Mobile |
|--------|-----|--------|
| Database tables referenced | **33** | **10** |
| Service layer exports | **~130** | **~30** |
| Feature coverage | Full | ~25% of web |

The mobile app covers basic flows (auth, lead browsing, lead unlock, credit purchase, referrals) but is missing 70%+ of the web's functionality. **Critical database-level differences mean data written by mobile may not be visible/correct on web and vice versa.**

---

## SECTION A: WHAT IS CORRECT (Aligned with Web)

### A1. Tables Used Consistently
| Table | Web Usage | Mobile Usage | Status |
|-------|-----------|--------------|--------|
| `users` | CRUD + wallet + referral code + verification | CRUD + wallet + referral code | ✅ **Aligned** |
| `leads` | CRUD + status management | Read + insert (tenant) + update on unlock | ✅ **Mostly aligned** (see caveats in Section B) |
| `contact_history` | Tracks unlock/exclusive/browse/call/etc | Tracks unlock/exclusive for agent | ✅ **Aligned** for unlock tracking |
| `credit_transactions` | Logs all credits/debits | Logs credits/debits | ✅ **Aligned** |
| `referrals` | Tracks referral pairs | Tracks referral pairs | ✅ **Aligned** |
| `credit_bundles` | Admin-managed bundle catalog | Read-only for display | ✅ **Aligned** |
| `notifications` | Full CRUD + realtime | Read + mark-read | ✅ **Aligned** (subset) |

### A2. Business Logic That Matches
| Logic | Details |
|-------|---------|
| **Referral code format** | Both use `YOOM-XXXX` pattern with same charset and collision check |
| **Surge pricing formula** | Identical: `[1.0, 1.5, 2.5]` slot multipliers, `5.0 × 0.85` exclusive |
| **Referral bonuses** | Matching: Referrer = 5 credits, New user = 2 credits |
| **Lead unlock validations** | Both check: sold_out, exclusive, already-unlocked via `contact_history` |
| **Contact history schema** | `agent_id`, `lead_id`, `contact_type`, `cost_credits`, `created_at` — identical columns |
| **User data transform** | Both map snake_case DB → camelCase JS (mobile's `transformUserData`) |
| **Lead slot management** | Both increment `claimed_slots` and set `sold_out` when full |
| **Unlock refund on failure** | Both refund credits if lead update fails after deduction |

### A3. API Layer Alignment
| API | Web Route | Mobile Call | Status |
|-----|-----------|-------------|--------|
| Location search | `/api/location-search` | `yoombaa.com/api/location-search` | ✅ Same endpoint |
| Geocode | `/api/geocode` | `yoombaa.com/api/geocode` | ✅ Same endpoint |
| AI parse | `/api/ai/parse-requirements` | `yoombaa.com/api/ai/parse-requirements` | ✅ Same endpoint |
| Send OTP | `/api/send-otp` | `yoombaa.com/api/send-otp` | ✅ Same endpoint |
| Verify OTP | `/api/verify-otp` | `yoombaa.com/api/verify-otp` | ✅ Same endpoint |

---

## SECTION B: WHAT NEEDS FIXING (Incorrect / Mismatched)

### B1. CRITICAL — `createLead` Missing Columns

**File:** `src/screens/TenantLeadScreen.js` (line ~280)

**Problem:** Mobile inserts leads with only 7 columns. Web's `createLead` sets 13+ columns including critical pricing fields.

| Column | Web Sets | Mobile Sets |
|--------|----------|-------------|
| `location` | ✅ | ✅ |
| `property_type` | ✅ | ✅ |
| `bedrooms` | ✅ | ✅ |
| `budget` | ✅ | ✅ |
| `tenant_name` | ✅ | ✅ |
| `tenant_email` | ✅ | ✅ |
| `tenant_phone` | ✅ | ✅ |
| `status` | ✅ `'active'` | ✅ `'active'` |
| `base_price` | ✅ Budget-tier calculated | ❌ **MISSING** |
| `views` | ✅ `0` | ❌ **MISSING** |
| `contacts` | ✅ `0` | ❌ **MISSING** |
| `max_slots` | ✅ `3` | ❌ **MISSING** |
| `claimed_slots` | ✅ `0` | ❌ **MISSING** |
| `is_exclusive` | ✅ `false` | ❌ **MISSING** |
| `created_at` | ✅ | ❌ **MISSING** |
| `updated_at` | ✅ | ❌ **MISSING** |
| `user_id` | ✅ (authenticated tenant) | ❌ **MISSING** |

**Impact:** Leads created from mobile will have `base_price = NULL`, causing all unlock prices to default to 250 credits regardless of budget tier. Also missing `user_id` means tenant can't manage their leads.

**Web pricing logic:**
```
budget < 12,000 → base_price = 50
budget < 30,000 → base_price = 250
budget < 60,000 → base_price = 450
budget ≥ 60,000 → base_price = 1000
```

---

### B2. CRITICAL — `lead_views` Table Mismatch

**File:** `src/lib/leadService.js` (line ~420)

**Problem:** Mobile tracks lead views in `lead_views` table. Web tracks views in `contact_history` with `contact_type='browse'`. The `lead_views` table does **not exist** in the web schema.

| Aspect | Web | Mobile |
|--------|-----|--------|
| Table | `contact_history` | `lead_views` ❌ |
| Contact type | `'browse'` | N/A |
| Columns | `agent_id, lead_id, contact_type, cost_credits, created_at` | `lead_id, agent_id, created_at` |

**Impact:** Mobile view tracking either silently fails (if table doesn't exist) or creates orphaned data invisible to web analytics.

---

### B3. CRITICAL — `processReferral` Missing Transaction Records

**File:** `src/lib/database.js` (line ~200)

**Problem:** Mobile's `processReferral()` directly updates `wallet_balance` on both referrer and new user but does NOT insert into `credit_transactions`. Web's version calls `addCredits()` which creates transaction records.

**Impact:** Referral bonuses (5 credits referrer, 2 credits new user) are invisible in wallet transaction history — the balance changes but there's no audit trail.

---

### B4. CRITICAL — Payment Flow Is Placeholder

**File:** `src/screens/agent/BuyCreditsScreen.js` (line ~156)

**Problem:** M-Pesa payment uses a `setTimeout(3000)` dev placeholder that adds credits regardless of payment outcome. There is no server-side verification.

**Web flow:** Pesapal IPN webhook → server verifies → `addAgentCredits()` → sends notification  
**Mobile flow:** `setTimeout(3s)` → directly writes `wallet_balance` + `credit_transactions`

Additional issues:
- Credits are added inline (duplicating `addCredits()` logic from `leadService.js`)
- `processReferralOnFirstPurchase()` is never called (web calls this on first top-up)
- No notification sent after purchase (web sends via `notifyAgentCreditsPurchased()`)

---

### B5. HIGH — `unlockLead` Missing `lead_agent_connections`

**File:** `src/lib/leadService.js` `unlockLead()` function

**Problem:** Web's `unlockLead` upserts into `lead_agent_connections` after successful unlock. Mobile doesn't touch this table.

**Web writes:**
```js
lead_agent_connections: {
  lead_id, agent_id, connection_type: 'unlock'|'exclusive',
  status: 'connected', cost, is_exclusive, created_at, updated_at
}
```

**Impact:** Web features that rely on `lead_agent_connections` (lead outcome tracking, agent pipeline management, connection status) won't work for mobile unlocks.

---

### B6. HIGH — `unlockLead` Missing Notifications

**File:** `src/lib/leadService.js` `unlockLead()` function

**Problem:** Web sends two notifications after unlock:
1. To **agent**: "Lead unlocked! Here's the tenant contact info"
2. To **tenant**: "An agent is interested in your request"

Mobile sends zero notifications.

---

### B7. MEDIUM — `payment_transactions` vs `pending_payments`

**File:** `src/screens/agent/BuyCreditsScreen.js`

**Problem:** Mobile writes to `payment_transactions` table. Web uses `pending_payments` table (with Pesapal-specific columns like `order_tracking_id`, `metadata`, `signature`, `pesapal_status`, `fulfillment_status`).

| Column | Web `pending_payments` | Mobile `payment_transactions` |
|--------|----------------------|------------------------------|
| `order_id` | ✅ UNIQUE | ❌ Not used |
| `order_tracking_id` | ✅ Pesapal | ❌ Not used |
| `metadata` | ✅ JSONB | ❌ Not used |
| `signature` | ✅ HMAC | ❌ Not used |
| `user_id` | ❌ Not in web | ✅ |
| `payment_method` | ❌ Not in web | ✅ |
| `description` | ❌ Not in web | ✅ |

**Impact:** These appear to be two different tables entirely. Web payments and mobile payments are tracked in separate tables with no cross-visibility.

---

### B8. MEDIUM — `getWalletTransactions` Response Shape Mismatch

**File:** `src/lib/leadService.js` `getWalletTransactions()`

| Aspect | Web | Mobile |
|--------|-----|--------|
| Response key | `{ success, data }` | `{ success, transactions }` |
| Default limit | 50 | 20 |
| Debit amounts | Returned as **negative** | Raw positive numbers |
| Type mapping | `credit→topup, debit+referral→referral, else→unlock` | No mapping (raw `type` field) |

**Impact:** Any shared UI components or logic expecting web response format will break on mobile.

---

### B9. MEDIUM — BuyCreditsScreen Duplicates Service Logic

**File:** `src/screens/agent/BuyCreditsScreen.js` (lines ~180-210)

**Problem:** Instead of calling `addCredits()` from `leadService.js`, BuyCreditsScreen manually:
1. Reads `wallet_balance` from `users`
2. Calculates `newBalance`
3. Updates `users.wallet_balance`
4. Inserts `credit_transactions`

This is identical to `addCredits()` but without the error wrapper, creating two different code paths for the same operation.

---

## SECTION C: WHAT IS MISSING (Features Not in Mobile)

### C1. Missing Database Tables (23 of 33)

| Table | Web Purpose | Mobile Status |
|-------|-------------|---------------|
| `lead_agent_connections` | Track agent-lead relationships, outcomes, pipeline | ❌ **Not referenced** |
| `bad_lead_reports` | Agents report fake/incorrect leads for refund | ❌ **Not referenced** |
| `properties` | Agent property listings | ❌ **Not referenced** |
| `saved_properties` | Tenant saved/favorited properties | ❌ **Not referenced** |
| `subscriptions` | Agent subscription records | ❌ **Not referenced** |
| `subscription_plans` | Admin-managed subscription tiers | ❌ **Not referenced** |
| `pending_payments` | Pesapal payment tracking with webhooks | ❌ **Not referenced** |
| `support_tickets` | User support ticket system | ❌ **Not referenced** |
| `ticket_replies` | Threaded ticket conversations | ❌ **Not referenced** |
| `agent_asset_folders` | Folder organization for agent media | ❌ **Not referenced** |
| `agent_storage_usage` | Per-agent storage quota tracking | ❌ **Not referenced** |
| `asset_share_views` | Analytics for shared assets | ❌ **Not referenced** |
| `agent_ratings` | Tenant → agent rating system | ❌ **Not referenced** |
| `voucher_pool` | Bulk voucher management | ❌ **Not referenced** |
| `agent_vouchers` | Assigned vouchers per agent | ❌ **Not referenced** |
| `voucher_activity_log` | Voucher lifecycle tracking | ❌ **Not referenced** |
| `notification_templates` | Admin-managed notification templates | ❌ **Not referenced** |
| `external_lead_logs` | Zapier/API lead ingestion logs | ❌ **Not referenced** |
| `system_config` | App-wide settings | ❌ **Not referenced** |
| `api_keys` | API key management | ❌ **Not referenced** |
| `admin_users` | Admin user management | ❌ Not needed in mobile |
| `admin_invites` | Admin invite system | ❌ Not needed in mobile |
| `admin_sessions` | Admin session tracking | ❌ Not needed in mobile |
| `admin_activity_logs` | Admin audit trail | ❌ Not needed in mobile |
| `admin_permissions` | Admin RBAC | ❌ Not needed in mobile |

*Note: Admin tables (5) are intentionally excluded from mobile — admin-only features.*

---

### C2. Missing Service Functions (~100 of ~130)

#### User Operations (Missing 1)
| Function | Purpose |
|----------|---------|
| `getOrUpdateReferralCode(userId)` | Lazy referral code generation |

#### Wallet Operations (Missing 2)
| Function | Purpose |
|----------|---------|
| `addAgentCredits(userId, amount, reason)` | Credits + notification on purchase |
| `processReferralOnFirstPurchase(userId)` | Two-stage referral bonus trigger |

#### Lead Operations (Missing 8)
| Function | Purpose |
|----------|---------|
| `createLead(leadData)` | Centralized lead creation with pricing + notifications |
| `getLead(leadId)` | Get single lead by ID |
| `getAllLeads(options)` | Paginated lead listing with filters |
| `deleteLead(leadId)` | Delete a lead |
| `updateLead(leadId, data)` | Update lead fields |
| `incrementLeadContacts(leadId)` | Increment contact counter |
| `trackAgentLeadContact(agentId, leadId, type)` | Log various contact types |
| `subscribeToLeads(callback)` | Real-time lead subscription |

#### Lead Connection Operations (Missing 6)
| Function | Purpose |
|----------|---------|
| `checkAgentLeadConnection(agentId, leadId)` | Check connection status |
| `acceptLead(agentId, leadId)` | Agent accepts/confirms lead |
| `recordLeadContact(agentId, leadId)` | Track contact attempt |
| `getLeadConnections(leadId)` | Get all agents connected to a lead |
| `getAgentConnectedLeads(agentId, options)` | Agent's full lead pipeline |
| `updateLeadOutcome(connectionId, data)` | Track outcome (converted/lost) |

#### Property Operations (Missing 6)
| Function | Purpose |
|----------|---------|
| `createProperty(data)` | Create property listing |
| `getProperty(propertyId)` | Get single property |
| `getAgentProperties(agentId)` | Agent's property list |
| `searchProperties(filters)` | Property search |
| `updateProperty(propertyId, data)` | Update property |
| `deleteProperty(propertyId)` | Delete property |

#### Subscription Operations (Missing 4)
| Function | Purpose |
|----------|---------|
| `createSubscription(data)` | Create new subscription |
| `getActiveSubscription(userId)` | Check active subscription |
| `updateSubscription(subId, data)` | Modify subscription |
| `checkSubscriptionStatus(userId)` | Auto-expire check |

#### Saved Properties (Missing 3)
| Function | Purpose |
|----------|---------|
| `saveProperty(userId, propertyId)` | Save/favorite a property |
| `unsaveProperty(userId, propertyId)` | Remove saved property |
| `getSavedProperties(userId)` | Get user's saved list |

#### Notification Operations (Missing 6)
| Function | Purpose |
|----------|---------|
| `createNotification(data)` | Create in-app notification |
| `subscribeToNotifications(userId, cb)` | Real-time notification stream |
| `markAllNotificationsRead(userId)` | Bulk read mark |
| `getUnreadNotificationCount(userId)` | Badge count |
| `deleteNotification(notifId)` | Delete notification |
| `subscribeToNewNotifications(userId, cb)` | New-only subscription |

#### Support Ticket Operations (Missing 13)
| Function | Purpose |
|----------|---------|
| `createTicket(data)` | Submit support ticket |
| `getUserTickets(userId, options)` | User's ticket list |
| `getTicketById(ticketId, userId)` | Read single ticket |
| `updateTicket(ticketId, data)` | Update ticket |
| `addTicketReply(data)` | Reply to ticket |
| `subscribeToTickets(callback)` | Real-time ticket updates |
| `subscribeToUserTickets(userId, cb)` | User ticket updates |
| `subscribeToTicketReplies(ticketId, cb)` | Reply stream |
| + 5 more ticket functions | Stats, delete, attachment upload |

#### Rating Operations (Missing 9)
| Function | Purpose |
|----------|---------|
| `submitAgentRating(data)` | Tenant rates agent |
| `canTenantRateAgent(tenantId, agentId)` | Check eligibility |
| `getAgentRatings(agentId, options)` | Agent's public reviews |
| `getAgentRatingSummary(agentId)` | Aggregate rating |
| `getAgentsPendingRating(tenantId)` | Unrated agents |
| + 4 more rating functions | Update, delete, flag, admin list |

#### Bad Lead Report Operations (Missing 5)
| Function | Purpose |
|----------|---------|
| `reportBadLead(agentId, leadId, data)` | Report fake/bad lead |
| `getBadLeadReports(options)` | List reports |
| `approveBadLeadReport(reportId, ...)` | Approve + refund |
| `rejectBadLeadReport(reportId, ...)` | Reject report |
| `getAgentBadLeadReports(agentId)` | Agent's own reports |

#### Agent Connection Operations (Missing 2)
| Function | Purpose |
|----------|---------|
| `sendConnectionRequest(agentId, tenantData)` | Tenant connects with agent |
| `getAllAgents(options)` | Browse/search agents |

#### Real-time Subscriptions (Missing all)
| Feature | Purpose |
|---------|---------|
| `subscribeToLeads()` | Live lead feed |
| `subscribeToNotifications()` | Push notification stream |
| `subscribeToTickets()` | Ticket updates |

---

### C3. Missing Screen-Level Features

| Feature | Web Has | Mobile Status |
|---------|---------|---------------|
| **Support tickets** (create/view/reply) | Full ticket system with attachments | ❌ SupportScreen only has contact info |
| **Agent ratings** (view/submit) | Full rating system with sub-ratings | ❌ Not implemented |
| **Bad lead reporting** | 24hr window, admin review, auto-refund | ❌ Not implemented |
| **Property listings** | Full CRUD with image upload | ❌ AgentPropertiesScreen shows unlocked leads, not properties |
| **Saved properties** | Save/unsave/browse | ❌ Not implemented |
| **Subscriptions** | Plan selection, payment, status | ❌ Not implemented |
| **Vouchers** | View assigned vouchers, QR codes | ❌ Not implemented |
| **Agent search/browse** | Tenants can find and connect with agents | ❌ Not implemented |
| **Real-time lead feed** | Live lead updates via Supabase realtime | ❌ Manual refresh only |
| **Notification badge** | Unread count badge | ❌ Not implemented |
| **Mark all read** | Bulk notification read | ❌ Not implemented |
| **Lead outcome tracking** | Track converted/lost leads | ❌ Not implemented |
| **Password reset** | Email-based reset flow | ⚠️ ForgotPasswordScreen exists but may not be fully integrated |

---

## SECTION D: CODE QUALITY ISSUES (Service Layer)

### D1. Direct Supabase Calls Bypassing Services

| Screen | Table(s) | Should Use |
|--------|----------|------------|
| `TenantLeadScreen.js` | `leads` INSERT | Should use a `createLead()` service function |
| `AgentProfileEditScreen.js` | `users` UPDATE | Should use `updateUser()` from database.js |
| `BuyCreditsScreen.js` | `credit_bundles`, `payment_transactions`, `users`, `credit_transactions` | Should use `addCredits()` from leadService.js |
| `ProfileScreen.js` | `users` UPSERT | Should use `updateUser()` from database.js |
| `AgentPropertiesScreen.js` | `contact_history → leads` | Should use `getAgentUnlockedLeads()` from leadService.js |
| `LeadDetailScreen.js` | `leads`, `contact_history` | Should use `fetchLeads()` / `hasAgentUnlockedLead()` |
| `NotificationsScreen.js` | `notifications` | Acceptable — no notification service exists |
| `TenantDashboardScreen.js` | `leads` | Should have a tenant service |
| `MyRequestsScreen.js` | `leads` | Should have a tenant service |
| `AgentAssetsScreen.js` | `agent_assets` | Acceptable — no asset service exists |

### D2. Missing Error Handling in `processReferral`

Three Supabase calls in `processReferral()` (database.js lines 209-228) don't check returned errors:
1. Referrer wallet update
2. New user wallet update  
3. Referral record insert

---

## SECTION E: PRIORITIZED FIX PLAN

### Priority 1 — Critical Database Fixes (Must Fix)

| # | Fix | Impact |
|---|-----|--------|
| 1 | Add `base_price` calculation + missing columns to mobile `createLead` | Correct unlock pricing for mobile-created leads |
| 2 | Change `incrementLeadViews` to use `contact_history` instead of `lead_views` | Web/mobile view data consistency |
| 3 | Add `credit_transactions` records in `processReferral` | Referral bonus audit trail |
| 4 | Add `lead_agent_connections` upsert to mobile `unlockLead` | Web pipeline features work for mobile unlocks |
| 5 | Add `user_id` to mobile lead creation | Tenants can manage their leads |

### Priority 2 — Business Logic Fixes (Should Fix)

| # | Fix | Impact |
|---|-----|--------|
| 6 | Refactor BuyCreditsScreen to use `addCredits()` service function | Remove duplicate code, consistent behavior |
| 7 | Add notifications after lead unlock (agent + tenant) | Feature parity |
| 8 | Add notifications after lead creation (notify agents) | Agents discover mobile-created leads |
| 9 | Refactor direct Supabase calls to use service layer | Maintainability |
| 10 | Add `processReferralOnFirstPurchase` call in payment flow | Two-stage referral alignment |
| 11 | Add input validation to `addCredits` (positive amount check) | Prevent negative credit bugs |

### Priority 3 — Feature Implementation (Nice to Have for MVP)

| # | Feature | Effort Estimate |
|---|---------|-----------------|
| 12 | Support ticket creation (SupportScreen) | Medium |
| 13 | Real-time lead subscriptions | Low |
| 14 | Notification badge + mark-all-read | Low |
| 15 | Bad lead reporting flow | Medium |
| 16 | Agent rating display | Medium |

### Priority 4 — Future Feature Parity

| # | Feature | Effort Estimate |
|---|---------|-----------------|
| 17 | Property listings CRUD | High |
| 18 | Subscription management | High |
| 19 | Voucher viewing | Medium |
| 20 | Agent browse/search for tenants | Medium |
| 21 | Saved properties | Low |
| 22 | Lead outcome tracking | Medium |
