const path = require('path');
const deepMerge = require('deepmerge');
const PeregrineWrapperConfig = require('./PeregrineWrapperConfig');

class TalonWrapperConfig extends PeregrineWrapperConfig {
    _provideSet(modulePath, ...rest) {
        return super._provideSet(
            path.resolve(__dirname, '../lib/talons/', modulePath),
            ...rest
        );
    }
    get useProductFullDetail() {
        return this._provideSet(
            'ProductFullDetail/useProductFullDetail.js',
            'useProductFullDetail'
        );
    }
    get useApp() {
        return this._provideSet('App/useApp.js', 'useApp');
    }
}

module.exports = targets => {
    targets.of('@magento/pwa-buildpack').wrapEsModules.tap(wrap => {
        const talonWrapperConfig = new TalonWrapperConfig();
        targets.own.talons.call(talonWrapperConfig);
        return deepMerge(wrap, talonWrapperConfig.toJSON());
    });
};
