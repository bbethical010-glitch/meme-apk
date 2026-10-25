/**
 * Pluggable authentication provider abstraction for analytics uploads.
 * Decouples network delivery from specific credential mechanisms.
 */
export interface AnalyticsAuthProvider {
  /**
   * Returns HTTP headers to attach to outgoing batch uploads.
   */
  getAuthHeaders(): Promise<Record<string, string>> | Record<string, string>;

  /**
   * Called when the backend responds with HTTP 401 Unauthorized.
   * Allows the provider to clear caches or transition to disabled state.
   */
  onAuthFailure(): void;

  /**
   * Returns true if the provider has configured credentials.
   */
  isConfigured(): boolean;

  /**
   * Returns the authentication mechanism name.
   */
  getAuthMode(): string;
}

/**
 * Authentication provider using the static X-Analytics-App-Token header.
 *
 * SECURITY NOTE:
 * Any static token compiled into an Android APK or frontend JavaScript bundle is recoverable
 * by client-side inspection and reverse engineering. This token acts strictly as
 * temporary coarse abuse throttling and must NOT be treated as a secret or durable
 * proof of client integrity.
 */
export class StaticTokenAuthProvider implements AnalyticsAuthProvider {
  private token: string;
  private authDisabled = false;

  constructor(token?: string) {
    // SECURITY: Web builds never read or bundle tokens. Static tokens are only
    // injected explicitly by tests or native Android bridge callers.
    this.token = (token ?? '').trim();
  }

  public getAuthHeaders(): Record<string, string> {
    if (!this.token || this.authDisabled) {
      return {};
    }
    return {
      'X-Analytics-App-Token': this.token,
    };
  }

  public onAuthFailure(): void {
    this.authDisabled = true;
  }

  public isConfigured(): boolean {
    return this.token.length > 0;
  }

  public getAuthMode(): string {
    return 'static_token';
  }

  public isAuthDisabled(): boolean {
    return this.authDisabled;
  }

  public resetAuthDisabled(): void {
    this.authDisabled = false;
  }
}

/**
 * Architecture stub for future production short-lived token or Play Integrity attestation.
 *
 * Production Design:
 * 1. Request Play Integrity attestation verdict or server-issued session token.
 * 2. Attach Authorization: Bearer <short_lived_token> header.
 *
 * NOTE: Unimplemented until backend attestation endpoint is deployed.
 */
export class ServerIssuedAuthProvider implements AnalyticsAuthProvider {
  public getAuthHeaders(): Record<string, string> {
    throw new Error(
      'ServerIssuedAuthProvider is not yet implemented on the backend. ' +
      'Use StaticTokenAuthProvider until attestation verification is deployed.'
    );
  }

  public onAuthFailure(): void {}

  public isConfigured(): boolean {
    return false;
  }

  public getAuthMode(): string {
    return 'server_issued';
  }
}

export const defaultAuthProvider = new StaticTokenAuthProvider();
