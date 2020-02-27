const path = require('path');
const deepMerge = require('deepmerge');
const PeregrineWrapperConfig = require('./PeregrineWrapperConfig');
const talonAbsPath = talonPath =>
    path.resolve(__dirname, '../lib/talons/', talonPath);

const supportedTalons = {
    useProductFullDetail: talonAbsPath(
        'ProductFullDetail/useProductFullDetail.js'
    )
};

class TalonWrapperConfig extends PeregrineWrapperConfig {
    get useProductFullDetail() {
        return this._provideSet(
            supportedTalons.useProductFullDetail,
            'useProductFullDetail'
        );
    }
}

module.exports = targets => {
    targets.of('@magento/pwa-buildpack').wrapEsModules.tap(wrap => {
        const talonWrapperConfig = new TalonWrapperConfig();
        targets.own.talons.call(talonWrapperConfig);
        return deepMerge(wrap, talonWrapperConfig.toJSON());
    });

    targets.own.talons.tap(talonWrappers =>
        talonWrappers.useProductFullDetail.add(
            '@magento/peregrine/targets/gtm/wrapUseProductFullDetail'
        )
    );
};
