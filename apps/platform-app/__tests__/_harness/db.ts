import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

export async function createTestSchema(): Promise<{
  schemaName: string;
  client: Client;
  cleanup: () => Promise<void>;
}> {
  const schemaName = `lth_test_${randomBytes(4).toString('hex')}`;
  if (!/^lth_test_[a-f0-9]{8}$/.test(schemaName)) {
    throw new Error(`Invalid generated schema name: ${schemaName}`);
  }

  const connString = process.env.HQX_DB_URL_POOLED;
  if (!connString) throw new Error('HQX_DB_URL_POOLED not set');

  const client = new Client({ connectionString: connString });
  await client.connect();

  await client.query(`CREATE SCHEMA "${schemaName}"`);
  await client.query(`SET search_path = "${schemaName}"`);

  const sqlPath = path.resolve(__dirname, '../../migrations/006_factor_workflow.sql');
  const rawSql = readFileSync(sqlPath, 'utf-8');
  // Replace `lth.` with `"schemaName".` in table references
  const sql = rawSql.replace(/\blth\./g, `"${schemaName}".`);
  await client.query(sql);

  const cleanup = async () => {
    try {
      await client.query(`DROP SCHEMA "${schemaName}" CASCADE`);
    } finally {
      await client.end();
    }
  };

  return { schemaName, client, cleanup };
}
