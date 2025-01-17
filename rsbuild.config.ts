import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';

export default {
    plugins: [
        pluginBabel({
            include: /\.(?:jsx|tsx)$/,
        }),
        pluginSolid(),
    ],
    html: {
        template: './index.html',
    },
    source: {
        entry: {
            index: './src/index.tsx',
        },
        include: [
            /solid-js/,
            /@trpc\+client/,
            /@trpc\+server/,
        ],
    },
    output: {
        cssModules: {
            namedExport: true,
        },
        polyfill: 'usage',
    },
};