import dash, { type MediaPlayerSettingClass } from "dashjs";
import { createEffect, createSignal, onCleanup } from "solid-js";

export function Dash(props: {
    className?: string;
    controls?: boolean;
    autoPlay?: boolean;
    url: string;
    options?: MediaPlayerSettingClass;
    initialized?: (player: dash.MediaPlayerClass, element: HTMLVideoElement) => void,
}) {
    const [player, setPlayer] = createSignal<dash.MediaPlayerClass>();
    const [videoRef, setVideoRef] = createSignal<HTMLVideoElement | null>(null);
    
    createEffect(() => {
        setPlayer(player => {
            player ??= dash.MediaPlayer().create();

            if (props.options) player.updateSettings(props.options);
            player!.initialize(
                videoRef()!,
              // needs regex to select for anything beginning with dash-react 
              props.url,
              props.autoPlay
            );

            props.initialized?.(player, videoRef()!);

            return player;
        });
    });

    onCleanup(() => {
        player()?.destroy();
    });

    // biome-ignore lint/a11y/useMediaCaption: <explanation>
    return <video
        ref={el => setVideoRef(el)}
        class={props.className}
        controls={props.controls}
        preload='auto'
        autoplay={props.autoPlay}
    />
}