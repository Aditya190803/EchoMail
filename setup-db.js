const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🔧 Setting up database tables...')

  try {
    // Create email_campaigns table
    const { error: campaignsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS email_campaigns (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          subject TEXT NOT NULL,
          recipients INTEGER NOT NULL DEFAULT 0,
          sent INTEGER NOT NULL DEFAULT 0,
          failed INTEGER NOT NULL DEFAULT 0,
          date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'sending', 'failed')),
          user_email TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    })

    if (campaignsError) {
      console.log('⚠️  Could not create tables via RPC, trying direct table operations...')
      
      // Try direct table creation
      const { error: directError } = await supabase
        .from('email_campaigns')
        .select('id')
        .limit(1)
      
      if (directError && directError.code === '42P01') {
        console.error('❌ Tables do not exist. Please run the SQL commands manually in Supabase SQL Editor:')
        console.log('\n📋 Go to your Supabase dashboard > SQL Editor and run the contents of SETUP_DATABASE.sql\n')
        return false
      }
    }

    // Test if tables exist and are accessible
    const { data: campaigns, error: testError } = await supabase
      .from('email_campaigns')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('❌ Database setup failed:', testError.message)
      return false
    }

    console.log('✅ Database tables are ready!')
    return true

  } catch (error) {
    console.error('❌ Setup error:', error.message)
    return false
  }
}

// Run setup
setupDatabase().then(success => {
  if (success) {
    console.log('🎉 Database setup completed successfully!')
  } else {
    console.log('🚨 Please set up the database manually using the SETUP_DATABASE.sql file')
  }
})
