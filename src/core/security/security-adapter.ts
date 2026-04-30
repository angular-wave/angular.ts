import { _sce } from "../../injection-tokens.ts";
import { hasOwn } from "../../shared/utils.ts";
import type { SceContext } from "../../services/sce/context.ts";

export interface SecurityAdapter {
  getTrusted(context: SceContext | undefined, value: any): any;
  getTrustedMediaUrl(value: any): any;
  valueOf(value?: any): any;
}

const passThroughSecurity: SecurityAdapter = {
  getTrusted: (_context, value) => value,
  getTrustedMediaUrl: (value) => value,
  valueOf: (value) => value,
};

export function getSecurityAdapter(
  $injector: ng.InjectorService,
): SecurityAdapter {
  const providerCache = (
    $injector as unknown as {
      _providerInjector?: { _cache?: Record<string, unknown> };
    }
  )._providerInjector?._cache;

  if (
    !providerCache ||
    (!hasOwn(providerCache, _sce) && !hasOwn(providerCache, `${_sce}Provider`))
  ) {
    return passThroughSecurity;
  }

  return $injector.get(_sce) as SecurityAdapter;
}
