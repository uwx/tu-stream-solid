import { startFfmpeg } from '@/lib/server/ffmpeg';
import { startStreamlink } from './streamlink';
import type { ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync, type WriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { addStream, getStream, WatchStream } from '@/lib/server/streams';
import { pipeline } from 'node:stream/promises';
import { appendLogKey, waitUntilExists } from '@/lib/server/utils';

export class StreamlinkStream extends WatchStream {
    typeKey = 'streamlink';
    private logFile: WriteStream;
    lastHeartbeat: number;
    private autoCleanupInterval: NodeJS.Timeout;

    constructor(
        streamKey: string,
        public readonly logKey: string,
        public readonly watchUrl: string,
        childProcess: ChildProcess,
        mpdFileName: string,
        dir: string,
    ) {
        super('streamlink', streamKey, [childProcess], mpdFileName, dir);
        
        this.logFile = createWriteStream(`ffmpeg-${streamKey.replace(/[\\/]/g, '-')}.log`, {flags: 'a'});

        pipeline(childProcess.stderr!, appendLogKey(logKey), this.logFile);

        childProcess.on('close', () => {
            console.log(`[${logKey}] process exited`);
            this.dispose();
        });

        this.lastHeartbeat = Date.now();

        this.autoCleanupInterval = setInterval(() => {
            if (Date.now() - this.lastHeartbeat > 360_000) {
                console.log(`[${logKey}] streamlink heartbeat timeout`);
                this.dispose();
            }
        }, 60_000);
    }

    async dispose(): Promise<void> {
        await super.dispose();
        this.logFile.close();
        clearInterval(this.autoCleanupInterval);
    }
}

export async function startStreamlinkStream(streamKey: string, watchUrl: URL, sanitizedPathname: string) {
    const dir = join('streams', 'streamlink', watchUrl.hostname, sanitizedPathname);
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
    await mkdir(dir, { recursive: true });

    const mpdPath = join(dir, 'stream.mpd');

    const streamlinkProcess = await startStreamlink({
        url: watchUrl.toString()
    });

    const logKey = `${watchUrl.hostname}${watchUrl.pathname}`;

    const ffmpegProcess = await startFfmpeg({
        inputs: [{
            url: 'pipe:0',
            maps: ['v', 'a'],
        }],
        mpdPath,
    });

    pipeline(streamlinkProcess.stdout!, ffmpegProcess.stdin!);

    const stderr: string[] = [];
    streamlinkProcess.stderr?.on('data', data => {
        const dataStr = String(data).trim();
        stderr.push(dataStr);
        console.error(dataStr);
    });

    const { promise: closePromise, resolve: closed } = newPromise<number>();

    streamlinkProcess.on('close', code => {
        if (code != null && code !== 0) {
            closed(code);
        } else {
            closed(0);
        }

        ffmpegProcess.stdin!.end();
        ffmpegProcess.kill();
    });

    const exitCode = await Promise.race([
        closePromise,
        waitUntilExists(mpdPath, 50_000)
    ]);

    if (exitCode !== undefined) {
        throw new Error(`Streamlink process exited with code ${exitCode}:\n${stderr.join('\n')}`);
    }

    return new StreamlinkStream(
        streamKey,
        logKey,
        watchUrl.toString(),
        ffmpegProcess,
        basename(mpdPath),
        dir
    );
}

function streamKeyFromUrl(watchUrl: string) {
    const watchUrlUrl = new URL(watchUrl);

    const sanitizedPathname = watchUrlUrl.pathname.replace(/[^A-Za-z0-9_\.\-]+/g, '_');
    const streamKey = `${watchUrlUrl.hostname}/${sanitizedPathname}`;

    return { watchUrlUrl, sanitizedPathname, streamKey };
}

export async function getStreamlinkStream(watchUrl: string): Promise<{ mpdPath: string; } | { error: string; }> {
    console.log('getStreamlinkStream', watchUrl);

    if (!watchUrl) {
        throw new Error('Missing watch URL');
    }

    const { watchUrlUrl, sanitizedPathname, streamKey } = streamKeyFromUrl(watchUrl);
    let stream = getStream('streamlink', streamKey);
    if (stream) {
        return { mpdPath: stream.mpdPath };
    }

    try {
        // get stream link and spawn ffmpeg
        stream = addStream(await startStreamlinkStream(streamKey, watchUrlUrl, sanitizedPathname));

        return { mpdPath: stream.mpdPath };
    } catch (error) {
        return { error: String(error) };
    }
}

export async function streamlinkHeartbeat(watchUrl: string) {
    const { watchUrlUrl, sanitizedPathname, streamKey } = streamKeyFromUrl(watchUrl);
    const stream = getStream('streamlink', streamKey) as StreamlinkStream | undefined;
    if (stream) {
        stream.lastHeartbeat = Date.now();
    }
}

function newPromise<T>() {
    let resolve: (value: T | PromiseLike<T>) => void;
    let reject: (reason?: any)=> void;
    const promise = new Promise<T>((aresolve, areject) => {
        resolve = aresolve;
        reject = areject;
    });
    return { promise, resolve: resolve!, reject: reject! };
}