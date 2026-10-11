# OMP Collab Relay

Self-hosted relay for [`oh-my-pi`](https://github.com/can1357/oh-my-pi) (omp) `/collab` live session sharing — a self-hosted stand-in for the hosted `my.omp.sh` relay, listening on port 7466.

## Not a drop-in for `my.omp.sh`

This runs upstream's documented `local-relay.ts`: no TLS, no `/share` blob endpoints, no `/healthz`. omp only accepts plain `ws://` relay URLs when the hostname is `localhost`, `127.0.0.1`, or `::1` — any other hostname needs `wss://`. This add-on does not terminate TLS.

- **Same machine as omp:** works unmodified via `ws://localhost:7466`.
- **Any other machine:** front this add-on with your own TLS reverse proxy (Nginx Proxy Manager, Caddy, Cloudflare Tunnel, Traefik, etc.) and use the resulting `wss://` address.

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
