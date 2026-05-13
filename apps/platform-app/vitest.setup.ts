// Global Vitest setup — runs before all test files.
// DB-touching tests set LTH_SCHEMA per-test via vi.stubEnv or dynamic import.
// This file only provides the DB URL from the environment.

// HQX_DB_URL_POOLED should already be in the environment when tests run
// (doppler or shell export). We don't override it here.
