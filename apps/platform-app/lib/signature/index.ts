import type { SignatureProvider } from './types';
import { FakeSignatureProvider } from './fake';
import { DropboxSignProvider } from './dropbox-sign';

let _provider: SignatureProvider | null = null;

export function getSignatureProvider(): SignatureProvider {
  if (_provider) return _provider;

  const name = process.env.SIGNATURE_PROVIDER ?? 'dropbox-sign';
  if (name === 'fake') {
    _provider = new FakeSignatureProvider();
  } else if (name === 'dropbox-sign') {
    const apiKey = process.env.DROPBOX_SIGN_API_KEY;
    if (!apiKey) {
      // Return fake so the app doesn't crash at startup when creds are absent.
      // Route handlers that truly need the real provider should check the key themselves.
      _provider = new FakeSignatureProvider();
    } else {
      _provider = new DropboxSignProvider();
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
export { DropboxSignProvider } from './dropbox-sign';
