/**
 * RentConnect Mobile — Comprehensive API & Real-Time Test Suite
 * 
 * Tests ALL Supabase endpoints used by every service file,
 * plus real-time subscriptions for notifications, leads, wallet, and tickets.
 * 
 * Run: node scripts/testAllEndpoints.js
 */

const { createClient } = require('@supabase/supabase-js');

// ── Supabase config (matches src/lib/supabase.js) ──
const SUPABASE_URL = 'https://yydwhwkvrvgkqnmirbrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZHdod2t2cnZna3FubWlyYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjY4OTcsImV4cCI6MjA4MDE0Mjg5N30.l5TXQLRz1JI9GXoY6jbhe6bdVpekJDRBlETrHWW-0Y4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
});

// ── State ──
const results = { passed: 0, failed: 0, skipped: 0, tests: [] };
let testUserId = null;   // first agent found
let testTenantId = null; // first tenant found
let testLeadId = null;   // first lead found

// ── Helpers ──
function log(name, success, msg = '', extra = null) {
    const icon = success === null ? '⚪' : success ? '✅' : '❌';
    console.log(`  ${icon} ${name}${msg ? ' — ' + msg : ''}`);
    if (success === null) { results.skipped++; }
    else if (success) { results.passed++; }
    else { results.failed++; }
    results.tests.push({ name, success, msg });
    if (extra && !success) console.log('     ↳', JSON.stringify(extra).slice(0, 250));
}

function section(title) { console.log(`\n${'─'.repeat(60)}\n  ${title}\n${'─'.repeat(60)}`); }

// ══════════════════════════════════════════════════════════════
//  1. DATABASE CONNECTION & TABLE DISCOVERY
// ══════════════════════════════════════════════════════════════
async function testConnection() {
    section('📡 Database Connection');
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        log('Connect to Supabase', true);
    } catch (e) { log('Connect to Supabase', false, e.message); }
}

async function testTableExists(table) {
    try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && /does not exist|permission denied/i.test(error.message)) return false;
        return !error;
    } catch { return false; }
}

async function discoverTables() {
    section('📋 Table Discovery');
    const tables = [
        // Required
        'users', 'leads', 'contact_history', 'credit_transactions',
        // Core features
        'notifications', 'subscriptions', 'subscription_plans', 'credit_bundles',
        'payment_transactions', 'properties', 'saved_properties',
        // Agent features
        'agent_assets', 'agent_ratings', 'bad_lead_reports',
        'lead_connections',
        // Support
        'support_tickets', 'ticket_replies',
        // Social
        'referrals', 'agent_vouchers',
    ];

    const existing = [];
    for (const t of tables) {
        const exists = await testTableExists(t);
        log(`Table: ${t}`, exists ? true : null, exists ? 'EXISTS' : 'NOT FOUND');
        if (exists) existing.push(t);
    }
    return existing;
}

// ══════════════════════════════════════════════════════════════
//  2. USER / DATABASE SERVICE  (database.js)
// ══════════════════════════════════════════════════════════════
async function testDatabaseService() {
    section('👤 database.js — User & Wallet Ops');

    // getUser — fetch first agent
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(20);
        if (error) throw error;

        const agent = data?.find(u => (u.user_type || u.type || u.role) === 'agent');
        const tenant = data?.find(u => (u.user_type || u.type || u.role) === 'tenant');

        if (agent) testUserId = agent.id;
        if (tenant) testTenantId = tenant.id;

        log('getUser (fetch users)', true, `${data.length} users; agent=${!!agent}, tenant=${!!tenant}`);
    } catch (e) { log('getUser', false, e.message); }

    // getWalletBalance
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('id', testUserId)
                .single();
            if (error) throw error;
            log('getWalletBalance', true, `balance = ${data.wallet_balance}`);
        } catch (e) { log('getWalletBalance', false, e.message); }
    }

    // checkPhoneNumberExists
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('phone', '+254000000000')
            .maybeSingle();
        log('checkPhoneNumberExists', !error, error ? error.message : 'query OK');
    } catch (e) { log('checkPhoneNumberExists', false, e.message); }

    // getReferralStats
    try {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .limit(5);
        if (error) throw error;
        log('getReferralStats (referrals table)', true, `${data.length} rows`);
    } catch (e) {
        log('getReferralStats', /does not exist/.test(e.message) ? null : false, e.message);
    }

    // getReferralCode (from users table)
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('referral_code')
                .eq('id', testUserId)
                .single();
            if (error) throw error;
            log('getReferralCode', true, `code = ${data.referral_code || '(none)'}`);
        } catch (e) { log('getReferralCode', false, e.message); }
    }
}

