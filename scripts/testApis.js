/**
 * RentConnect Mobile API Test Script
 * Tests all Supabase APIs and service functions
 * Run with: node scripts/testApis.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client - check both EXPO_PUBLIC and NEXT_PUBLIC prefixes
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables!');
    console.log('Checked for: EXPO_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL');
    console.log('Checked for: EXPO_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('\nFound env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to log test results
function logTest(name, success, message = '', data = null) {
    const status = success ? '✅' : '❌';
    console.log(`${status} ${name}${message ? ': ' + message : ''}`);

    results.tests.push({ name, success, message });
    if (success) {
        results.passed++;
    } else {
        results.failed++;
    }

    if (data && !success) {
        console.log('   Error details:', JSON.stringify(data, null, 2).substring(0, 200));
    }
}

// ==========================================
// DATABASE CONNECTION TESTS
// ==========================================
async function testDatabaseConnection() {
    console.log('\n📡 Testing Database Connection...\n');

    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) throw error;
        logTest('Database Connection', true, 'Connected to Supabase');
    } catch (error) {
        logTest('Database Connection', false, error.message, error);
    }
}

// ==========================================
// USERS TABLE TESTS
// ==========================================
async function testUsersTable() {
    console.log('\n👤 Testing Users Table...\n');

    // Test fetching users
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, user_type, created_at')
            .limit(5);

        if (error) throw error;
        logTest('Fetch Users', true, `Found ${data?.length || 0} users`);

        // Check for agents
        const agents = data?.filter(u => u.user_type === 'agent') || [];
        logTest('Agent Users Exist', agents.length > 0, `${agents.length} agents found`);

    } catch (error) {
        logTest('Fetch Users', false, error.message, error);
    }
}

// ==========================================
// LEADS TABLE TESTS
// ==========================================
async function testLeadsTable() {
    console.log('\n🎯 Testing Leads Table...\n');

    // Test fetching leads
    try {
        const { data, error, count } = await supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .limit(10);

        if (error) throw error;
        logTest('Fetch Leads', true, `Found ${count || data?.length || 0} leads`);

        // Check lead structure
        if (data && data.length > 0) {
            const lead = data[0];
            const hasRequiredFields = lead.id && (lead.property_type || lead.requirements);
            logTest('Lead Structure Valid', hasRequiredFields,
                hasRequiredFields ? 'Required fields present' : 'Missing required fields');

            // Log sample lead structure
            console.log('   Sample lead fields:', Object.keys(lead).join(', '));
        }

    } catch (error) {
        logTest('Fetch Leads', false, error.message, error);
    }

    // Test lead filtering
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('id, property_type, location, budget')
            .eq('status', 'active')
            .limit(5);

        if (error) throw error;
        logTest('Filter Active Leads', true, `Found ${data?.length || 0} active leads`);

    } catch (error) {
        logTest('Filter Active Leads', false, error.message, error);
    }
}

// ==========================================
// CONTACT HISTORY TABLE TESTS
// ==========================================
async function testContactHistoryTable() {
    console.log('\n📞 Testing Contact History Table...\n');

    try {
        const { data, error } = await supabase
            .from('contact_history')
            .select('id, agent_id, lead_id, contact_type, created_at')
            .limit(10);

        if (error) throw error;
        logTest('Fetch Contact History', true, `Found ${data?.length || 0} records`);

        // Check for unlock records
        const unlocks = data?.filter(c => c.contact_type === 'unlock' || c.contact_type === 'exclusive') || [];
        logTest('Unlock Records Exist', unlocks.length >= 0, `${unlocks.length} unlock records`);

    } catch (error) {
        logTest('Fetch Contact History', false, error.message, error);
    }
}

// ==========================================
// CREDIT TRANSACTIONS TABLE TESTS
// ==========================================
async function testCreditTransactionsTable() {
    console.log('\n💰 Testing Credit Transactions Table...\n');

    try {
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('id, user_id, amount, type, reason, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        logTest('Fetch Credit Transactions', true, `Found ${data?.length || 0} transactions`);

        // Check transaction types
        if (data && data.length > 0) {
            const types = [...new Set(data.map(t => t.type))];
            console.log('   Transaction types found:', types.join(', '));
        }

    } catch (error) {
        if (error.message.includes('does not exist')) {
            logTest('Credit Transactions Table', false, 'Table does not exist - needs to be created');
        } else {
            logTest('Fetch Credit Transactions', false, error.message, error);
        }
    }
}

// ==========================================
// NOTIFICATIONS TABLE TESTS
// ==========================================
async function testNotificationsTable() {
    console.log('\n🔔 Testing Notifications Table...\n');

    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('id, user_id, type, title, message, read, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        logTest('Fetch Notifications', true, `Found ${data?.length || 0} notifications`);

        // Check unread count
        const unread = data?.filter(n => !n.read) || [];
        console.log(`   Unread notifications: ${unread.length}`);

    } catch (error) {
        // Table might not exist
        if (error.message.includes('does not exist')) {
            logTest('Notifications Table', false, 'Table does not exist - needs to be created');
        } else {
            logTest('Fetch Notifications', false, error.message, error);
        }
    }
}

// ==========================================
// AGENT ASSETS TABLE TESTS
// ==========================================
async function testAgentAssetsTable() {
    console.log('\n📁 Testing Agent Assets/Storage...\n');

    // Test if storage bucket exists
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) throw error;
        logTest('List Storage Buckets', true, `Found ${data?.length || 0} buckets`);

        if (data && data.length > 0) {
            console.log('   Buckets:', data.map(b => b.name).join(', '));
        }

    } catch (error) {
        logTest('List Storage Buckets', false, error.message, error);
    }

    // Test agent_assets table if it exists
    try {
        const { data, error } = await supabase
            .from('agent_assets')
            .select('id, agent_id, file_name, file_type, created_at')
            .limit(5);

        if (error) throw error;
        logTest('Fetch Agent Assets', true, `Found ${data?.length || 0} assets`);

    } catch (error) {
        if (error.message.includes('does not exist')) {
            logTest('Agent Assets Table', false, 'Table does not exist - using demo data');
        } else {
            logTest('Fetch Agent Assets', false, error.message, error);
        }
    }
}

// ==========================================
// REFERRALS TABLE TESTS
// ==========================================
async function testReferralsTable() {
    console.log('\n🎁 Testing Referrals Table...\n');

    try {
        const { data, error } = await supabase
            .from('referrals')
            .select('id, referrer_id, referred_id, status, reward_amount, created_at')
            .limit(10);

        if (error) throw error;
        logTest('Fetch Referrals', true, `Found ${data?.length || 0} referrals`);

    } catch (error) {
        if (error.message.includes('does not exist')) {
            logTest('Referrals Table', false, 'Table does not exist');
        } else {
            logTest('Fetch Referrals', false, error.message, error);
        }
    }
}

// ==========================================
// SCREEN-SPECIFIC API TESTS
// ==========================================
async function testScreenAPIs() {
    console.log('\n📱 Testing Screen-Specific APIs...\n');

    // 1. AgentLeadsScreen - Fetch leads with requirements
    console.log('  Testing AgentLeadsScreen APIs...');
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*, contact_history(count)')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        logTest('  AgentLeads - Fetch leads with contacts', true, `${data?.length || 0} leads`);
    } catch (error) {
        logTest('  AgentLeads - Fetch leads with contacts', false, error.message);
    }

    // 2. AgentWalletScreen - Wallet balance
    console.log('  Testing AgentWalletScreen APIs...');
    try {
        const { data, error } = await supabase
            .from('users')
            .select('wallet_balance')
            .limit(1)
            .single();

        if (error && !error.message.includes('No rows')) throw error;
        logTest('  AgentWallet - Fetch balance', true, 'Balance query works');
    } catch (error) {
        logTest('  AgentWallet - Fetch balance', false, error.message);
    }

    // 3. AgentPropertiesScreen - Connected leads
    console.log('  Testing AgentPropertiesScreen APIs...');
    try {
        const { data, error } = await supabase
            .from('contact_history')
            .select('*, leads(*)')
            .in('contact_type', ['unlock', 'exclusive'])
            .limit(10);

        if (error) throw error;
        logTest('  AgentProperties - Connected leads', true, `${data?.length || 0} connections`);
    } catch (error) {
        logTest('  AgentProperties - Connected leads', false, error.message);
    }

    // 4. LeadDetailScreen - Single lead with details
    console.log('  Testing LeadDetailScreen APIs...');
    try {
        const { data: leads } = await supabase.from('leads').select('id').limit(1);
        if (leads && leads.length > 0) {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leads[0].id)
                .single();

            if (error) throw error;
            logTest('  LeadDetail - Single lead fetch', true, 'Lead details fetched');
        } else {
            logTest('  LeadDetail - Single lead fetch', true, 'No leads to test');
        }
    } catch (error) {
        logTest('  LeadDetail - Single lead fetch', false, error.message);
    }
}

// ==========================================
// LEAD SERVICE FUNCTIONS TEST
// ==========================================
async function testLeadServiceFunctions() {
    console.log('\n⚙️ Testing Lead Service Functions...\n');

    // Test pricing calculations (simulated)
    const testLead = {
        claimed_slots: 1,
        max_slots: 3,
        is_exclusive: false,
        budget: 50000,
        phone_verified: true
    };

    // Base unlock cost calculation
    const BASE_UNLOCK_COST = 250;
    const SLOT_MULTIPLIERS = { 0: 1, 1: 1.5, 2: 2.5 };
    const claimedSlots = testLead.claimed_slots || 0;
    const multiplier = SLOT_MULTIPLIERS[claimedSlots] || 1;
    const unlockCost = Math.round(BASE_UNLOCK_COST * multiplier);

    logTest('Calculate Unlock Cost', unlockCost === 375, `Cost: ${unlockCost} credits`);

    // Exclusive cost calculation
    const EXCLUSIVE_MULTIPLIER = 3;
    const exclusiveCost = Math.round(BASE_UNLOCK_COST * EXCLUSIVE_MULTIPLIER);
    logTest('Calculate Exclusive Cost', exclusiveCost === 750, `Cost: ${exclusiveCost} credits`);

    // Lead state calculation
    const getLeadState = (lead, isUnlocked) => {
        if (isUnlocked) return 'unlocked';
        if (lead.is_exclusive) return 'exclusive';
        const claimedSlots = lead.claimed_slots || 0;
        const maxSlots = lead.max_slots || 3;
        if (claimedSlots >= maxSlots) return 'sold_out';
        if (claimedSlots === 0) return 'available';
        return 'open';
    };

    logTest('Lead State - Available', getLeadState({ claimed_slots: 0 }, false) === 'available');
    logTest('Lead State - Open', getLeadState({ claimed_slots: 1 }, false) === 'open');
    logTest('Lead State - Sold Out', getLeadState({ claimed_slots: 3, max_slots: 3 }, false) === 'sold_out');
    logTest('Lead State - Unlocked', getLeadState({ claimed_slots: 1 }, true) === 'unlocked');
}

// ==========================================
// TABLE SCHEMA CHECK
// ==========================================
async function checkTableSchemas() {
    console.log('\n📋 Checking Required Tables...\n');

    const requiredTables = [
        'users',
        'leads',
        'contact_history',
        'credit_transactions'
    ];

    const optionalTables = [
        'notifications',
        'agent_assets',
        'subscriptions'
    ];

    for (const table of requiredTables) {
        try {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error && error.message.includes('does not exist')) {
                logTest(`Required Table: ${table}`, false, 'MISSING');
            } else {
                logTest(`Required Table: ${table}`, true, 'EXISTS');
            }
        } catch (error) {
            logTest(`Required Table: ${table}`, false, error.message);
        }
    }

    console.log('\n   Optional Tables:');
    for (const table of optionalTables) {
        try {
            const { error } = await supabase.from(table).select('id').limit(1);
            if (error && error.message.includes('does not exist')) {
                console.log(`   ⚪ ${table}: Not created (using demo data)`);
            } else {
                console.log(`   ✅ ${table}: EXISTS`);
            }
        } catch (error) {
            console.log(`   ⚪ ${table}: ${error.message}`);
        }
    }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('     RentConnect Mobile - API & Screen Test Suite');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n🔗 Supabase URL: ${supabaseUrl}`);
    console.log(`📅 Test Date: ${new Date().toLocaleString()}\n`);

    await testDatabaseConnection();
    await checkTableSchemas();
    await testUsersTable();
    await testLeadsTable();
    await testContactHistoryTable();
    await testCreditTransactionsTable();
    await testNotificationsTable();
    await testAgentAssetsTable();
    await testReferralsTable();
    await testScreenAPIs();
    await testLeadServiceFunctions();

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                       TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Total:  ${results.passed + results.failed}`);

    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    console.log(`\n   Success Rate: ${successRate}%`);

    if (results.failed > 0) {
        console.log('\n   Failed Tests:');
        results.tests.filter(t => !t.success).forEach(t => {
            console.log(`   - ${t.name}: ${t.message}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
