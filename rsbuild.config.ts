import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
    environments: {
        web: {
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
        },
        server: {
            source: {
                entry: {
                    server: './src/lib/dist-server.ts'
                }
            },
            output: {
                target: 'node',
                filename: {
                    js: '[name].cjs',
                },
            },
            performance: {
                chunkSplit: {
                    strategy: 'all-in-one',
                }
            },
            tools: {
                rspack: {
                    output: {
                        asyncChunks: false,
                    },
                },
            },
        }
    },
});