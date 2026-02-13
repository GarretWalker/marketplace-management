/**
 * Deploy database schema and RLS policies to Supabase using pg client
 * Using connection pooler (port 6543) for better reliability
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function deploy() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  // Parse connection string and modify to use pooler port
  const urlMatch = dbUrl.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!urlMatch) {
    console.error('❌ Invalid DATABASE_URL format');
    process.exit(1);
  }

  const [, user, password, host, port, database] = urlMatch;

  // Try connection pooler first (port 6543), fallback to direct (5432)
  const poolerPort = 6543;
  
  console.log('📦 Connecting to Supabase PostgreSQL...');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${poolerPort} (connection pooler)`);
  console.log(`   Database: ${database}`);
  console.log(`   User: ${user}`);
  
  const client = new Client({
    host,
    port: poolerPort,
    database,
    user,
    password,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 20000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database via pooler');

    // Read schema file
    console.log('\n📄 Reading shop_local_schema.sql...');
    const schemaPath = path.resolve(__dirname, '../../../shop_local_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    console.log('⚙️  Executing schema SQL (this may take 10-20 seconds)...');
    await client.query(schemaSQL);
    console.log('✅ Schema deployed successfully');

    // Read RLS policies
    console.log('\n📄 Reading shop_local_rls_policies.sql...');
    const rlsPath = path.resolve(__dirname, '../../../shop_local_rls_policies.sql');
    const rlsSQL = fs.readFileSync(rlsPath, 'utf-8');

    // Execute RLS policies
    console.log('⚙️  Executing RLS policies...');
    await client.query(rlsSQL);
    console.log('✅ RLS policies deployed successfully');

    // Verify tables
    console.log('\n🔍 Verifying deployment...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`\n✅ Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    console.log('\n🎉 Database deployment complete!');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

deploy();
