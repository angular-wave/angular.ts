import { cryptoFramework } from "@kit.CryptoArchitectureKit";

export function createHarmonySessionToken(): string {
  try {
    const bytes = cryptoFramework.createRandom().generateRandomSync(32).data;
    let token = "";
    for (let index = 0; index < bytes.length; index += 1) {
      token += bytes[index].toString(16).padStart(2, "0");
    }
    return token;
  } catch {
    throw new Error("HarmonyOS could not create a secure bridge session");
  }
}
