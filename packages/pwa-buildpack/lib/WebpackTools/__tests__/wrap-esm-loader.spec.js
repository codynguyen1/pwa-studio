const wrapEsmLoader = require('../loaders/wrap-esm-loader');
const babel = require('@babel/core');
const vm = require('vm');

const evalModule = content => {
    const sandbox = { require, exports: {} };
    vm.runInNewContext(
        babel.transformSync(content, { filename: 'content.js' }).code,
        sandbox
    );
    if (sandbox.exports.default) {
        return Object.assign(sandbox.exports.default, sandbox.exports);
    }
    return sandbox.exports;
};

const mathSource = require('fs').readFileSync(
    require('path').resolve(__dirname, './__fixtures__/math.js'),
    'utf8'
);

const emitWarning = jest.fn();
const addDependency = jest.fn();

const addBadly = './__fixtures__/add-badly';
const printAsBinary = './__fixtures__/print-as-binary';
const speakBinary = './__fixtures__/speak-binary';
const squareToCube = './__fixtures__/square-to-cube';

const runLoader = async (wrap, source = mathSource) =>
    new Promise((res, rej) => {
        wrapEsmLoader.call(
            {
                query: { wrap: { foo: wrap } },
                resourcePath: 'foo',
                emitWarning,
                addDependency,
                callback(err, result) {
                    if (err) {
                        rej(err);
                    } else {
                        res(result);
                    }
                }
            },
            source
        );
    });

beforeEach(() => {
    emitWarning.mockClear();
    addDependency.mockClear();
});

test('does nothing if no export map was provided for this resource path', async () => {
    const content = await runLoader();
    expect(content).toEqual(mathSource);
    const square = evalModule(content);
    expect(square(4)).toBe(16);
});

test('wraps default export', async () => {
    const wrappedSource = await runLoader({
        defaultExport: [squareToCube]
    });
    const cube = evalModule(wrappedSource);
    expect(cube(4)).toBe(64);
    expect(emitWarning).not.toHaveBeenCalled();
    expect(addDependency).toHaveBeenCalledWith(squareToCube);
});

test('wraps named exports', async () => {
    const wrappedSource = await runLoader({
        multiply: [printAsBinary]
    });
    const cube = evalModule(wrappedSource);
    expect(cube(4)).toBe('10000');
    expect(emitWarning).not.toHaveBeenCalled();
    expect(addDependency).toHaveBeenCalledWith(printAsBinary);
});

test('wraps exports multiple times', async () => {
    const wrappedSource = await runLoader({
        multiply: [printAsBinary, speakBinary]
    });
    const square = evalModule(wrappedSource);
    expect(square(4)).toBe('one zero zero zero zero');
    expect(emitWarning).not.toHaveBeenCalled();
});

test('wraps multiple exports', async () => {
    const wrappedSource = await runLoader({
        add: [addBadly],
        multiply: [printAsBinary],
        defaultExport: [speakBinary]
    });
    const square = evalModule(wrappedSource);
    expect(square(4)).toBe('one one zero one');
    expect(emitWarning).not.toHaveBeenCalled();
});

test('reuses imports', async () => {
    const wrappedSource = await runLoader({
        add: [printAsBinary],
        multiply: [printAsBinary]
    });
    const { add, multiply } = evalModule(wrappedSource);
    expect(add(2, 3)).toBe('101');
    expect(multiply(2, 3)).toBe('110');
    expect(wrappedSource.match(/print\-as\-binary/g)).toHaveLength(1);
    expect(emitWarning).not.toHaveBeenCalled();
});

test('warns if anything on export map does not apply', async () => {
    const wrappedSource = await runLoader({
        notARealExport: [squareToCube]
    });
    const square = evalModule(wrappedSource);
    expect(square(4)).toBe(16);
    expect(emitWarning).toHaveBeenCalledWith(
        expect.stringContaining('Cannot wrap export "notARealExport" of "foo"')
    );
});

test('warns if default export does not apply', async () => {
    const wrappedSource = await runLoader(
        {
            add: [addBadly],
            defaultExport: [squareToCube],
            fortyTwo: [printAsBinary]
        },
        'export const fortyTwo = () => 42'
    );
    const answer = evalModule(wrappedSource).fortyTwo();
    expect(answer).toBe('101010');
    expect(emitWarning).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Cannot wrap default export')
    );

    expect(emitWarning).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('Cannot wrap export "add"')
    );
});

test('does nothing if nothing applied', async () => {
    const wrappedSource = await runLoader({
        multiply: []
    });
    expect(wrappedSource).toBe(mathSource);
    const cube = evalModule(wrappedSource);
    expect(cube(4)).toBe(16);
    expect(emitWarning).not.toHaveBeenCalled();
});
