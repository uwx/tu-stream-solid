import type { ChildProcess } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";

export abstract class WatchStream {
    constructor(
        public readonly typeKey: string,
        public readonly key: string,
        private readonly childProcesses: ChildProcess[],
        public readonly mpdFileName: string,
        public readonly dir: string,
    ) {
    }

    get mpdPath() { return `/${join(this.dir, this.mpdFileName).replace(/\\/g, '/')}`; }
    
    async dispose() {
        if (streams[`${this.typeKey}/${this.key}`] === this) {
            delete streams[`${this.typeKey}/${this.key}`];
        }

        for (const childProcess of this.childProcesses) {
            if (childProcess.exitCode === null) childProcess.kill();
        }
        await rm(this.dir, { recursive: true });
    }
}

const streams: Record<string, WatchStream> = {};

export function getStream(typeKey: string, key: string): WatchStream | undefined {
    return streams[`${typeKey}/${key}`];
}

export function addStream<T extends WatchStream>(stream: T): T {
    streams[`${stream.typeKey}/${stream.key}`] = stream;
    return stream;
}