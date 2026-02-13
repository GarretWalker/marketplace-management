/**
 * Deploy database schema to Supabase
 * Run with: ts-node src/scripts/deploy-schema.ts
 */
import { supabaseAdmin } from '../config/supabase';
import { logger } from '../config/pino';
import * as fs from 'fs';
import * as path from 'path';

async function deploySchema() {
  try {
    logger.info('Starting schema deployment...');

    // Read schema file
    const schemaPath = path.resolve(__dirname, '../../../shop_local_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    logger.info('Executing schema SQL...');
    const { error: schemaError } = await supabaseAdmin.rpc('exec_sql', {
      sql: schema,
    });

    if (schemaError) {
      // Try direct execution if rpc doesn't work
      logger.warn('RPC method failed, attempting direct execution...');
      const { error } = await supabaseAdmin.from('_sql_exec').insert({ sql: schema });
      if (error) {
        throw new Error(`Schema deployment failed: ${JSON.stringify(schemaError)}`);
      }
    }

    logger.info('Schema deployed successfully');

    // Read RLS policies
    const rlsPath = path.resolve(__dirname, '../../../shop_local_rls_policies.sql');
    const rls = fs.readFileSync(rlsPath, 'utf-8');

    logger.info('Executing RLS policies...');
    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: rls,
    });

    if (rlsError) {
      logger.warn('RPC method failed for RLS, attempting direct execution...');
      const { error } = await supabaseAdmin.from('_sql_exec').insert({ sql: rls });
      if (error) {
        throw new Error(`RLS deployment failed: ${JSON.stringify(rlsError)}`);
      }
    }

    logger.info('RLS policies deployed successfully');
    logger.info('✅ Database setup complete!');
    
  } catch (error) {
    logger.error({ err: error }, 'Schema deployment failed');
    process.exit(1);
  }
}

deploySchema();
