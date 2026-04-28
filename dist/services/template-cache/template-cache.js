/**
 * Provides an instance of a cache that can be used to store and retrieve template content.
 */
class TemplateCacheProvider {
    /**
     * Creates the in-memory template cache backing store.
     */
    constructor() {
        this.cache = new Map();
    }
    /**
     * Returns the singleton template cache instance.
     */
    $get() {
        return this.cache;
    }
}

export { TemplateCacheProvider };
