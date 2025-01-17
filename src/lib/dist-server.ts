import { serve } from "@hono/node-server";
import app from "./server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";

app.use('/*', serveStatic({
    root: './dist/',
    precompressed: true,
}));

app.notFound(c => {
    return c.html(readFile('./dist/index.html', 'utf-8'));
})

const server = serve({
    fetch: app.fetch,
    port: 17772
}, info => {
    console.log(info);
});