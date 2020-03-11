const TargetProvider = require('../BuildBus/TargetProvider');
const declareWebpackTargets = require('../BuildBus/declare-base');

class MockedTargetProvider extends TargetProvider {
    constructor(name, targetFactory = () => ({})) {
        const log = jest.fn();
        super(log, { name }, targetFactory);
        this.mockLog = log;
        jest.spyOn(this, 'declare');
        jest.spyOn(this, 'of');
    }
    declare(...args) {
        this.phase = 'declare';
        super.declare(...args);
    }
}

const getWebpackTargets = () => {
    const webpackTargets = new MockedTargetProvider('@magento/pwa-buildpack');
    declareWebpackTargets(webpackTargets);
    return webpackTargets.own;
};

const externalTargetObjectFactory = targetMap => prop => targetMap[prop];

const mockTargets = (externalTargets, name = 'mockTargetProvider') => {
    const targetFactory =
        typeof externalTargets === 'function'
            ? externalTargets
            : externalTargetObjectFactory(externalTargets);
    const webpackTargets = getWebpackTargets();
    const getExternalTargets = depName =>
        depName === '@magento/pwa-buildpack'
            ? webpackTargets
            : targetFactory(depName);
    return new MockedTargetProvider(name, getExternalTargets);
};

module.exports = { mockTargets };
