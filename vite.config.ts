import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import typedCssModulesPlugin from 'vite-plugin-typed-css-modules';
import devServer from "@hono/vite-dev-server";

export default defineConfig({
  plugins: [
    solidPlugin(),
    viteTsconfigPaths(),
    typedCssModulesPlugin(),
    devServer({
      entry: "./src/lib/server.ts",
      exclude: [/^(?!\/api|\/streams|\/cors)/],
      injectClientScript: false,
    }),
  ],
  server: {
    port: 17773,
  },
  build: {
    target: 'chrome59',
  },
});
