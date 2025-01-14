import { createWriteStream, existsSync, ReadStream, type WriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { startFfmpeg } from './ffmpeg';
import type { ChildProcess } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import spawn from 'cross-spawn';
import { addStream, getStream, WatchStream } from './streams';
import { appendLogKey } from './utils';
import { pipeline } from 'node:stream/promises';

export class RtmpStream extends WatchStream {
    logFile: WriteStream;
    constructor(
        streamKey: string,
        public readonly logKey: string,
        childProcess: ChildProcess,
        mpdFileName: string,
        dir: string,
        public readonly port: number,
        public readonly tailscaleProcess: ChildProcess,
        public readonly rtmpUrl: string,
    ) {
        super('rtmp', streamKey, [childProcess, tailscaleProcess], mpdFileName, dir);

        this.logFile = createWriteStream(`rtmp-${streamKey}.log`, {flags: 'a'});

        pipeline(childProcess.stderr!, appendLogKey(logKey), this.logFile);

        childProcess.on('close', () => {
            console.log(`[${logKey}] process exited`);
            this.dispose();
        });
    }

    async dispose(): Promise<void> {
        await super.dispose();
        this.logFile.close();
        usedPorts.delete(this.port);
    }
}

const tailscale = String.raw`G:\Programs\Tailscale\tailscale.exe`;

const usedPorts = new Set<number>();

export async function startRtmpStream(username: string) {
    const dir = join('streams', 'rtmp', username);
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
    await mkdir(dir, { recursive: true });

    const mpdPath = join(dir, 'stream.mpd');

    const logKey = `${username}`;

    // todo make this secure
    const key = Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);

    if (usedPorts.size >= 32767) {
        throw new Error('Too many used ports');
    }

    let port: number;
    do {
        port = Math.round(Math.random() * 32767) + 32767;
    } while (usedPorts.has(port));

    const url = `rtmp://127.0.0.1:${port}/live/app/${key}`;

    const tailscaleProcess = spawn(tailscale, ['funnel', '--tcp', String(port), String(port)], {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const ffmpegProcess = await startFfmpeg({
        inputs: [{
            url,
            maps: ['v', 'a'],
            extraOptions: ['-f', 'flv', '-listen', '1']
        }],
        mpdPath,
    });
    
    usedPorts.add(port);

    return new RtmpStream(
        username,
        logKey,
        ffmpegProcess,
        basename(mpdPath),
        dir,
        port,
        tailscaleProcess,
        url
    );
}

export async function getRtmpStream(username: string): Promise<{ mpdPath: string, rtmpUrl: string } | { error: string }> {
    if (!username) {
        throw new Error('Missing watch URL');
    }

    let stream = getStream('rtmp', username) as RtmpStream | undefined;
    if (stream) {
        return {
            mpdPath: stream.mpdPath,
            rtmpUrl: stream.rtmpUrl,
        };
    }

    try {
        stream = addStream(await startRtmpStream(username));

        return {
            mpdPath: stream.mpdPath,
            rtmpUrl: stream.rtmpUrl,
        };
    } catch (error) {
        return {
            error: String(error),
        };
    }
}
