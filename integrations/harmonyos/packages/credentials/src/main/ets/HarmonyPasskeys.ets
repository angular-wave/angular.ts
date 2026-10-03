import { common } from "@kit.AbilityKit";
import { fido2 } from "@kit.OnlineAuthenticationKit";
import {
  CredentialFailure,
} from "./HarmonyCredentials.ts";
import type {
  CredentialPlatform,
} from "./HarmonyCredentials.ts";
import {
  credentialCreationOptions,
  credentialRequestOptions,
} from "./WebAuthnJson.ts";

interface CredentialStatus {
  readonly available: boolean;
  readonly passwords: boolean;
  readonly passkeys: boolean;
}

interface CredentialGetParameters {
  readonly passkeyRequestJson?: string;
  readonly passwords?: boolean;
}

interface CredentialAuthenticationResult {
  readonly type: string;
  readonly authenticationResponseJson: string;
}

interface CredentialCreateParameters {
  readonly requestJson?: string;
}

interface CredentialCreationResult {
  readonly created: boolean;
  readonly type: string;
}

export class HarmonyPasskeys implements CredentialPlatform {
  private readonly context: common.UIAbilityContext;

  constructor(context: common.UIAbilityContext) {
    this.context = context;
  }

  async status(): Promise<CredentialStatus> {
    try {
      const authenticators = await fido2.getPlatformAuthenticators(this.context);
      const available = authenticators.length > 0;
      return { available, passwords: false, passkeys: available };
    } catch {
      return { available: false, passwords: false, passkeys: false };
    }
  }

  async get(parameters: Readonly<Record<string, ESObject>>): Promise<CredentialAuthenticationResult> {
    const options = parameters as CredentialGetParameters;
    const requestJson = options.passkeyRequestJson;
    if (typeof requestJson !== "string" || requestJson.length === 0) {
      if (options.passwords !== false) {
        throw new CredentialFailure(
          "unavailable",
          "HarmonyOS does not provide password credentials through Online Authentication",
        );
      }
      throw new CredentialFailure(
        "invalid_params",
        "credentials.get requires passkeyRequestJson",
      );
    }
    try {
      const credential = await fido2.authenticate(
        this.context,
        credentialRequestOptions(requestJson) as fido2.CredentialRequestOptions,
      );
      const response = credential.authenticationResponseJson;
      return {
        type: "public-key",
        authenticationResponseJson: typeof response === "string" ? response : JSON.stringify(response),
      };
    } catch (error) {
      throw credentialFailure(error, "Credential authentication failed");
    }
  }

  createPassword(_parameters: Readonly<Record<string, ESObject>>): never {
    throw new CredentialFailure(
      "unavailable",
      "HarmonyOS does not provide password credentials through Online Authentication",
    );
  }

  async createPasskey(parameters: Readonly<Record<string, ESObject>>): Promise<CredentialCreationResult> {
    const options = parameters as CredentialCreateParameters;
    const requestJson = options.requestJson;
    if (typeof requestJson !== "string" || requestJson.length === 0) {
      throw new CredentialFailure(
        "invalid_params",
        "credentials.create-passkey requires requestJson",
      );
    }
    try {
      await fido2.register(
        this.context,
        credentialCreationOptions(requestJson) as fido2.CredentialCreationOptions,
      );
      return { created: true, type: "public-key" };
    } catch (error) {
      throw credentialFailure(error, "Credential registration failed");
    }
  }

  clear(): never {
    throw new CredentialFailure(
      "unavailable",
      "HarmonyOS passkeys are managed by the system and cannot be cleared by the application",
    );
  }
}

function credentialFailure(error: ESObject, fallback: string): CredentialFailure {
  if (error instanceof CredentialFailure) return error;
  if (error instanceof TypeError) return new CredentialFailure("invalid_params", error.message);
  if (error instanceof Error && /cancel/u.test(error.message)) {
    return new CredentialFailure("cancelled", "Credential operation was cancelled");
  }
  return new CredentialFailure("internal", fallback);
}
