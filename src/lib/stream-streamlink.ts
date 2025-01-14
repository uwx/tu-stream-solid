import { startFfmpeg } from './ffmpeg';
import { startStreamlink } from './streamlink';
import type { ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync, type WriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { addStream, getStream, WatchStream } from './streams';
import { pipeline } from 'node:stream/promises';
import { appendLogKey } from './utils';

export class StreamlinkStream extends WatchStream {
    typeKey = 'streamlink';
    private logFile: WriteStream;

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
    }

    async dispose(): Promise<void> {
        await super.dispose();
        this.logFile.close();
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

export async function getStreamlinkStream(watchUrl: string): Promise<{ mpdPath: string; } | { error: string; }> {
    if (!watchUrl) {
        throw new Error('Missing watch URL');
    }

    const watchUrlUrl = new URL(watchUrl);

    const sanitizedPathname = watchUrlUrl.pathname.replace(/[^A-Za-z0-9_\.\-]+/g, '_');
    const streamKey = `${watchUrlUrl.hostname}/${sanitizedPathname}`;
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

export function waitUntilExists(path: string, timeLimit: number) {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`waitUntilExists for ${path} timed out`));
        }, timeLimit);

        const timerId = setInterval(() => {
            const isExists = existsSync(path);
            if (isExists) {
                clearInterval(timerId);
                clearTimeout(timeout);
                resolve();
            }
        }, 250);
    });
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