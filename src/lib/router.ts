import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { getStreamlinkStream } from './stream-streamlink';
import { getRtmpStream } from './stream-rtmp';

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

export const appRouter = router({
    streamStreamlink: publicProcedure
        .input(
            z.object({
                host: z.string(),
                path: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getStreamlinkStream(`https://${input.host}/${input.path}`); 
        }),

    streamRtmp: publicProcedure
        .input(
            z.object({
                handle: z.string(),
            })
        )
        .query(async ({ input }) => {
            return await getRtmpStream(input.handle); 
        }),
});

export type AppRouter = typeof appRouter;