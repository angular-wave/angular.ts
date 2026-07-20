/** @internal */
const passThroughSecurityAdapter = {
    getTrusted: (_context, value) => value,
    getTrustedMediaUrl: (value) => value,
    valueOf: (value) => value,
};

export { passThroughSecurityAdapter };
