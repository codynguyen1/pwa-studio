const Template = require('webpack/lib/Template');

const uniqueJsId = name =>
    `${Template.toIdentifier(
        name.includes('/') ? name.slice(name.lastIndexOf('/')) : name
    )}$${(~~(Math.random() * 1000)).toString(36)}`;

function wrapEsmLoader(content) {
    const { wrap } = this.query;
    const exportMap = wrap[this.resourcePath];
    if (!exportMap) {
        this.callback(null, content);
        return;
    }

    const defaultExportRE = /^\s*export\s+default/m;
    // todo make this actually spec with a parser
    const exportRE = name =>
        new RegExp(`^\\s*export\\s+((?:const|let|var|function) )${name}`, 'm');
    const hasExport = name => exportRE(name).test(content);
    const hasDefaultExport = () => defaultExportRE.test(content);

    const importsMap = new Map();
    const addImport = modulePath => {
        let identifier = importsMap.get(modulePath);
        if (!identifier) {
            identifier = uniqueJsId(modulePath);
            importsMap.set(modulePath, identifier);
            this.addDependency(modulePath);
        }
        return identifier;
    };

    const defaultExportWrappers = new Set();
    const wrapDefaultExport = identifier => {
        defaultExportWrappers.add(identifier);
    };

    const exportWrappers = new Map();
    const wrapExport = (exportName, wrapperIdentifier) => {
        let wrappers = exportWrappers.get(exportName);
        if (!wrappers) {
            wrappers = new Set();
            exportWrappers.set(exportName, wrappers);
        }
        wrappers.add(wrapperIdentifier);
    };

    const { defaultExport, ...otherExports } = exportMap;

    if (defaultExport) {
        if (!hasDefaultExport()) {
            this.emitWarning(
                `wrap-js-loader: Cannot wrap default export of "${
                    this.resourcePath
                }" with modules "${JSON.stringify(
                    defaultExport
                )}" because it does not have a default export.`
            );
        } else {
            defaultExport.forEach(wrapperModule => {
                const wrapperIdentifier = addImport(wrapperModule);
                wrapDefaultExport(wrapperIdentifier);
            });
        }
    }

    for (const [exportName, wrappers] of Object.entries(otherExports)) {
        if (!hasExport(exportName)) {
            this.emitWarning(
                `wrap-js-loader: Cannot wrap export "${exportName}" of "${
                    this.resourcePath
                }" with modules "${JSON.stringify(
                    wrappers
                )}" because it does not have an export named "${exportName}".`
            );
        } else {
            wrappers.forEach(wrapperModule => {
                const wrapperIdentifier = addImport(wrapperModule);
                wrapExport(exportName, wrapperIdentifier);
            });
        }
    }

    if (importsMap.size === 0) {
        this.callback(null, content);
    }

    let imports = `// BUILDPACK: wrap-esm-loader added ${
        importsMap.size
    } imports
`;
    for (const [modulePath, identifier] of importsMap.entries()) {
        imports += `import ${identifier} from '${modulePath}';\n`;
    }

    let wrappedExports = content;

    if (defaultExportWrappers.size > 0) {
        const defaultExportIntermediateVar = uniqueJsId('default');
        let finalDefaultExport = defaultExportIntermediateVar;
        for (const defaultExportWrapper of defaultExportWrappers) {
            finalDefaultExport = `${defaultExportWrapper}(${finalDefaultExport})`;
        }
        wrappedExports =
            wrappedExports.replace(
                defaultExportRE,
                `const ${defaultExportIntermediateVar} = `
            ) + `;\nexport default ${finalDefaultExport};\n`;
    }

    if (exportWrappers.size > 0) {
        for (const [exportName, wrappers] of exportWrappers.entries()) {
            const exportIntermediateVar = uniqueJsId(exportName);
            let finalExport = exportIntermediateVar;
            for (const exportWrapper of wrappers) {
                finalExport = `${exportWrapper}(${finalExport})`;
            }
            wrappedExports =
                wrappedExports.replace(
                    exportRE(exportName),
                    `\n$1${exportIntermediateVar}`
                ) + `\n;export const ${exportName} = ${finalExport};\n`;
        }
    }
    this.callback(null, imports + '\n' + wrappedExports); //, finalSourceMap, ast);
}

module.exports = wrapEsmLoader;
