export interface CredentialPlatform {
  status(): unknown | Promise<unknown>;
  get(options: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
  createPassword(options: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
  createPasskey(options: Readonly<Record<string, unknown>>): unknown | Promise<unknown>;
  clear(): unknown | Promise<unknown>;
}

export type CredentialFailureCode = "invalid_params" | "unavailable" | "cancelled" | "internal";

export class CredentialFailure extends Error {
  readonly code: CredentialFailureCode;

  constructor(code: CredentialFailureCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class HarmonyCredentials {
  private readonly platform: CredentialPlatform;

  constructor(platform: CredentialPlatform) {
    this.platform = platform;
  }

  invoke(method: string, parameters: Readonly<Record<string, unknown>> | null): unknown | Promise<unknown> {
    const value = parameters ?? {};
    switch (method) {
      case "status": return this.platform.status();
      case "get": return this.platform.get(value);
      case "create-password": return this.platform.createPassword(value);
      case "create-passkey": return this.platform.createPasskey(value);
      case "clear": return this.platform.clear();
      default: throw new Error(`Unsupported credentials method: ${method}`);
    }
  }
}
