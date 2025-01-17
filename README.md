# TU-Stream

Highly experimental streaming proxy/DJ software for Tower Unite

## Usage

1. Install latest node.js and pnpm
2. Run the commands:
  - `pnpm install`
  - `pnpx rsbuild build --watch`
  - `pnpx tsx src/lib/dist-server.ts`
3. Expose your server to the internet. E.g with cloudflared: `cloudflared tunnel --url http://localhost:17772` or with Tailscale Funnel: `tailscale funnel 17772`
4. Navigate to the homepage URL (on Tailscale Funnel it'll be something like `https://my-server.some-words.ts.net/`) and follow the instructions on screen.