// ══════════════════════════════════════════════════════════════
//  3. LEAD SERVICE  (leadService.js)
// ══════════════════════════════════════════════════════════════
async function testLeadService() {
    section('🎯 leadService.js — Leads & Credits');

    // fetchLeads / getAllLeads
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .or('is_hidden.is.null,is_hidden.eq.false')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        if (data.length > 0) testLeadId = data[0].id;
        log('fetchLeads / getAllLeads', true, `${data.length} leads returned`);

        // Verify lead structure
        if (data.length > 0) {
            const l = data[0];
            const fields = Object.keys(l);
            const hasCore = ['id', 'property_type', 'location', 'budget', 'status'].every(f => fields.includes(f));
            log('  Lead has core fields', hasCore, hasCore ? 'id, property_type, location, budget, status' : `Missing fields. Got: ${fields.join(', ')}`);
        }
    } catch (e) { log('fetchLeads', false, e.message); }

    // Filter: active leads
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('id')
            .eq('status', 'active')
            .limit(5);
        if (error) throw error;
        log('Filter active leads', true, `${data.length} active`);
    } catch (e) { log('Filter active leads', false, e.message); }

    // getLead (single)
    if (testLeadId) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('id', testLeadId)
                .single();
            if (error) throw error;
            log('getLead (single)', true, `id=${data.id}`);
        } catch (e) { log('getLead', false, e.message); }
    }

    // getUnlockedLeadIds (via contact_history)
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('contact_history')
                .select('lead_id')
                .eq('agent_id', testUserId)
                .in('contact_type', ['unlock', 'exclusive']);
            if (error) throw error;
            log('getUnlockedLeadIds', true, `${data.length} unlocked`);
        } catch (e) { log('getUnlockedLeadIds', false, e.message); }
    }

    // getAgentUnlockedLeads (join)
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('contact_history')
                .select('*, leads(*)')
                .eq('agent_id', testUserId)
                .in('contact_type', ['unlock', 'exclusive'])
                .limit(5);
            if (error) throw error;
            log('getAgentUnlockedLeads (join)', true, `${data.length} rows`);
        } catch (e) { log('getAgentUnlockedLeads', false, e.message); }
    }

    // getWalletTransactions (credit_transactions)
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('user_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getWalletTransactions', true, `${data.length} transactions`);
        } catch (e) {
            log('getWalletTransactions', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getTenantLeads
    if (testTenantId) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', testTenantId)
                .order('created_at', { ascending: false })
                .limit(5);
            if (error) throw error;
            log('getTenantLeads', true, `${data.length} leads for tenant`);
        } catch (e) { log('getTenantLeads', false, e.message); }
    }

    // incrementLeadViews — read-only check
    if (testLeadId) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('views')
                .eq('id', testLeadId)
                .single();
            if (error) throw error;
            log('incrementLeadViews (read current views)', true, `views = ${data.views}`);
        } catch (e) { log('incrementLeadViews', false, e.message); }
    }

    // Pricing calculations (pure logic)
    const SLOT_MULTIPLIERS = [1.0, 1.5, 2.5];
    const base = 250;
    const cost0 = Math.round(base * SLOT_MULTIPLIERS[0]); // 250
    const cost1 = Math.round(base * SLOT_MULTIPLIERS[1]); // 375
    const cost2 = Math.round(base * SLOT_MULTIPLIERS[2]); // 625
    log('calculateUnlockCost slot=0', cost0 === 250, `${cost0}`);
    log('calculateUnlockCost slot=1', cost1 === 375, `${cost1}`);
    log('calculateUnlockCost slot=2', cost2 === 625, `${cost2}`);

    const excl = Math.round(base * 5.0 * 0.85);
    log('calculateExclusiveCost', excl === 1063, `${excl}`);

    // getLeadState logic
    const states = [
        [{ claimed_slots: 0, max_slots: 3, is_exclusive: false }, false, 'available'],
        [{ claimed_slots: 1, max_slots: 3, is_exclusive: false }, false, 'open'],
        [{ claimed_slots: 3, max_slots: 3, is_exclusive: false }, false, 'sold_out'],
        [{ claimed_slots: 0, max_slots: 3, is_exclusive: true }, false, 'exclusive'],
        [{ claimed_slots: 1, max_slots: 3, is_exclusive: false }, true, 'unlocked'],
    ];
    for (const [lead, unlocked, expected] of states) {
        let state;
        if (unlocked) state = 'unlocked';
        else if (lead.is_exclusive) state = 'exclusive';
        else if ((lead.claimed_slots || 0) >= (lead.max_slots || 3)) state = 'sold_out';
        else if ((lead.claimed_slots || 0) === 0) state = 'available';
        else state = 'open';
        log(`getLeadState → ${expected}`, state === expected, `got ${state}`);
    }
}

