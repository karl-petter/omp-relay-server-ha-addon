# OMP Collab Relay

[`oh-my-pi`](https://github.com/can1357/oh-my-pi) (omp) is a terminal coding agent. Its `/collab` command shares a running session live — with another terminal, or a browser/QR link — so you or a teammate can watch an agent work, or jump in and prompt it, from anywhere. By default that goes through omp's own hosted relay, `my.omp.sh`; this add-on runs that relay yourself instead, listening on port 7466. Every collab frame is end-to-end encrypted before it reaches the relay, so self-hosting it means no third party ever sees your prompts, code, or session content.

## One thing to know

Out of the box this is the stripped-down build omp ships for local and offline use — it skips TLS and doesn't serve a browser client on its own. Reaching it from anywhere other than this same machine needs your own TLS proxy in front of it:

- **Same machine as omp:** works unmodified via `ws://localhost:7466`.
- **Any other machine:** front this add-on with your own TLS reverse proxy (Nginx Proxy Manager, Caddy, Cloudflare Tunnel, Traefik, etc.) and use the resulting `wss://` address. A private network back to this host (WireGuard, Tailscale, or another VPN) is the expected setup — see the parent repository's [architecture section](https://github.com/karl-petter/omp-relay-server-ha-addon#architecture).
- **Browser/QR joining:** needs `collab.webUrl` pointed at a separately hosted copy of `packages/collab-web`'s static build — the parent repository publishes one via GitHub Pages; see its [README](https://github.com/karl-petter/omp-relay-server-ha-addon#self-hosting-the-browser-client-optional).

## Configuration

No options — the relay listens on the fixed container port 7466, which this add-on exposes as host port 7466 by default. Remap the host side under the add-on's **Network** tab if 7466 is already taken.

## Usage

Start the add-on, then check the **Log** tab for:

```
local collab relay listening on ws://localhost:7466
```

Point omp at it by setting `collab.relayUrl` to `ws://<home-assistant-host>:7466` (same machine) or your `wss://` proxy address (remote), or use `/collab ws://<home-assistant-host>:7466` for a one-off session. See upstream [`docs/collab.md`](https://github.com/can1357/oh-my-pi/blob/main/docs/collab.md).

## Updates

This add-on's version mirrors the exact `oh-my-pi` release it vendors and bumps automatically — a daily check against upstream only republishes when the relay/wire source itself changed.
