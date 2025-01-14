import { apiClient } from '@/lib/client';
import type { getRtmpStream } from '@/lib/stream-rtmp';
import { A, useNavigate } from '@solidjs/router';
import { createComputed, createMemo, createSignal, Match, Switch } from 'solid-js';

export default function HomeComponent() {
    const navigate = useNavigate();

    const [streamUrl, setStreamUrl] = createSignal('');
    const [identifier, setIdentifier] = createSignal('');
    const [rtmpStream, setRtmpStream] = createSignal<Awaited<ReturnType<typeof getRtmpStream>>>();
    const rtmpError = createMemo(() => {
        const stream = rtmpStream();
        if (stream && 'error' in stream)
            return stream.error;
        return undefined;
    });
    const rtmpUrl = createMemo(() => {
        const stream = rtmpStream();
        if (stream && 'rtmpUrl' in stream)
            return stream.rtmpUrl;
        return undefined;
    });

    return <div class="container">
        <h1>TU-Stream</h1>
        <h2>Watch an existing livestream</h2>

        <label>
            Stream URL (e.g twitch):
            <input type="text" value={streamUrl()} onInput={event => setStreamUrl(event.currentTarget.value)} />
        </label>
        <button type="submit" onClick={() => {
            let localStreamUrl = streamUrl();
            if (!localStreamUrl.startsWith('http')) {
                localStreamUrl = `https://${localStreamUrl}`;
            }

            const url = new URL(localStreamUrl);

            navigate(`/watch-streamlink/${encodeURIComponent(url.host)}/${encodeURIComponent(url.pathname.slice(1) + url.search)}`);
        }}>Open</button>
        
        <h2>Stream from your device</h2>
        
        <Switch fallback={<>
            <label>
                Identifier (any string, must be unique, think of it like your username):
                <input type="text" onInput={event => setIdentifier(event.currentTarget.value)} />
            </label>
            <button type="submit" onClick={() => {
                apiClient.streamRtmp.query({ handle: identifier() })
                    .then(e => setRtmpStream(e));
            }}>Start Stream</button>
        </>}>
            <Match when={rtmpError()}>
                <pre>
                    {rtmpError()}
                </pre>
            </Match>
            <Match when={rtmpUrl()}>
                <div>
                    Stream to this URL:
                    <pre>
                        {rtmpUrl()!.replace('127.0.0.1', document.location.hostname)}
                    </pre>
                    Use this link to watch the stream:
                    <p>
                        <A href={`/watch-rtmp/${encodeURIComponent(identifier())}`}>
                            {document.location.protocol}{'//'}{document.location.host}/watch-rtmp/{encodeURIComponent(identifier())}
                        </A>
                    </p>
                </div>
            </Match>
        </Switch>
    </div>;
}
