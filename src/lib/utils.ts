import { ReadStream } from 'node:fs';
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
