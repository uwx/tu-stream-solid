import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import typedCssModulesPlugin from 'vite-plugin-typed-css-modules';

export default defineConfig({
  plugins: [
    solidPlugin(),
    viteTsconfigPaths(),
    typedCssModulesPlugin(),
  ],
  server: {
    port: 17773,
  },
  build: {
    target: 'esnext',
  },
});
