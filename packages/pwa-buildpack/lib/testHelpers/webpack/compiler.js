const path = require('path');
const MagentoResolver = require('../../WebpackTools/MagentoResolver');
const webpack = require('webpack');

module.exports = config => {
    const defaults = {
        mode: 'none',
        module: {
            rules: [
                {
                    test: /\.(mjs|js|jsx)$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                envName: 'development',
                                root: config.context,
                                rootMode: 'upward-optional'
                            }
                        }
                    ]
                }
            ]
        },
        resolve: new MagentoResolver({ paths: { root: config.context } })
            .config,
        optimization: {
            minimize: false
        },
        output: {
            path: config.context
        }
    };
    const finalOptions = Object.assign({}, config);

    // one extra layer of merge depth
    for (const [section, defaultValue] of Object.entries(defaults)) {
        if (!config.hasOwnProperty(section)) {
            finalOptions[section] = defaultValue;
        }
        if (
            typeof config[section] === 'object' &&
            typeof defaultValue === 'object'
        ) {
            finalOptions[section] = Object.assign(
                {},
                defaultValue,
                config[section]
            );
        }
    }

    const compiler = webpack(finalOptions);
    const files = {};
    const logs = {
        mkdirp: [],
        writeFile: []
    };
    compiler.outputFileSystem = {
        join() {
            return [].join.call(arguments, '/').replace(/\/+/g, '/');
        },
        mkdirp(path, callback) {
            logs.mkdirp.push(path);
            callback();
        },
        writeFile(absPath, content, callback) {
            const name = path.relative(finalOptions.context, absPath);
            logs.writeFile.push(name, content);
            files[name] = content.toString('utf-8');
            callback();
        }
    };
    compiler.hooks.compilation.tap(
        'CompilerTest',
        compilation => (compilation.bail = true)
    );

    const runCompile = () =>
        new Promise((res, rej) => {
            compiler.run((err, stats) => {
                if (err) {
                    return rej(err);
                }
                stats = stats.toJson({
                    modules: true,
                    reasons: true
                });
                if (stats.errors.length > 0) {
                    return rej(stats.errors[0]);
                }
                res({ stats, logs, files });
            });
        });

    return { compiler, runCompile };
};
