import { useParams } from '@solidjs/router';
import Player from '@/components/Player';
import { apiClient } from '@/lib/server/client';
import { onCleanup } from 'solid-js';

export default function RouteComponent() {
    const params = useParams<{ host: string, path: string }>();

    const heartbeatInterval = setInterval(() => {
        apiClient.streamlinkIsAlive.query({ host: params.host, path: params.path });
    }, 1000);

    onCleanup(() => {
        clearInterval(heartbeatInterval);
    });

    return <Player
        renderFallback={() => (
            <h2>
                Loading {params.host}/{params.path}...
            </h2>
        )}
        queryEndpoint={async () => {
            return await apiClient.streamStreamlink.query({ host: params.host, path: params.path });
        }}
        getError={stream => 'error' in stream ? stream.error : undefined}
        getMpdPath={stream => 'mpdPath' in stream ? stream.mpdPath : undefined}
    />
}
