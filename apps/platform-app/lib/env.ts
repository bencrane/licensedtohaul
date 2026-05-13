import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  LTH_DB_POOLED_URL: z.string().min(1),
  APP_ENV: z.enum(['dev', 'stg', 'prd']),
  FMCSA_API_BASE_URL: z.string().url().optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  LTH_DB_POOLED_URL: process.env.LTH_DB_POOLED_URL,
  APP_ENV: process.env.APP_ENV,
  FMCSA_API_BASE_URL: process.env.FMCSA_API_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Invalid environment: ${issues}`);
}

export const env = parsed.data;
