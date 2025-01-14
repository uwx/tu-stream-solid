import { createEventual } from "@/lib/reactive-utils";
import { videoInfo, videoPlayer } from "@/styles/videoPlayer.module.css";
import dashjs, { type MediaPlayerClass } from "dashjs";
import { createEffect, createSignal, Match, onCleanup, Show, Switch, type JSXElement } from "solid-js";
import { Dash } from "./Dash";
import { Dynamic } from "solid-js/web";

export default function Player<T>(props: {
    queryEndpoint: () => Promise<T>,
    renderFallback: () => JSXElement,
    getError: (stream: T) => string | undefined,
    getMpdPath: (stream: T) => string | undefined,
}) {
    let player: MediaPlayerClass | undefined;
    let videoEl: HTMLVideoElement | undefined;

    const [latency, setLatency] = createSignal(0);
    const [streamEnded, setStreamEnded] = createSignal(false);

    const stream = createEventual(async () => {
        return await props.queryEndpoint();
    });

    const interval = setInterval(() => {
        if (player && player.getCurrentLiveLatency() > 30) {
            player.seekToOriginalLive();
        }
    }, 60_000);

    const interval2 = setInterval(() => {
        setLatency(player?.getCurrentLiveLatency() ?? 0)
    }, 1_000);

    const interval3 = setInterval(() => {
        if (streamEnded() && stream() && props.getMpdPath(stream()!)) {
            document.location.reload(); // TODO only reload the player
        }
    }, 5_000);

    onCleanup(() => {
        clearInterval(interval);
        clearInterval(interval2);
        clearInterval(interval3);
    });

    return <Switch fallback={
        <main class="container">
            <Dynamic component={props.renderFallback} />
        </main>
    }>
        <Match when={stream() && props.getError(stream()!)}>
            <main class="container">
                <pre>{props.getError(stream()!)}</pre>
            </main>
        </Match>
        <Match when={stream() && props.getMpdPath(stream()!)}>
            <h6 class={videoInfo}>
                <Switch>
                    <Match when={streamEnded()}>
                        Stream ended or hasn't started yet, refreshing...
                    </Match>
                    <Match when={!streamEnded()}>
                        Latency to broadcaster: {latency()}s
                    </Match>
                </Switch>
            </h6>
            <Dash
                controls={true}
                autoPlay={true}
                url={props.getMpdPath(stream()!)!}
                className={videoPlayer}
                options={{
                    streaming: {
                        delay: {
                            liveDelay: 8.5
                        },
                        liveCatchup: {
                            maxDrift: 4, // up to 12.5s of delay
                            playbackRate: {
                                min: -0.5,
                                max: 0.5
                            }
                        }
                    },
                }}
                initialized={(mediaPlayer, element) => {
                    player = mediaPlayer;
                    videoEl = element;

                    player.on('streamInitialized', () => {
                        setStreamEnded(false);
                    });

                    player.on('error', (e) => {
                        if (typeof e.error === 'object' && 'code' in e.error) {
                            if (e.error.code === dashjs.MediaPlayer.errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE) {
                                document.location.reload(); // TODO only reload the player
                            } else if (e.error.code === dashjs.MediaPlayer.errors.DOWNLOAD_ERROR_ID_MANIFEST_CODE) {
                                setStreamEnded(true);
                            }
                        }
                        console.error('dashjs error', e);
                    });

                    player.on('playbackError', (e) => {
                        console.error('playbackError', e);
                    });
                }}
            />
        </Match>
    </Switch>
}
