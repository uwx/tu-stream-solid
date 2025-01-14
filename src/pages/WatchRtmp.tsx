import { useParams } from '@solidjs/router';
import Player from '@/components/Player';
import { apiClient } from '@/lib/client';

export default function RouteComponent() {
    const params = useParams<{ username: string }>();

    return <Player
        renderFallback={() => (
            <h2>
                Loading RTMP stream at {params.username}...
            </h2>
        )}
        queryEndpoint={async () => {
            return await apiClient.streamRtmp.query({ handle: params.username });
        }}
        getError={stream => 'error' in stream ? stream.error : undefined}
        getMpdPath={stream => 'mpdPath' in stream ? stream.mpdPath : undefined}
    />;
}
