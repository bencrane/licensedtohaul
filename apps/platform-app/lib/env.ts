import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_HQX_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_HQX_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  HQX_DB_URL_POOLED: z.string().min(1),
  APP_ENV: z.enum(['dev', 'stg', 'prd']),
  HQX_API_BASE_URL: z.string().url().optional(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_HQX_SUPABASE_URL: process.env.NEXT_PUBLIC_HQX_SUPABASE_URL,
  NEXT_PUBLIC_HQX_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_HQX_SUPABASE_PUBLISHABLE_KEY,
  HQX_DB_URL_POOLED: process.env.HQX_DB_URL_POOLED,
  APP_ENV: process.env.APP_ENV,
  HQX_API_BASE_URL: process.env.HQX_API_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Invalid environment: ${issues}`);
}

export const env = parsed.data;
