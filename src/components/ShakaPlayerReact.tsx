'use client';

import { useRef, useState, useEffect, useImperativeHandle, type Ref, forwardRef } from 'react';

import shaka from 'shaka-player/dist/shaka-player.ui';

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T;

/**
 * A React component for shaka-player.
 */
function ShakaPlayer({ src, config, chromeless, className, onErrorEvent, ...rest }: {
    src?: string,
    config?: DeepPartial<shaka.extern.PlayerConfiguration>,
    chromeless?: boolean,
    className?: string,
    autoPlay?: boolean,
    width?: number,
    height?: number,
    playbackRate?: number,
    muted?: boolean,
    loop?: boolean,
    volume?: number,
    onErrorEvent?: (event: Event & { detail: shaka.util.Error }) => void
}, ref: Ref<{ readonly player: shaka.Player; readonly ui: shaka.ui.Overlay; readonly videoElement: HTMLVideoElement | null; }>) {
    shaka.polyfill.installAll();

    const uiContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [player, setPlayer] = useState<shaka.Player>();
    const [ui, setUi] = useState<shaka.ui.Overlay>();
    
    // Effect to handle component mount & mount.
    // Not related to the src prop, this hook creates a shaka.Player instance.
    // This should always be the first effect to run.
    useEffect(() => {
        const player = new shaka.Player();
        player.attach(videoRef.current!);
        if (onErrorEvent) player.addEventListener('error', onErrorEvent as EventListener);
        setPlayer(player);

        let ui: shaka.ui.Overlay;
        if (!chromeless) {
            ui = new shaka.ui.Overlay(
                player,
                uiContainerRef.current!,
                videoRef.current!
            );
            setUi(ui);
        }

        return () => {
            player.destroy();
            if (ui) {
                ui.destroy();
            }
        };
    }, [chromeless, onErrorEvent]);

    // Keep shaka.Player.configure in sync.
    useEffect(() => {
        if (player && config) {
            player.configure(config);
        }
    }, [player, config]);

    // Load the source url when we have one.
    useEffect(() => {
        if (player && src) {
            player.load(src);
        }
    }, [player, src]);

    // Define a handle for easily referencing Shaka's player & ui API's.
    useImperativeHandle(
        ref,
        () => ({
            get player() { return player!; },
            get ui() { return ui!; },
            get videoElement() { return videoRef.current; },
        }),
        [player, ui]
    );

    return (
        <div ref={uiContainerRef} className={className}>
            <video
                ref={videoRef}
                style={{
                    maxWidth: '100%',
                    width: '100%'
                }}
                {...rest}
            />
        </div>
    );
}

export default forwardRef(ShakaPlayer);