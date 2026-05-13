import type { SignatureProvider } from './types';
import { FakeSignatureProvider } from './fake';
import { DropboxSignProvider } from './dropbox-sign';

let _provider: SignatureProvider | null = null;

export function getSignatureProvider(): SignatureProvider {
  if (_provider) return _provider;

  const name = process.env.SIGNATURE_PROVIDER ?? 'dropbox-sign';
  if (name === 'fake') {
    _provider = new FakeSignatureProvider();
  } else {
    _provider = new DropboxSignProvider();
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
