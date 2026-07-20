const DEFAULT_SECURITY_FALLBACK = "allow";
const DEFAULT_CREDENTIAL_ORDER = [
    "bearer",
    "basic",
    "cookie",
];
/** @internal */
function createSecurityRuntimeConfiguration() {
    return {
        fallback: DEFAULT_SECURITY_FALLBACK,
        allowInsecureOrigins: [],
        credentials: {},
    };
}
/** @internal */
function applySecurityConfiguration(configuration, config) {
    assertSecurityConfig(config);
    if (config.fallback !== undefined) {
        configuration.fallback = config.fallback;
    }
    if (config.allowInsecureOrigins !== undefined) {
        configuration.allowInsecureOrigins = [...config.allowInsecureOrigins];
    }
    if (config.credentials !== undefined) {
        configuration.credentials = {
            ...configuration.credentials,
            ...config.credentials,
        };
    }
    if (config.isAuthenticated !== undefined) {
        configuration.isAuthenticated = config.isAuthenticated;
    }
    if (config.permissions !== undefined) {
        configuration.permissions = config.permissions;
    }
}
function assertSecurityConfig(config) {
    if (!isRecord(config)) {
        throw new Error("$security config must be an object.");
    }
    if (config.fallback !== undefined &&
        config.fallback !== "allow" &&
        config.fallback !== "deny") {
        throw new Error("$security fallback must be 'allow' or 'deny'.");
    }
    if (config.allowInsecureOrigins !== undefined &&
        (!Array.isArray(config.allowInsecureOrigins) ||
            !config.allowInsecureOrigins.every((origin) => typeof origin === "string"))) {
        throw new Error("$security allowInsecureOrigins must be an array of strings.");
    }
    if (config.credentials !== undefined) {
        assertSecurityCredentialConfig(config.credentials);
    }
    if (config.isAuthenticated !== undefined &&
        typeof config.isAuthenticated !== "boolean" &&
        typeof config.isAuthenticated !== "function") {
        throw new Error("$security isAuthenticated must be a boolean or function.");
    }
    if (config.permissions !== undefined &&
        typeof config.permissions !== "function" &&
        (!Array.isArray(config.permissions) ||
            !config.permissions.every((permission) => typeof permission === "string"))) {
        throw new Error("$security permissions must be an array of strings or function.");
    }
}
function assertSecurityCredentialConfig(config) {
    if (!isRecord(config)) {
        throw new Error("$security credentials must be an object.");
    }
    if (config.bearer !== undefined &&
        !isSecurityCredentialSource(config.bearer)) {
        throw new Error("$security bearer credential must be a string or function.");
    }
    if (config.basic !== undefined) {
        if (!isRecord(config.basic)) {
            throw new Error("$security basic credentials must be an object.");
        }
        if (!isSecurityCredentialSource(config.basic.username)) {
            throw new Error("$security basic username must be a string or function.");
        }
        if (!isSecurityCredentialSource(config.basic.password)) {
            throw new Error("$security basic password must be a string or function.");
        }
    }
    if (config.cookie !== undefined && typeof config.cookie !== "boolean") {
        throw new Error("$security cookie credential must be a boolean.");
    }
    if (config.order !== undefined &&
        (!Array.isArray(config.order) ||
            !config.order.every((scheme) => scheme === "bearer" || scheme === "basic" || scheme === "cookie"))) {
        throw new Error("$security credential order must contain bearer, basic, or cookie.");
    }
}
function isSecurityCredentialSource(value) {
    return typeof value === "string" || typeof value === "function";
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * Creates the shared deterministic security policy used by framework services.
 *
 * Requests are evaluated once. An allow decision carries any credentials that
 * `$http` must apply before transport begins. Navigation authorization is
 * declared by the router state tree and resolved here.
 *
 * @internal
 */
function createSecurityPolicy(configuration, getBaseUrl) {
    const asStringHeaders = (headers) => headers ?? {};
    const getHeader = (headers, name) => {
        const key = name.toLowerCase();
        return Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === key)?.[1];
    };
    const isInsecureUrl = (url) => {
        try {
            return new URL(url, getBaseUrl()).protocol === "http:";
        }
        catch {
            return false;
        }
    };
    const isAllowedInsecureOrigin = (url) => {
        try {
            const origin = new URL(url, getBaseUrl()).origin;
            return configuration.allowInsecureOrigins.some((candidate) => {
                try {
                    return new URL(candidate, getBaseUrl()).origin === origin;
                }
                catch {
                    return false;
                }
            });
        }
        catch {
            return false;
        }
    };
    const resolveCredentialSource = (source, context) => {
        const value = typeof source === "function" ? source(context) : source;
        return value === null || value === "" ? undefined : value;
    };
    const encodeBasicCredentials = (credentials, context) => {
        const username = resolveCredentialSource(credentials.username, context);
        const password = resolveCredentialSource(credentials.password, context);
        if (username === undefined || password === undefined) {
            return undefined;
        }
        return btoa(`${username}:${password}`);
    };
    const isSchemeEnabled = (scheme) => {
        if (scheme === "cookie") {
            return configuration.credentials.cookie === true;
        }
        return configuration.credentials[scheme] !== undefined;
    };
    const credentialOrder = () => {
        const result = [];
        for (const scheme of [
            ...(configuration.credentials.order ?? []),
            ...DEFAULT_CREDENTIAL_ORDER,
        ]) {
            if (isSchemeEnabled(scheme) && !result.includes(scheme)) {
                result.push(scheme);
            }
        }
        return result;
    };
    const fallbackDecision = (reason) => configuration.fallback === "deny"
        ? { type: "deny", status: 403, reason }
        : { type: "allow" };
    const insecureDecision = () => ({
        type: "deny",
        status: 401,
        reason: "insecure transport blocked",
    });
    const permitsCredentialTransport = (context, credentials) => {
        if (!isInsecureUrl(context.url) || isAllowedInsecureOrigin(context.url)) {
            return true;
        }
        const headers = asStringHeaders(context.headers);
        const attachedHeaders = credentials?.headers ?? {};
        return !(context.credentials === "include" ||
            getHeader(headers, "authorization") !== undefined ||
            getHeader(headers, "cookie") !== undefined ||
            getHeader(attachedHeaders, "authorization") !== undefined ||
            credentials?.withCredentials === true);
    };
    const allowRequest = (context, credentials) => permitsCredentialTransport(context, credentials)
        ? { type: "allow", credentials }
        : insecureDecision();
    const evaluateRequestDecision = (context) => {
        const headers = asStringHeaders(context.headers);
        const authorization = getHeader(headers, "authorization");
        const transportLabel = {
            beacon: "Beacon",
            http: "HTTP",
            "service-worker": "Service Worker",
            worker: "Worker",
        }[context.transport];
        const unsupportedTransportCredentials = () => ({
            type: "deny",
            status: 401,
            reason: `${transportLabel} transport cannot attach Authorization credentials`,
        });
        if (authorization !== undefined) {
            return context.transport === "http"
                ? allowRequest(context)
                : unsupportedTransportCredentials();
        }
        for (const scheme of credentialOrder()) {
            if (scheme === "bearer") {
                const token = resolveCredentialSource(configuration.credentials.bearer, context);
                if (context.transport !== "http" && token !== undefined) {
                    return unsupportedTransportCredentials();
                }
                if (token) {
                    return allowRequest(context, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                }
            }
            if (scheme === "basic") {
                const credential = encodeBasicCredentials(
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- credentialOrder only returns configured schemes.
                configuration.credentials.basic, context);
                if (context.transport !== "http" && credential !== undefined) {
                    return unsupportedTransportCredentials();
                }
                if (credential) {
                    return allowRequest(context, {
                        headers: { Authorization: `Basic ${credential}` },
                    });
                }
            }
            if (scheme === "cookie") {
                return allowRequest(context, { withCredentials: true });
            }
        }
        if (!permitsCredentialTransport(context)) {
            return insecureDecision();
        }
        return fallbackDecision(credentialOrder().length
            ? "No configured credential matched request context"
            : undefined);
    };
    const hasAuthenticatedPrincipal = (context) => {
        const isAuthenticated = configuration.isAuthenticated;
        if (isAuthenticated === undefined) {
            return Promise.resolve(false);
        }
        return typeof isAuthenticated === "function"
            ? Promise.resolve(isAuthenticated(context)).then(Boolean)
            : Promise.resolve(isAuthenticated);
    };
    const hasPermission = (permission, context) => {
        const permissions = configuration.permissions;
        if (permissions === undefined) {
            return Promise.resolve(false);
        }
        return typeof permissions === "function"
            ? Promise.resolve(permissions(permission, context))
            : Promise.resolve(permissions.includes(permission));
    };
    const routePolicyDecision = async (context) => {
        const routePolicy = context.routePolicy;
        if (!routePolicy) {
            return undefined;
        }
        if (routePolicy.public) {
            return { type: "allow" };
        }
        const redirectOrDeny = (reason, status = 403) => routePolicy.redirectTo
            ? {
                type: "redirect",
                target: routePolicy.redirectTo,
                reason,
            }
            : { type: "deny", status, reason };
        if (routePolicy.authenticated &&
            !(await hasAuthenticatedPrincipal(context))) {
            return redirectOrDeny(routePolicy.reason ?? "Authentication required", 401);
        }
        for (const permission of routePolicy.permissions) {
            if (!(await hasPermission(permission, context))) {
                return redirectOrDeny(routePolicy.reason ?? `Permission '${permission}' required`);
            }
        }
        return { type: "allow" };
    };
    const evaluateNavigationDecision = async (context) => (await routePolicyDecision(context)) ?? fallbackDecision();
    function check(context) {
        return context.operation === "navigation"
            ? evaluateNavigationDecision(context)
            : evaluateRequestDecision(context);
    }
    return { check };
}

export { applySecurityConfiguration, createSecurityPolicy, createSecurityRuntimeConfiguration };