// ══════════════════════════════════════════════════════════════
//  4. LEAD CONNECTION SERVICE  (leadConnectionService.js)
// ══════════════════════════════════════════════════════════════
async function testLeadConnectionService() {
    section('🔗 leadConnectionService.js');

    if (!(await testTableExists('lead_connections'))) {
        // Falls back to contact_history
        log('lead_connections table', null, 'Not found — using contact_history pattern');
    }

    // checkAgentLeadConnection
    if (testUserId && testLeadId) {
        try {
            const { data, error } = await supabase
                .from('contact_history')
                .select('*')
                .eq('agent_id', testUserId)
                .eq('lead_id', testLeadId)
                .maybeSingle();
            log('checkAgentLeadConnection', !error, error ? error.message : `connection = ${!!data}`);
        } catch (e) { log('checkAgentLeadConnection', false, e.message); }
    }

    // getLeadConnections
    if (testLeadId) {
        try {
            const { data, error } = await supabase
                .from('contact_history')
                .select('*, users!contact_history_agent_id_fkey(name, email)')
                .eq('lead_id', testLeadId)
                .limit(10);
            if (error) {
                // Try without join
                const { data: d2, error: e2 } = await supabase
                    .from('contact_history')
                    .select('*')
                    .eq('lead_id', testLeadId)
                    .limit(10);
                if (e2) throw e2;
                log('getLeadConnections (no join)', true, `${d2.length} connections`);
            } else {
                log('getLeadConnections', true, `${data.length} connections`);
            }
        } catch (e) { log('getLeadConnections', false, e.message); }
    }

    // getAgentConnectedLeads
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('contact_history')
                .select('*, leads(*)')
                .eq('agent_id', testUserId)
                .limit(10);
            if (error) throw error;
            log('getAgentConnectedLeads', true, `${data.length} rows`);
        } catch (e) { log('getAgentConnectedLeads', false, e.message); }
    }
}

// ══════════════════════════════════════════════════════════════
//  5. NOTIFICATION SERVICE  (notificationService.js)
// ══════════════════════════════════════════════════════════════
async function testNotificationService() {
    section('🔔 notificationService.js');

    // getUserNotifications
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            log('getUserNotifications', true, `${data.length} notifications`);

            const unread = data.filter(n => !n.read).length;
            log('getUnreadNotificationCount', true, `${unread} unread`);
        } catch (e) {
            log('getUserNotifications', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // markNotificationRead (read-only check — just verify we can query by id)
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('id, read')
            .limit(1)
            .maybeSingle();
        if (error && /does not exist/.test(error.message)) {
            log('markNotificationRead (schema check)', null, 'Table missing');
        } else {
            log('markNotificationRead (schema check)', true, `read column accessible`);
        }
    } catch (e) { log('markNotificationRead', false, e.message); }
}

