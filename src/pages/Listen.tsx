import Visualizer from "@/components/Visualizer";
import { useParams } from "@solidjs/router";

export default function RouteComponent() {
    const params = useParams<{ url: string }>();
    
    const audioContext = new AudioContext();

    return <div>
        <Visualizer audioSrc={decodeURIComponent(params.url)} />
    </div>
}