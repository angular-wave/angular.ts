/** Returns whether a runtime value is a supported cache strategy. */
function isCacheStrategy(value) {
    return (value === "cache-first" ||
        value === "network-first" ||
        value === "stale-while-revalidate");
}
async function loadAndStore(options) {
    const value = await options.load();
    await options.store.set(options.key, value);
    return value;
}
/** Executes one cache policy without coupling it to a transport or storage API. */
async function executeCacheStrategy(options) {
    switch (options.strategy) {
        case "cache-first": {
            const cached = await options.store.get(options.key);
            return cached === undefined
                ? {
                    value: await loadAndStore(options),
                    source: "network",
                    stale: false,
                }
                : { value: cached, source: "cache", stale: false };
        }
        case "network-first":
            try {
                return {
                    value: await loadAndStore(options),
                    source: "network",
                    stale: false,
                };
            }
            catch (error) {
                const cached = await options.store.get(options.key);
                if (cached !== undefined) {
                    return { value: cached, source: "cache", stale: true };
                }
                throw error;
            }
        case "stale-while-revalidate": {
            const cached = await options.store.get(options.key);
            if (cached === undefined) {
                return {
                    value: await loadAndStore(options),
                    source: "network",
                    stale: false,
                };
            }
            void loadAndStore(options).then((value) => {
                options.onRevalidate?.(value);
                return undefined;
            }, () => undefined);
            return { value: cached, source: "cache", stale: true };
        }
    }
}

export { executeCacheStrategy, isCacheStrategy };