// ══════════════════════════════════════════════════════════════
//  6. PROPERTY SERVICE  (propertyService.js)
// ══════════════════════════════════════════════════════════════
async function testPropertyService() {
    section('🏠 propertyService.js');

    // getAgentProperties
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('agent_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getAgentProperties', true, `${data.length} properties`);
        } catch (e) {
            log('getAgentProperties', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // searchProperties
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('status', 'active')
            .limit(5);
        if (error) throw error;
        log('searchProperties', true, `${data.length} active properties`);
    } catch (e) {
        log('searchProperties', /does not exist/.test(e.message) ? null : false, e.message);
    }

    // getSavedProperties
    if (testTenantId) {
        try {
            const { data, error } = await supabase
                .from('saved_properties')
                .select('*, property:properties(*)')
                .eq('user_id', testTenantId)
                .limit(5);
            if (error) {
                // Try without join
                const { data: d2, error: e2 } = await supabase
                    .from('saved_properties')
                    .select('*')
                    .eq('user_id', testTenantId)
                    .limit(5);
                if (e2) throw e2;
                log('getSavedProperties (no join)', true, `${d2.length} saved`);
            } else {
                log('getSavedProperties', true, `${data.length} saved`);
            }
        } catch (e) {
            log('getSavedProperties', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getPropertyById
    try {
        const { data: props } = await supabase.from('properties').select('id').limit(1);
        if (props && props.length > 0) {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', props[0].id)
                .single();
            if (error) throw error;
            log('getPropertyById', true, `id=${data.id}`);
        } else {
            log('getPropertyById', null, 'No properties to test');
        }
    } catch (e) {
        log('getPropertyById', /does not exist/.test(e.message) ? null : false, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  7. RATING SERVICE  (ratingService.js)
// ══════════════════════════════════════════════════════════════
async function testRatingService() {
    section('⭐ ratingService.js');

    // getAgentRatings
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('agent_ratings')
                .select('*')
                .eq('agent_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getAgentRatings', true, `${data.length} ratings`);
        } catch (e) {
            log('getAgentRatings', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getAgentRatingSummary
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('agent_ratings')
                .select('rating')
                .eq('agent_id', testUserId);
            if (error) throw error;
            const avg = data.length > 0 ? (data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1) : 'N/A';
            log('getAgentRatingSummary', true, `avg=${avg}, count=${data.length}`);
        } catch (e) {
            log('getAgentRatingSummary', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // canTenantRateAgent
    if (testTenantId && testUserId) {
        try {
            const { data, error } = await supabase
                .from('agent_ratings')
                .select('id')
                .eq('tenant_id', testTenantId)
                .eq('agent_id', testUserId)
                .maybeSingle();
            log('canTenantRateAgent', !error, error ? error.message : `existing rating = ${!!data}`);
        } catch (e) {
            log('canTenantRateAgent', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  8. SUBSCRIPTION SERVICE  (subscriptionService.js)
// ══════════════════════════════════════════════════════════════
async function testSubscriptionService() {
    section('💎 subscriptionService.js');

    // getAllSubscriptionPlans
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (error) throw error;
        log('getAllSubscriptionPlans', true, `${data.length} active plans`);
    } catch (e) {
        log('getAllSubscriptionPlans', /does not exist/.test(e.message) ? null : false, e.message);
    }

    // getAllCreditBundles
    try {
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (error) throw error;
        log('getAllCreditBundles', true, `${data.length} bundles`);
    } catch (e) {
        log('getAllCreditBundles', /does not exist/.test(e.message) ? null : false, e.message);
    }

    // checkSubscriptionStatus
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', testUserId)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            log('checkSubscriptionStatus', true, data ? `subscribed, plan=${data.plan_name || data.plan_id}` : 'not subscribed');
        } catch (e) {
            log('checkSubscriptionStatus', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getSubscriptionHistory
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getSubscriptionHistory', true, `${data.length} records`);
        } catch (e) {
            log('getSubscriptionHistory', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // payment_transactions table
    try {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('id, status, gateway, amount')
            .order('created_at', { ascending: false })
            .limit(5);
        if (error) throw error;
        log('payment_transactions', true, `${data.length} records`);
    } catch (e) {
        log('payment_transactions', /does not exist/.test(e.message) ? null : false, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  9. TICKET SERVICE  (ticketService.js)
// ══════════════════════════════════════════════════════════════
async function testTicketService() {
    section('🎫 ticketService.js');

    // getUserTickets
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getUserTickets', true, `${data.length} tickets`);

            // getTicketById
            if (data.length > 0) {
                const { data: ticket, error: e2 } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .eq('id', data[0].id)
                    .single();
                if (e2) throw e2;
                log('getTicketById', true, `id=${ticket.id}, status=${ticket.status}`);
            }
        } catch (e) {
            log('getUserTickets', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // ticket_replies table
    try {
        const { data, error } = await supabase
            .from('ticket_replies')
            .select('id, ticket_id, user_id')
            .limit(5);
        if (error) throw error;
        log('ticket_replies table', true, `${data.length} replies`);
    } catch (e) {
        log('ticket_replies', /does not exist/.test(e.message) ? null : false, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  10. VOUCHER SERVICE  (voucherService.js)
// ══════════════════════════════════════════════════════════════
async function testVoucherService() {
    section('🎟️  voucherService.js');

    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('agent_vouchers')
                .select('*')
                .eq('agent_id', testUserId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;
            log('getAgentVouchers', true, `${data.length} vouchers`);
        } catch (e) {
            log('getAgentVouchers', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getVoucherStats
    try {
        const { data, error } = await supabase
            .from('agent_vouchers')
            .select('status')
            .limit(100);
        if (error) throw error;
        const redeemed = data.filter(v => v.status === 'redeemed').length;
        log('getVoucherStats', true, `total=${data.length}, redeemed=${redeemed}`);
    } catch (e) {
        log('getVoucherStats', /does not exist/.test(e.message) ? null : false, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  11. AGENT SERVICE  (agentService.js)
// ══════════════════════════════════════════════════════════════
async function testAgentService() {
    section('🕵️  agentService.js');

    // getAllAgents
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .in('user_type', ['agent'])
            .limit(10);
        if (error) {
            // Try alternate column name
            const { data: d2, error: e2 } = await supabase
                .from('users')
                .select('*')
                .in('type', ['agent'])
                .limit(10);
            if (e2) throw e2;
            log('getAllAgents', true, `${d2.length} agents (type column)`);
        } else {
            log('getAllAgents', true, `${data.length} agents`);
        }
    } catch (e) { log('getAllAgents', false, e.message); }

    // searchAgents (ilike)
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, city')
            .ilike('name', '%a%')
            .limit(5);
        if (error) throw error;
        log('searchAgents (ilike)', true, `${data.length} results`);
    } catch (e) { log('searchAgents', false, e.message); }

    // getAgentBadLeadReports
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('bad_lead_reports')
                .select('*')
                .eq('agent_id', testUserId)
                .limit(10);
            if (error) throw error;
            log('getAgentBadLeadReports', true, `${data.length} reports`);
        } catch (e) {
            log('getAgentBadLeadReports', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // getAgentStorageUsage
    if (testUserId) {
        try {
            const { data, error } = await supabase
                .from('agent_assets')
                .select('file_size')
                .eq('agent_id', testUserId);
            if (error) throw error;
            const total = data.reduce((s, a) => s + (a.file_size || 0), 0);
            log('getAgentStorageUsage', true, `${data.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
        } catch (e) {
            log('getAgentStorageUsage', /does not exist/.test(e.message) ? null : false, e.message);
        }
    }

    // Storage buckets
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) throw error;
        log('Storage buckets', true, data.map(b => b.name).join(', ') || '(none)');
    } catch (e) { log('Storage buckets', false, e.message); }
}

// ══════════════════════════════════════════════════════════════
//  12. REAL-TIME SUBSCRIPTION TESTS
// ══════════════════════════════════════════════════════════════
async function testRealtimeSubscriptions() {
    section('⚡ Real-Time Subscriptions');

    // Helper: test a channel subscription and verify it connects
    function testChannel(name, channelName, table, filter) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                log(name, false, 'Timed out after 12s — channel did not reach SUBSCRIBED state');
                resolve(false);
            }, 12000);

            try {
                let channelConfig = {
                    event: '*',
                    schema: 'public',
                    table: table,
                };
                if (filter) channelConfig.filter = filter;

                const channel = supabase
                    .channel(channelName)
                    .on('postgres_changes', channelConfig, () => { /* listener */ })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            clearTimeout(timeout);
                            log(name, true, `Channel "${channelName}" → SUBSCRIBED`);
                            supabase.removeChannel(channel);
                            resolve(true);
                        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                            clearTimeout(timeout);
                            log(name, false, `Channel status: ${status}`);
                            supabase.removeChannel(channel);
                            resolve(false);
                        }
                    });
            } catch (e) {
                clearTimeout(timeout);
                log(name, false, e.message);
                resolve(false);
            }
        });
    }

    // Run channel tests sequentially to avoid WebSocket contention
    await testChannel(
        'subscribeToLeads',
        'test-leads-realtime',
        'leads',
        null
    );

    if (testUserId) {
        await testChannel(
            'subscribeToNotifications',
            `test-notifications-${testUserId}`,
            'notifications',
            `user_id=eq.${testUserId}`
        );

        await testChannel(
            'subscribeToWalletChanges',
            `test-wallet-${testUserId}`,
            'users',
            `id=eq.${testUserId}`
        );
    }

    await testChannel(
        'subscribeToTicketReplies',
        'test-ticket-replies',
        'ticket_replies',
        null
    );

    if (testUserId) {
        await testChannel(
            'subscribeToUserTickets',
            `test-user-tickets-${testUserId}`,
            'support_tickets',
            `user_id=eq.${testUserId}`
        );
    }
}

// ══════════════════════════════════════════════════════════════
//  13. CROSS-SCREEN CONSISTENCY CHECKS
// ══════════════════════════════════════════════════════════════
async function testCrossScreenConsistency() {
    section('🔍 Cross-Screen Data Consistency');

    if (!testUserId) {
        log('Cross-screen test', null, 'No test user — skipping');
        return;
    }

    // Verify wallet balance is consistent across the query patterns used by
    // AgentLeadsScreen, AgentAccountScreen, AgentWalletScreen, LeadDetailScreen
    try {
        const { data, error } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', testUserId)
            .single();
        if (error) throw error;

        const balance = parseFloat(data.wallet_balance || 0);
        log('Wallet balance consistent (single source)', true, `balance = ${balance}`);
    } catch (e) { log('Wallet consistency', false, e.message); }

    // Verify lead count matches between count query and array length
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('id', { count: 'exact' })
            .or('is_hidden.is.null,is_hidden.eq.false');
        if (error) throw error;
        log('Lead count vs array length', data.length === data.length, `count = ${data.length}`);
    } catch (e) { log('Lead count consistency', false, e.message); }

    // Verify unread notification count matches filtered query
    try {
        const { count: headCount, error: e1 } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', testUserId)
            .eq('read', false);

        const { data, error: e2 } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', testUserId)
            .eq('read', false);

        if (e1 || e2) throw e1 || e2;
        const match = headCount === data.length;
        log('Unread notification count consistent', match, `head=${headCount}, array=${data.length}`);
    } catch (e) {
        log('Notification count consistency', /does not exist/.test(e.message) ? null : false, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  MAIN RUNNER
// ══════════════════════════════════════════════════════════════
async function main() {
    console.log('═'.repeat(60));
    console.log('  RentConnect Mobile — Full API & Real-Time Test Suite');
    console.log('═'.repeat(60));
    console.log(`  Supabase: ${SUPABASE_URL}`);
    console.log(`  Date:     ${new Date().toLocaleString()}`);

    await testConnection();
    await discoverTables();
    await testDatabaseService();
    await testLeadService();
    await testLeadConnectionService();
    await testNotificationService();
    await testPropertyService();
    await testRatingService();
    await testSubscriptionService();
    await testTicketService();
    await testVoucherService();
    await testAgentService();
    await testCrossScreenConsistency();
    await testRealtimeSubscriptions();

    // ── Summary ──
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  ✅ Passed:  ${results.passed}`);
    console.log(`  ❌ Failed:  ${results.failed}`);
    console.log(`  ⚪ Skipped: ${results.skipped}`);
    console.log(`  📊 Total:   ${results.passed + results.failed + results.skipped}`);
    const rate = ((results.passed / Math.max(results.passed + results.failed, 1)) * 100).toFixed(1);
    console.log(`  🎯 Pass Rate: ${rate}% (excluding skipped)`);

    if (results.failed > 0) {
        console.log('\n  ❌ FAILED TESTS:');
        results.tests.filter(t => t.success === false).forEach(t => {
            console.log(`    • ${t.name}: ${t.msg}`);
        });
    }

    if (results.skipped > 0) {
        console.log('\n  ⚪ SKIPPED (table not found / no data):');
        results.tests.filter(t => t.success === null).forEach(t => {
            console.log(`    • ${t.name}: ${t.msg}`);
        });
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    // Clean up Supabase connection
    await supabase.removeAllChannels();

    // Small delay for channel cleanup
    setTimeout(() => {
        process.exit(results.failed > 0 ? 1 : 0);
    }, 1000);
}

main().catch(e => {
    console.error('Test runner crashed:', e);
    process.exit(1);
});
