# OMP Collab Relay — Home Assistant Add-on

A Home Assistant add-on repository that runs [`oh-my-pi`](https://github.com/can1357/oh-my-pi)'s local collab relay — the documented, source-available WebSocket stand-in for the hosted `my.omp.sh` relay used by omp's `/collab` live session sharing. It lets an omp host and guest terminals exchange end-to-end-encrypted collab frames through a relay you run yourself, on port 7466.

**This is not a drop-in replacement for `my.omp.sh`.** `local-relay.ts` is explicitly documented upstream as a stand-in for local/offline use: no TLS, no `/share` blob endpoints, no `/healthz`. More importantly, both the omp CLI and the browser client validate relay URLs with the same rule: plain `ws://` is only accepted when the hostname is `localhost`, `127.0.0.1`, or `::1` — any other hostname must be `wss://`. This add-on does not terminate TLS itself.

In practice that means:

- **Same machine as omp** (or over a tunnel that presents as `localhost`): works unmodified, point omp at `ws://localhost:7466`.
- **Different machine than the omp client** (the normal case — this add-on runs on your Home Assistant host): you must front it with your own TLS reverse proxy (Nginx Proxy Manager, Caddy, Cloudflare Tunnel, Traefik, etc.) and point omp at the resulting `wss://` address. This add-on does not set that up for you.

## Add this repository

[![Add repository to my Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fkarl-petter%2Fomp-relay-server-ha-addon)

The badge above has a known upstream bug where the repository URL field sometimes doesn't pre-fill ([home-assistant/my.home-assistant.io#698](https://github.com/home-assistant/my.home-assistant.io/issues/698)). If that happens, add it manually:

1. Home Assistant → **Settings** → **Add-ons** → **Add-on store**.
2. ⋮ menu (top right) → **Repositories**.
3. Paste `https://github.com/karl-petter/omp-relay-server-ha-addon` and click **Add**.

## Install and start

Find **OMP Collab Relay** in the add-on store, click **Install**, then **Start**. The **Log** tab should show:

```
local collab relay listening on ws://localhost:7466
connect with /r/<roomId>?role=host|guest; Ctrl+C stops the relay
```

## Point omp at the relay

Set `collab.relayUrl` in omp's settings (see upstream [`docs/collab.md`](https://github.com/can1357/oh-my-pi/blob/main/docs/collab.md)):

- Same machine as the Home Assistant host (or localhost-presenting tunnel): `ws://localhost:7466`.
- Any other machine: `wss://<your-proxy-domain>`, pointed at this add-on's port 7466 through your own TLS-terminating reverse proxy.

Or, for a one-off session without changing the default: `/collab ws://<home-assistant-host>:7466` (or the `wss://` proxy address).

## Versioning

The add-on version always mirrors the exact upstream `oh-my-pi` release it vendors. A daily check compares the pinned release against upstream's latest, and only bumps and republishes when the relay/wire source itself actually changed.
