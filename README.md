# OMP Collab Relay — Home Assistant Add-on

[`oh-my-pi`](https://github.com/can1357/oh-my-pi) (omp) is a terminal coding agent. Its `/collab` command shares a running session live — with another terminal, or a browser/QR link — so you or a teammate can watch an agent work, or jump in and prompt it, from anywhere. By default `/collab` carries that session through omp's own hosted relay, `my.omp.sh`. This add-on runs that relay yourself instead, as an ordinary Home Assistant add-on: every collab frame is end-to-end encrypted before it reaches the relay, so self-hosting it means no third party ever sees your prompts, code, or session content — not just the relay, but the browser client too (see [Self-hosting the browser client](#self-hosting-the-browser-client-optional) below).

**One caveat:** the upstream script this add-on runs, `local-relay.ts`, is documented as a stand-in for local/offline use — on its own it has no TLS and serves no browser client, `/share` endpoint, or `/healthz`, only the WebSocket upgrade itself. This repo closes both gaps (TLS via your own reverse proxy, a self-hosted browser client published to GitHub Pages), but the practical result is the same rule the omp CLI and browser client both enforce: plain `ws://` is only accepted when the hostname is `localhost`, `127.0.0.1`, or `::1` — any other hostname must be `wss://`. This add-on does not terminate TLS itself.

In practice, for the scenario this add-on exists for — you don't run any other server, just Home Assistant, and want `/collab` to work when you're away from home — the expected setup is:

- **Golden path: connect back over a private network you control** — WireGuard, Tailscale, or another VPN — then front the add-on with your own TLS reverse proxy (see [Fronting with TLS for remote access](#fronting-with-tls-for-remote-access)) and point omp at the resulting `wss://` address. No router port-forward needed; see the [architecture](#architecture) section below.

Two other setups also work, but aren't what this add-on is built around:

- **Same machine as omp** (or over a tunnel that presents as `localhost`): works unmodified, point omp at `ws://localhost:7466` — mainly useful for local testing, not day-to-day remote use.
- **Forwarding the TLS proxy straight to the public internet** instead of a VPN: also supported, but needs the rate-limiting covered in [Hardening beyond TLS](#hardening-beyond-tls), since the relay has no authentication of its own.

## Architecture

### Golden path: private network (WireGuard or another VPN)

```mermaid
flowchart LR
    subgraph clients["omp clients (hold the room key)"]
        host["omp host — /collab"]
        guest["omp guest"]
        browserGuest["Browser/QR guest"]
    end

    host == "wss:// over your VPN" ==> proxy
    guest == "wss:// over your VPN" ==> proxy
    browserGuest == "wss:// over your VPN" ==> proxy

    subgraph ha["Home Assistant host"]
        proxy["TLS reverse proxy\nCaddy / Nginx Proxy Manager"]
        relay["OMP Collab Relay add-on\nlocal-relay.ts : 7466\nforwards encrypted frames by roomId\n(never sees the room key)"]
    end
    proxy -- "ws://127.0.0.1:7466 (loopback)" --> relay

    browserGuest -. "public internet: fetch static JS/CSS\n(room key stays in URL #fragment)" .-> pages["GitHub Pages\ncollab-web static build"]
```

Clients reach the Home Assistant host only through a private network you control — no router port-forward, nothing exposed to the public internet. The relay only ever sees encrypted frames tagged with a room ID — it pairs host and guest sockets for the same room and forwards bytes, nothing more — and the TLS reverse proxy sits in front of it because the relay itself has no TLS (see [Fronting with TLS for remote access](#fronting-with-tls-for-remote-access)). The room key that decrypts those frames is generated client-side and never transmitted to the relay; for browser/QR guests it travels only in the URL fragment after `#`, which browsers never send to a server. The one hop that's unconditionally public internet regardless of network path is the static JS/CSS fetch from GitHub Pages for browser/QR guests — but that page never receives the room key, so it can't decrypt or join the session; it only renders the client that then connects to your relay.

### Also possible: same machine as omp

```mermaid
flowchart LR
    host["omp host — /collab"] -- "ws://localhost:7466" --> relay["OMP Collab Relay add-on\n(same machine as omp)"]
    guest["omp guest"] -- "ws://localhost:7466" --> relay
```

No TLS, no proxy, no network path to reason about — useful for local testing, not for day-to-day remote use.

### Also possible: public internet port-forward

```mermaid
flowchart LR
    host["omp host — /collab"] -. "wss:// over the public internet" .-> proxy["TLS reverse proxy\n(port forwarded on your router)"]
    guest["omp guest"] -. "wss:// over the public internet" .-> proxy
    proxy -- "ws://127.0.0.1:7466" --> relay["OMP Collab Relay add-on"]
```

Works the same way as the golden path, minus the VPN — your TLS proxy's port is forwarded straight to the internet instead. Needs the rate-limiting covered in [Hardening beyond TLS](#hardening-beyond-tls), since the relay has no authentication of its own.

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

- **Golden path — remote, over your VPN:** `wss://<your-proxy-domain>`, pointed at this add-on's port 7466 through your own TLS-terminating reverse proxy (see [Fronting with TLS for remote access](#fronting-with-tls-for-remote-access)).
- **Same machine as the Home Assistant host** (or localhost-presenting tunnel): `ws://localhost:7466` — local testing, not the expected remote setup.

Optionally also set `collab.webUrl` to a self-hosted copy of the browser client (see below) so the browser/QR link that `/collab` prints points at your own infrastructure instead of `my.omp.sh`.

Or, for a one-off session without changing the default: `/collab ws://<home-assistant-host>:7466` (or the `wss://` proxy address).

## Fronting with TLS for remote access

This assumes the golden-path setup above: your clients reach the Home Assistant host over a private network (WireGuard, Tailscale, or another VPN) you control, with no router port-forward. Plain `ws://` only works when omp and the relay are on the same machine (or a tunnel presenting as one) — anything else needs a TLS-terminating reverse proxy in front of port 7466, exposed to omp as `wss://`, whether that proxy is reached through your VPN or — see [Hardening beyond TLS](#hardening-beyond-tls) — a port forwarded to the public internet instead. Two documented ways to set up that proxy, both ordinary Supervisor-managed add-ons (installed from the Store, covered by Home Assistant's normal backup/restore, no host-OS changes required):

### Caddy, reusing a certificate you already have (recommended default)

If your Home Assistant install already has a certificate at `/ssl/fullchain.pem` and `/ssl/privkey.pem` — the standard location both the official **Let's Encrypt** add-on and the **DuckDNS** add-on write to — the [Caddy 2 add-on](https://github.com/einschmidt/hassio-addons) can reuse it directly on a new port, with no second certificate issuance and no GUI/database add-ons to install:

1. Add `https://github.com/einschmidt/hassio-addons` as a repository and install **Caddy 2** (don't start it yet).
2. Via the **Terminal & SSH** add-on (or **Samba**), find Caddy's config folder with `ls /addon_configs/` (named `<hash>_caddy-2`) and create a Caddyfile at `/addon_configs/<hash>_caddy-2/Caddyfile`:
   ```
   your-domain.example:7467 {
       tls /ssl/fullchain.pem /ssl/privkey.pem
       reverse_proxy localhost:7466
   }
   ```
   Replace `your-domain.example` with the hostname your existing certificate actually covers, and `7467` with any free port.
3. Set Caddy's **Configuration** tab to `non_caddyfile_config: {}`, `log_level: info`, `args: ["--watch"]`, `env_vars: []`, then **Start** it and check the Log tab for a clean startup with no ACME activity (it's using the static cert file, not requesting its own).
4. If `your-domain.example` doesn't already resolve privately to this host — e.g. you're reaching it over a plain public DNS name rather than a VPN with split-horizon DNS for it — forward the port you picked on your router, the same way you forward whatever port your existing certificate's service already uses.
5. Point omp at `wss://your-domain.example:7467`.

Reusing the existing certificate on a new port avoids a second Let's Encrypt certificate for the same hostname (Let's Encrypt rate-limits duplicate certs per domain to roughly 5/week) and needs no new add-on dependencies beyond Caddy itself.

### Nginx Proxy Manager (GUI, needs a database)

If you'd rather manage proxy rules through a web UI, or already run Nginx Proxy Manager for other services, install the **MariaDB** and **Nginx Proxy Manager** add-ons from the Store, add a Proxy Host forwarding to `omp-collab-relay:7466` with **Websockets Support** enabled, and let it issue its own certificate for a domain of your choice. The Home Assistant add-on wrapper requires MariaDB rather than SQLite (likely to avoid SQLite file-locking issues reported on Raspberry Pi), so this path has more moving parts than the Caddy option above.

### Hardening beyond TLS

If you forward the add-on's TLS proxy port straight to the public internet instead of going through a VPN (not the golden path above, but fully supported), keep in mind that the relay has no authentication of its own — a room ID and `role=host|guest` in the URL is all it checks. That's less exposed than it sounds: room IDs are high-entropy random strings (`generateRoomId()` upstream), not realistically guessable, and even a connection that does know a room ID can't decrypt anything or prompt the agent without the separate room *key*, which never reaches the relay — the host's own code rejects writes from anyone without it. What the relay has no defense against is a flood of connection attempts (valid or garbage room IDs alike): each one costs the relay a WebSocket handshake and a map lookup before being accepted or rejected, so add a connection/request rate limit at whichever reverse proxy terminates TLS for you — Caddy's [`rate_limit`](https://caddyserver.com/docs/caddyfile/directives/rate_limit) directive or Nginx Proxy Manager's built-in rate limiting — since the relay itself has none.

## Self-hosting the browser client (optional)

`/collab` always prints a browser link alongside the terminal one, but this add-on's relay doesn't serve that client itself (see the limitation above). This repository publishes one anyway, independent of the add-on: `.github/workflows/pages.yml` builds `packages/collab-web`'s static output from the same pinned `oh-my-pi` release the relay vendors, strips the bundled third-party analytics script, and deploys it to GitHub Pages on every push to `main` — no container, nothing added to the Home Assistant host.

The room secret lives only in the URL fragment (the part after `#`), which browsers never send to the page's server by spec — GitHub Pages only ever serves the same static JS/CSS/HTML to every visitor; your actual session traffic goes straight from the browser to your relay over `wss://`, so this stays fully self-hosted end to end.

If you've forked this repository, enable it once under your fork's **Settings → Pages → Source: GitHub Actions** (not on by default on a fork), then point omp at it:

```
omp config set collab.webUrl https://<your-fork-owner>.github.io/<your-fork-name>
```

`/collab` then prints a browser link pointing at your own GitHub Pages site instead of `my.omp.sh`, with the relay connection itself still carried entirely by this add-on.

## Versioning

The add-on version always mirrors the exact upstream `oh-my-pi` release it vendors. A daily check compares the pinned release against upstream's latest, and only bumps and republishes when the relay/wire source itself actually changed.
