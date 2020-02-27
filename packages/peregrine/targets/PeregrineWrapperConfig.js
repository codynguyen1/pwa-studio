// A little verbose, but it makes for real good intellisense

class PeregrineWrapperConfig {
    constructor() {
        this._setsForExports = Object.create(null);
    }
    _ensureOn(obj, name, Thing) {
        let prop = obj[name];
        if (!(name in obj)) {
            prop = new Thing();
            obj[name] = prop;
        }
        return prop;
    }
    _provideSet(modulePath, exportName) {
        return this._ensureOn(
            this._ensureOn(this._setsForExports, modulePath, Object),
            exportName,
            Set
        );
    }
    toJSON() {
        const json = {};
        for (const [modulePath, setForExport] of Object.entries(
            this._setsForExports
        )) {
            json[modulePath] = {};
            for (const [exportName, wrappers] of Object.entries(setForExport)) {
                json[modulePath][exportName] = [...wrappers];
            }
        }
        return json;
    }
}

module.exports = PeregrineWrapperConfig;
