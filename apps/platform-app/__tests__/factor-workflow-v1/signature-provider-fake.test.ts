import { describe, it, expect } from 'vitest';
import { FakeSignatureProvider } from '@/lib/signature/fake';

describe('FakeSignatureProvider', () => {
  it('creates an envelope and returns sent status with signUrls', async () => {
    const provider = new FakeSignatureProvider();

    const result = await provider.createEnvelope({
      templateId: 'tpl_noa',
      signers: [{ role: 'carrier', name: 'Acme Trucking', email: 'driver@acme.test' }],
      subject: 'NOA',
      mode: 'embedded',
      externalId: 'env-1',
    });

    expect(typeof result.providerEnvelopeId).toBe('string');
    expect(result.providerEnvelopeId.length).toBeGreaterThan(0);
    expect(typeof result.signUrls['carrier']).toBe('string');
    expect(result.status).toBe('sent');
  });

  it('simulates envelope.completed and getEnvelope returns completed status', async () => {
    const provider = new FakeSignatureProvider();

    const result = await provider.createEnvelope({
      templateId: 'tpl_noa',
      signers: [{ role: 'carrier', name: 'Acme Trucking', email: 'driver@acme.test' }],
      subject: 'NOA',
      mode: 'embedded',
      externalId: 'env-1',
    });

    // Simulate the event
    provider.simulateEvent('envelope.completed', 'env-1');

    const snapshot = await provider.getEnvelope(result.providerEnvelopeId);
    expect(snapshot.status).toBe('completed');
  });
});
