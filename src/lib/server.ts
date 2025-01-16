import 'dotenv/config';

import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static'
import { cors } from 'hono/cors';
import { Movie, MovieSection, MyPlexAccount, Show } from '@ctrl/plex';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';

const app = new Hono();

app.use('*', cors());

app.use(
    '/api/*',
    trpcServer({
      router: appRouter,
    })
)

let account: MyPlexAccount | undefined;
app.get('/api/plex/search', async c => {
    const query = c.req.query('q');
    if (!query) {
        c.status(400);
        return c.text('Missing query');
    }
    
    account ??= await new MyPlexAccount('http://localhost:32400', process.env.PLEX_USER, process.env.PLEX_PASS).connect();
    const resource = await account.resource('Maxine');
    const plex = await resource.connect();
    const results = await plex.search(query);

    return c.json(results);

    // const library = await plex.library();
    // const sections = await library.sections();
    // const searches: { name: string, results: (Movie | Show)[] }[] = []
    // for (const section of sections) {
    //     searches.push({
    //         name: section.title,
    //         results: await section.search({ title: query, })
    //     });
    // }

    // return c.json(searches);
});

// TODO
app.get('/api/plex/stream/:guid/:season?/:episode?', async c => {
    account ??= await new MyPlexAccount('http://localhost:32400', process.env.PLEX_USER, process.env.PLEX_PASS).connect();
    const resource = await account.resource('Maxine');
    const plex = await resource.connect();
    const library = await plex.library();
    for (const section of await library.sections()) {
        const entry = await section.getGuid(c.req.param('guid'));
        const [season, episode] = [Number(c.req.param('season')!), Number(c.req.param('episode')!)];
        if (entry instanceof Show) {
            const eps = await entry.episodes();
            const ep = eps.find(e => e.index === episode && e.parentIndex === season);
            if (ep) {
                ep.getWebURL();
            }
        }
    }
});

app.use('/streams/*', serveStatic({
    root: './',
    precompressed: false,
    onNotFound: (path, c) => {
        console.log(`Not found: ${path}`);
    }
}));

export default app;