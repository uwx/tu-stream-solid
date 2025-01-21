import { createWriteStream, existsSync, ReadStream, type WriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { startFfmpeg } from '@/lib/server/ffmpeg';
import type { ChildProcess } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import spawn from 'cross-spawn';
import { addStream, getStream, WatchStream } from '@/lib/server/streams';
import { appendLogKey } from '@/lib/server/utils';
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
        public readonly rtmpUrl: string,
    ) {
        super('rtmp', streamKey, [childProcess], mpdFileName, dir);

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

const tailscale = process.env.TAILSCALE_PATH ?? 'tailscale';

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

    if (usedPorts.size >= 1024) { 
        throw new Error('Too many active clients, sorry :(');
    }

    let port: number;
    do {
        port = Math.round(Math.random() * 1023) + 31743;
    } while (usedPorts.has(port));

    const url = `rtmp://${process.env.LISTEN_ADDRESS ?? 'localhost'}:${port}/live/app/${key}`;

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
        `rtmp://${process.env.PUBLIC_ENDPOINT ?? 'localhost'}:${port}/live/app/${key}`
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
