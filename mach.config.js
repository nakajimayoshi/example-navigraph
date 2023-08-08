// const imagePlugin = require('esbuild-plugin-inline-image');
const postCssPlugin = require('esbuild-style-plugin');
// const postCssColorFunctionalNotation = require('postcss-color-functional-notation');
// const postCssInset = require('postcss-inset');
const { sassPlugin } = require('esbuild-sass-plugin');
const tailwind = require('tailwindcss');

/** @type { import('@synaptic-simulations/mach').MachConfig } */
module.exports = {
    packageName: 'test',
    packageDir: 'out/test',
    plugins: [
        sassPlugin(),
        // imagePlugin({ limit: -1 }),
        postCssPlugin({
            extract: true,
            postcss: {
                plugins: [
                    tailwind('tailwind.config.js'),
                ],
            }
        }),
    ],
    instruments: [
        reactInstrument('testInstrument'),
    ],
};

// function msfsAvionicsInstrument(name, folder = name) {
//     return {
//         name,
//         index: `src/systems/instruments/src/${folder}/instrument.tsx`,
//         simulatorPackage: {
//             type: 'baseInstrument',
//             templateId: `A32NX_${name}`,
//             mountElementId: `${name}_CONTENT`,
//             fileName: name.toLowerCase(),
//             imports: ['/JS/dataStorage.js'],
//         },
//     };
// }

function reactInstrument(name, additionalImports) {
    return {
        name,
        index: `src/${name}/index.tsx`,
        simulatorPackage: {
            type: 'react',
            isInteractive: false,
            fileName: name.toLowerCase(),
            imports: [...(additionalImports ?? [])],
        },
    };
}
