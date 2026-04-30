import { _sce } from '../../injection-tokens.js';
import { hasOwn } from '../../shared/utils.js';

const passThroughSecurity = {
    getTrusted: (_context, value) => value,
    getTrustedMediaUrl: (value) => value,
    valueOf: (value) => value,
};
function getSecurityAdapter($injector) {
    const providerCache = $injector._providerInjector?._cache;
    if (!providerCache ||
        (!hasOwn(providerCache, _sce) && !hasOwn(providerCache, `${_sce}Provider`))) {
        return passThroughSecurity;
    }
    return $injector.get(_sce);
}

export { getSecurityAdapter };
