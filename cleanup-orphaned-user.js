// Quick script to clean up orphaned auth users
// Run with: node cleanup-orphaned-user.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbicqlinvffnmsukkitk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to get this from Supabase dashboard

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Get this key from: Supabase Dashboard > Settings > API > service_role key');
  console.log('Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node cleanup-orphaned-user.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupOrphanedUsers() {
  try {
    console.log('Checking for orphaned auth users...');

    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Get all public users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id');
    if (publicError) throw publicError;

    const publicUserIds = new Set(publicUsers.map(u => u.id));
    const orphanedUsers = authUsers.users.filter(u => !publicUserIds.has(u.id));

    console.log(`Found ${orphanedUsers.length} orphaned auth user(s)`);

    for (const user of orphanedUsers) {
      console.log(`Deleting orphaned user: ${user.email} (${user.id})`);
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) {
        console.error(`Failed to delete ${user.email}:`, error.message);
      } else {
        console.log(`✓ Deleted ${user.email}`);
      }
    }

    console.log('\nCleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupOrphanedUsers();
