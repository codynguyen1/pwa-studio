/* istanbul ignore file */
const mustMock = [
    ['emitWarning', jest.fn()],
    ['emitError', jest.fn()],
    ['addDependency', jest.fn()]
];
const runLoader = async (loader, content, contextValues) =>
    new Promise((res, rej) => {
        let mustReturnSync = true;
        const callback = (err, output) => {
            mustReturnSync = false;
            if (err) {
                rej(err);
            } else {
                res({ context, output });
            }
        };

        const context = Object.assign(
            {
                callback,
                async() {
                    mustReturnSync = false;
                    return callback;
                }
            },
            contextValues
        );
        for (const [method, mock] of mustMock) {
            if (typeof context[method] !== 'function') {
                context[method] = mock;
                mock.mockClear();
            }
        }
        const output = loader.call(context, content);
        if (mustReturnSync) {
            res({ context, output });
        }
    });

module.exports = { runLoader };
