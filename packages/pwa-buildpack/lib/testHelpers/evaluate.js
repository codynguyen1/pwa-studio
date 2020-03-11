const path = require('path');
const babel = require('@babel/core');
const vm = require('vm');

const evalScript = (content, require) => {
    const sandbox = { require, exports: {} };
    vm.runInNewContext(content, sandbox);
    if (sandbox.exports.default) {
        return Object.assign(sandbox.exports.default, sandbox.exports);
    }
    return sandbox;
};

const evalEsModule = (source, require, babelOptions = {}) => {
    if (!babelOptions.filename) {
        babelOptions.filename = path.resolve(
            __dirname,
            'evaluated-es6-module.js'
        );
    }
    const out = evalScript(
        babel.transformSync(source, babelOptions).code,
        require
    );
    return out.exports || out;
};

module.exports = { evalEsModule, evalScript };
