import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './router';

export const apiClient = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: '/api',
        }),
    ],
});
