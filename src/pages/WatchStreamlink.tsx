import { useParams } from '@solidjs/router';
import Player from '@/components/Player';
import { apiClient } from '@/lib/client';

export default function RouteComponent() {
    const params = useParams<{ host: string, path: string }>();

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
