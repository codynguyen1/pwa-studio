const fs = require('fs');
const { CachedInputFileSystem, ResolverFactory } = require('enhanced-resolve');
const optionsValidator = require('../util/options-validator');
const validateConfig = optionsValidator('MagentoResolver', {
    'paths.root': 'string'
});

class MagentoResolver {
    // legacy compatibility
    static async configure(options) {
        const resolver = new MagentoResolver(options);
        return resolver.config;
    }
    get myResolver() {
        if (!this._resolver) {
            this._resolver = ResolverFactory.createResolver({
                // Typical usage will consume the `fs` + `CachedInputFileSystem`, which wraps Node.js `fs` to add caching.
                fileSystem: new CachedInputFileSystem(fs, 4000),
                ...this.config
            });
        }
        return this._resolver;
    }
    constructor(options) {
        const { isEE, paths, ...restOptions } = options;
        validateConfig('.configure()', { paths }); // legacy validation
        const extensions = [
            '.wasm',
            '.mjs',
            isEE ? '.ee.js' : '.ce.js',
            '.js',
            '.jsx',
            '.json',
            '.graphql'
        ];
        this._root = paths.root;
        this.config = {
            alias: {},
            modules: [this._root, 'node_modules'],
            mainFiles: ['index'],
            mainFields: ['esnext', 'es2015', 'module', 'browser', 'main'],
            extensions,
            ...restOptions
        };
        this._context = {};
        this._requestContext = {};
    }
    async resolve(request) {
        return new Promise((res, rej) => {
            try {
                this.myResolver.resolve(
                    this._context,
                    this._root,
                    request,
                    this._requestContext,
                    (err, filepath) => {
                        if (err) {
                            return rej(err);
                        }
                        res(filepath);
                    }
                );
            } catch (e) {
                rej(e);
            }
        });
    }
}

module.exports = MagentoResolver;
