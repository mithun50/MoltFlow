const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.error('Error: SUPABASE_DB_PASSWORD environment variable is required');
    console.log('\nFind your database password in Supabase Dashboard:');
    console.log('Settings > Database > Database password');
    console.log('\nThen run: SUPABASE_DB_PASSWORD=your-password node scripts/setup-db.js');
    process.exit(1);
  }

  const client = new Client({
    host: 'db.zkgrkhksqtahncrnceob.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!\n');

    // Read and run reset script
    console.log('Running reset script...');
    const resetSql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/000_reset.sql'),
      'utf8'
    );
    await client.query(resetSql);
    console.log('Reset complete!\n');

    // Read and run schema script
    console.log('Running schema migration...');
    const schemaSql = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
      'utf8'
    );
    await client.query(schemaSql);
    console.log('Schema migration complete!\n');

    console.log('Database setup successful!');
    console.log('You can now run: npm run dev');

  } catch (error) {
    console.error('Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
