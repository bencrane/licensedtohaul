import type { SignatureProvider } from './types';
import { FakeSignatureProvider } from './fake';
import { DocumensoProvider } from './documenso';

let _provider: SignatureProvider | null = null;

export function getSignatureProvider(): SignatureProvider {
  if (_provider) return _provider;

  const name = process.env.SIGNATURE_PROVIDER ?? 'documenso';
  if (name === 'fake') {
    _provider = new FakeSignatureProvider();
  } else if (name === 'documenso') {
    const apiKey = process.env.DOCUMENSO_API_KEY;
    const apiUrl = process.env.DOCUMENSO_API_URL;
    if (!apiKey || !apiUrl) {
      // Return fake so the app doesn't crash at startup when creds are absent.
      // Route handlers that truly need the real provider should check the keys themselves.
      _provider = new FakeSignatureProvider();
    } else {
      _provider = new DocumensoProvider();
    }
  } else {
    _provider = new FakeSignatureProvider();
  }
  return _provider;
}

/** Reset singleton — used in tests to swap providers between test runs. */
export function resetSignatureProvider(): void {
  _provider = null;
}

export type { SignatureProvider } from './types';
export { FakeSignatureProvider } from './fake';
export { DocumensoProvider } from './documenso';
