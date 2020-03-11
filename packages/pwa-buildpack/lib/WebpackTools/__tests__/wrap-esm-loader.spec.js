const wrapEsmLoader = require('../loaders/wrap-esm-loader');
const { evalEsModule } = require('../../testHelpers/evaluate');
const { runLoader } = require('../../testHelpers/webpack/loader');

const mathSource = require('fs').readFileSync(
    require('path').resolve(__dirname, './__fixtures__/math.js'),
    'utf8'
);

const addBadly = './__fixtures__/add-badly.es6';
const printAsBinary = './__fixtures__/print-as-binary.es6';
const speakBinary = './__fixtures__/speak-binary.es6';
const squareToCube = './__fixtures__/square-to-cube.es6';

const requireModule = content => evalEsModule(content, require);

const runWrapLoader = async (wrap, source = mathSource) =>
    runLoader(wrapEsmLoader, source, {
        query: { wrap: { foo: wrap } },
        resourcePath: 'foo'
    });

test('does nothing if no export map was provided for this resource path', async () => {
    const { output } = await runWrapLoader();
    expect(output).toEqual(mathSource);
    const square = requireModule(output);
    expect(square(4)).toBe(16);
});

test('wraps default export', async () => {
    const {
        output,
        context: { emitWarning, addDependency }
    } = await runWrapLoader({
        defaultExport: [squareToCube]
    });
    const cube = requireModule(output);
    expect(cube(4)).toBe(64);
    expect(emitWarning).not.toHaveBeenCalled();
    expect(addDependency).toHaveBeenCalledWith(squareToCube);
});

test('wraps named exports', async () => {
    const {
        output,
        context: { emitWarning, addDependency }
    } = await runWrapLoader({
        multiply: [printAsBinary]
    });
    const cube = requireModule(output);
    expect(cube(4)).toBe('10000');
    expect(emitWarning).not.toHaveBeenCalled();
    expect(addDependency).toHaveBeenCalledWith(printAsBinary);
});

test('wraps exports multiple times', async () => {
    const {
        output,
        context: { emitWarning, addDependency }
    } = await runWrapLoader({
        multiply: [printAsBinary, speakBinary]
    });
    const square = requireModule(output);
    expect(square(4)).toBe('one zero zero zero zero');
    expect(emitWarning).not.toHaveBeenCalled();
    expect(addDependency).toHaveBeenNthCalledWith(1, printAsBinary);
    expect(addDependency).toHaveBeenNthCalledWith(2, speakBinary);
});

test('wraps multiple exports', async () => {
    const {
        output,
        context: { emitWarning }
    } = await runWrapLoader({
        add: [addBadly],
        multiply: [printAsBinary],
        defaultExport: [speakBinary]
    });
    const square = requireModule(output);
    expect(square(4)).toBe('one one zero one');
    expect(emitWarning).not.toHaveBeenCalled();
});

test('reuses imports', async () => {
    const {
        output,
        context: { emitWarning }
    } = await runWrapLoader({
        add: [printAsBinary],
        multiply: [printAsBinary]
    });
    const { add, multiply } = requireModule(output);
    expect(add(2, 3)).toBe('101');
    expect(multiply(2, 3)).toBe('110');
    expect(output.match(/print\-as\-binary/g)).toHaveLength(1);
    expect(emitWarning).not.toHaveBeenCalled();
});

test('warns if anything on export map does not apply', async () => {
    const {
        output,
        context: { emitWarning }
    } = await runWrapLoader({
        notARealExport: [squareToCube]
    });
    const square = requireModule(output);
    expect(square(4)).toBe(16);
    expect(emitWarning).toHaveBeenCalledWith(
        expect.stringContaining('Cannot wrap export "notARealExport" of "foo"')
    );
});

test('warns if default export does not apply', async () => {
    const {
        output,
        context: { emitWarning }
    } = await runWrapLoader(
        {
            add: [addBadly],
            defaultExport: [squareToCube],
            fortyTwo: [printAsBinary]
        },
        'export const fortyTwo = () => 42'
    );
    const answer = requireModule(output).fortyTwo();
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
    const {
        output,
        context: { emitWarning }
    } = await runWrapLoader({
        multiply: []
    });
    expect(output).toBe(mathSource);
    const cube = requireModule(output);
    expect(cube(4)).toBe(16);
    expect(emitWarning).not.toHaveBeenCalled();
});
