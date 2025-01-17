// @ts-expect-error make typings later
import butterchurn from "butterchurn";

// @ts-expect-error make typings later
import butterchurnPresets from "butterchurn-presets";

// @ts-expect-error make typings later
import butterchurnPresetsExtra from "butterchurn-presets/lib/butterchurnPresetsExtra.min.js";

// @ts-expect-error make typings later
import butterchurnPresetsExtra2 from "butterchurn-presets/lib/butterchurnPresetsExtra2.min.js";

import { onCleanup, onMount } from "solid-js";
import { canvas as canvasClass, player as playerClass } from "./Visualizer.module.css";

export default function Visualizer(props: { audioSrc: string }) {
    const presets = {
        ...butterchurnPresets.getPresets(),
        ...butterchurnPresetsExtra.getPresets(),
        ...butterchurnPresetsExtra2.getPresets(),
    };

    const audioContext = new AudioContext();

    let canvas: HTMLCanvasElement;
    let audio: HTMLMediaElement;

    let alive = true;

    onMount(() => {
        const audioNode = audioContext.createMediaElementSource(audio);
        audioNode.connect(audioContext.destination);

        const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
            width: canvas.width,
            height: canvas.height,
        });
        
        // get audioNode from audio source or microphone
        
        visualizer.connectAudio(audioNode);
        
        // load a preset
        setRandomPreset(visualizer);
    
        render(visualizer);
    });
    function setRandomPreset(visualizer: any) {
        if (!alive) return;

        const presetsKeys = Object.keys(presets);
        const preset = presets[presetsKeys[Math.floor(Math.random() * presetsKeys.length)]];

        visualizer.loadPreset(preset, 1.0); // 2nd argument is the number of seconds to blend presets

        setTimeout(() => setRandomPreset(visualizer), 10000);
    };

    function render(visualizer: any) {
        if (!alive) return;

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        visualizer.setRendererSize(canvas.width, canvas.height);
        visualizer.render();

        setTimeout(() => render(visualizer), 1000 / 60);
    }

    onCleanup(() => {
        alive = false;
    });

    return (
        <>
            {/* biome-ignore lint/a11y/useMediaCaption: is live internet radio */}
            <audio class={playerClass} controls autoplay src={`/cors/${props.audioSrc}`} ref={ref => { audio = ref; }}/>
            <canvas class={canvasClass} id="canvas" ref={ref => { canvas = ref; }} />
        </>
    );
}