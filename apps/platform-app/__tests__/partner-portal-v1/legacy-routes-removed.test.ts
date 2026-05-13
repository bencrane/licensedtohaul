// Test 1: legacy lead-broker routes/components/libs are gone
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '../../');

function dirExists(rel: string): boolean {
  return existsSync(path.join(APP_ROOT, rel));
}

function fileExists(rel: string): boolean {
  return existsSync(path.join(APP_ROOT, rel));
}

describe('legacy routes removed', () => {
  it('partner slug sub-routes: no audience/catalog/compose/defaults/spec/pipeline/transfers', () => {
    const legacyRouteDirs = [
      'app/partner/[slug]/audience',
      'app/partner/[slug]/catalog',
      'app/partner/[slug]/compose',
      'app/partner/[slug]/defaults',
      'app/partner/[slug]/spec',
      'app/partner/[slug]/pipeline',
      'app/partner/[slug]/transfers',
    ];
    for (const d of legacyRouteDirs) {
      expect(dirExists(d), `Expected ${d} to be deleted`).toBe(false);
    }
  });

  it('legacy components: no audience-composer/audience-specs/audience-catalog/partner-defaults', () => {
    const legacyComponentDirs = [
      'components/audience-composer',
      'components/audience-specs',
      'components/audience-catalog',
      'components/partner-defaults',
    ];
    for (const d of legacyComponentDirs) {
      expect(dirExists(d), `Expected ${d} to be deleted`).toBe(false);
    }
  });

  it('legacy libs: no audience-specs/audience-templates/transfers/partner-defaults/audience-pricing/mock-factor-transfers', () => {
    const legacyLibPaths = [
      'lib/audience-specs',
      'lib/audience-templates.ts',
      'lib/transfers',
      'lib/partner-defaults',
      'lib/audience-pricing.ts',
      'lib/mock-factor-transfers.ts',
      'lib/messages',
    ];
    for (const p of legacyLibPaths) {
      expect(dirExists(p) || fileExists(p), `Expected ${p} to be deleted`).toBe(false);
    }
  });
});
