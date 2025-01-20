import spawn from 'cross-spawn';
import { ffmepg } from '@/lib/server/ffmpeg';

export interface StreamlinkJsonError {
    error: string;
}

export interface StreamlinkJsonOutput {
    plugin: string;
    metadata: Metadata;
    streams: { [key: string]: Stream };
};

export interface Metadata {
    id: string;
    author: string;
    category: string;
    title: string;
};

export interface Stream {
    type: string;
    url: string;
    headers: Record<string, string>;
    master: string;
};

const streamlink = process.env.STREAMLINK_PATH ?? "streamlink";

export async function startStreamlink(options: {
    url: string,
    extraArgs?: string[],
}) {
    /** Unwraps args */
    function u(args?: string[]): string[] {
        return args ?? [];
    }

    const childProcess = spawn(streamlink, [
        options.url, '720p,720p60,480p,medium,best',
        '--ffmpeg-ffmpeg', ffmepg,

        '--stdout',

        ...u(options.extraArgs),
    ], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    return childProcess;
}
