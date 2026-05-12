import 'server-only';
import { Pool } from 'pg';
import { env } from '@/lib/env';

let _pool: Pool | null = null;
export function pool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: env.HQX_DB_URL_POOLED, max: 4 });
  return _pool;
}
