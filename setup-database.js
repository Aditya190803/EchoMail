/**
 * Supabase Database Setup Script
 * Run this script to initialize the EchoMail database tables
 */

import { supabase } from './lib/supabase.js'

async function setupDatabase() {
  console.log('🚀 Setting up EchoMail database...')

  try {
    // Test connection
    console.log('📡 Testing Supabase connection...')
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    if (error && !error.message.includes('relation "_test" does not exist')) {
      throw error
    }
    console.log('✅ Supabase connection successful')

    // Check if tables exist
    console.log('🔍 Checking existing tables...')
    
    const { data: campaignCheck } = await supabase
      .from('email_campaigns')
      .select('id')
      .limit(1)
    
    const { data: contactCheck } = await supabase
      .from('contacts')
      .select('id')
      .limit(1)

    if (campaignCheck !== null && contactCheck !== null) {
      console.log('✅ Database tables already exist and are accessible')
      console.log('📊 Database setup complete!')
      return
    }

    console.log('⚠️  Tables not found or not accessible')
    console.log('📋 Please run the SQL schema in your Supabase dashboard:')
    console.log('   1. Go to your Supabase project > SQL Editor')
    console.log('   2. Copy and run the contents of schema.sql')
    console.log('   3. Run this script again to verify')

  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    console.log('\n🔧 Troubleshooting steps:')
    console.log('1. Check your .env.local file has correct Supabase credentials')
    console.log('2. Verify your Supabase project is active')
    console.log('3. Run the schema.sql in Supabase SQL Editor')
    console.log('4. Check that RLS policies allow your user access')
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
}

export { setupDatabase }
