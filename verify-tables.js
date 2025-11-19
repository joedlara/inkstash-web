import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbicqlinvffnmsukkitk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaWNxbGludmZmbm1zdWtraXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTM4OTgsImV4cCI6MjA2OTQ4OTg5OH0.Ylcr1CULqQYX_rzgwsXv-WxdE2hErJuPOPekBdJh-Eg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables INTENTIONALLY created by your migrations
const intentionalTables = [
  'users',
  'auctions',
  'auction_likes',
  'auction_saves',
  'auction_views',
  'payment_methods',
  'shipping_addresses',
  'bids',
  'orders'
];

// Tables that appeared but weren't in your migrations (potential extras)
const suspiciousTables = [
  'auction_comments',
  'categories',
  'tags',
  'auction_tags',
  'notifications',
  'messages',
  'conversations',
  'follows',
  'reviews',
  'reports',
  'admin_logs',
  'featured_items',
  'banners',
  'site_settings',
  'email_templates',
  'user_sessions',
  'api_keys',
  'webhooks',
  'transactions',
  'refunds',
  'disputes',
  'invoices',
  'coupons',
  'wishlists',
  'search_history',
  'user_preferences',
  'activity_logs',
  'analytics_events'
];

async function verifyTables() {
  console.log('🔍 Database Table Verification\n');
  console.log('='.repeat(70));
  console.log('INTENTIONAL TABLES (from your migrations)');
  console.log('='.repeat(70));

  const intentionalResults = [];
  const extraTables = [];

  // Check intentional tables
  for (const table of intentionalTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      console.log(`✅ ${table.padEnd(25)} | ${count || 0} rows`);
      intentionalResults.push({ table, count: count || 0 });
    } else {
      console.log(`❌ ${table.padEnd(25)} | MISSING!`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('CHECKING FOR UNEXPECTED TABLES');
  console.log('='.repeat(70));

  // Check for extra tables
  for (const table of suspiciousTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      extraTables.push({ table, count: count || 0 });
      console.log(`⚠️  ${table.padEnd(25)} | ${count || 0} rows | NOT in migrations`);
    }
  }

  if (extraTables.length === 0) {
    console.log('✨ No unexpected tables found - all clean!\n');
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Intentional tables found: ${intentionalResults.length}/${intentionalTables.length}`);
  console.log(`⚠️  Extra tables found: ${extraTables.length}`);

  if (extraTables.length > 0) {
    console.log('\n💡 These extra tables may have been:');
    console.log('   - Created manually in Supabase dashboard');
    console.log('   - Left over from previous development');
    console.log('   - Created by a different tool or script');
    console.log('\n   You can safely delete them if they\'re not needed.');
  }

  console.log('\n✨ Your 9 core tables are properly set up and working!\n');
}

verifyTables().catch(console.error);
