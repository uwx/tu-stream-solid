import { existsSync, ReadStream } from 'node:fs';
import type { PipelineSource, PipelineTransform } from 'node:stream';

export function appendLogKey(logKey: string): PipelineTransform<PipelineSource<ReadStream>, string> {
    return async function* (data) {
        for await (const chunk of data) {
            if (chunk instanceof ReadStream) {
                for await (const chunk2 of chunk) { 
                    yield `[${logKey}] ${chunk2}`;
                }
            } else {
                yield `[${logKey}] ${chunk}`;
            }
        }
    };
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
