import spawn from "cross-spawn";
import { basename, dirname } from "node:path";
// import { promisify } from "node:util";

// ffmpeg -i ^
//     "https://video-weaver.sao05.hls.ttvnw.net/v1/playlist/<censored>.m3u8" ^
//     -user_agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0" ^
//     -headers "Accept-Encoding: gzip, deflate, br" ^
//     -headers "Accept: */*" ^
//     -headers "Connection: keep-alive" ^
//     -headers "referer: https://player.twitch.tv" ^
//     -headers "origin: https://player.twitch.tv" ^
//     -fflags +discardcorrupt ^
//     -c:v libvpx ^
//     -c:a libvorbis -b:a 128k ^
//     -deadline realtime ^
//     -f webm ^
//     "stream.webm"

export const ffmepg = process.env.FFMPEG_PATH ?? 'ffmpeg';

const transcodes: Record<string, string>[] = [
    {
        'b:v': '1024k',
    }
];

type StreamMap = 'v' | 'a';

function keysToLowerCase(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]))
}

export async function startFfmpeg({ inputs, mpdPath, seek }: {
    inputs: { url: string, headers?: Record<string, string>, maps: StreamMap[], extraOptions?: string[] }[], // maps: e.g ['v', 'a']
    mpdPath: string,
    seek?: number,
}) {
    const args = [
        '-fflags', 'discardcorrupt',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-y'
    ];

    const maps: `${number}:${StreamMap}`[] = [];

    {
        let idx = 0;
        for (const { url, maps: inputMaps, headers, extraOptions } of inputs) {
            for (const map of inputMaps) {
                maps.push(`${idx}:${map}`);
            }

            if (seek) {
                args.push('-ss', `${seek}`);
            }

            if (headers) {
                const { 'user-agent': userAgent, ...rest } = keysToLowerCase(headers);
                if (userAgent) {
                    args.push('-user_agent', userAgent);
                }
                for (const [k, v] of Object.entries(rest)) {
                    args.push('-headers', `${k}: ${v}`);
                }
            }

            if (extraOptions)
                args.push(...extraOptions);
            
            args.push('-i', url);

            // scale to 720p
            args.push('-vf', 'scale=1280:-1')

            idx++;
        }
    }

    args.push(
        '-codec:v', 'libvpx',
        '-deadline', 'realtime',
        //'-quality', 'realtime',
        '-row-mt', '1',
        '-cpu-used', '5',
        '-codec:a', 'libvorbis'
    );

    // for (const i of range(0, transcodes.length)) {
    //     for (const map of maps) {
    //         args.push('-map', `${map}:0`);
    //     }
    // }

    for (const [i, transcode] of enumerate(transcodes)) {
        for (const [k, v] of Object.entries(transcode)) {
            args.push(`-${k}:${i}`, v);
        }
    }

    args.push(
        '-f', 'dash',
        '-window_size', '15',

        '-extra_window_size', '15',
        '-adaptation_sets', 'id=0,streams=v id=1,streams=a', // if likely_has_audio else 'id=0,streams=v',
        '-remove_at_exit', '1',
        '-update_period', '1',

        '-write_prft', '1',
        '-utc_timing_url', 'https://time.akamai.com/?iso',

        '-streaming', '1',
        '-target_latency', '10',

        '-dash_segment_type', 'webm',
        '-use_template', '1',
        '-use_timeline', '1',
        '-seg_duration', '8',
        '-frag_duration', '2',
        '-frag_type', 'duration',
        '-init_seg_name', 'init-stream$RepresentationID$.$ext$',
        '-media_seg_name', 'chunk-stream$RepresentationID$-$Number%05d$.$ext$',

        '-ldash', '1',

        basename(mpdPath),
    );

    const childProcess = spawn(ffmepg, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: dirname(mpdPath),
    });

    return childProcess;
}

function *enumerate<T>(arr: Iterable<T>): Generator<[index: number, element: T]> {
    let i = 0;
    for (const e of arr) {
        yield [i++, e] as const;
    }
}

function *range(min: number, max: number, step = 1) {
    for (let i = min; i < max; i += step) {
        yield i;
    }
}