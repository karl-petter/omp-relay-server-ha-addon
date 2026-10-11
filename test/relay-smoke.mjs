// Exercises the local-relay.ts wire contract documented in its own header
// comment: host/guest join, envelope broadcast + peerId rewrite, and the
// 4009/4004/4001 close-code behavior. Run against a live container on
// RELAY_PORT (default 7466).
const PORT = process.env.RELAY_PORT ?? "7466";
const BASE = `ws://127.0.0.1:${PORT}`;
const ROOM = "smoketest0123456789";

function waitFor(ws, event) {
	return new Promise((resolve, reject) => {
		ws.addEventListener(event, resolve, { once: true });
		ws.addEventListener("error", reject, { once: true });
	});
}

function envelope(peerId, text) {
	const payload = new TextEncoder().encode(text);
	const buf = new Uint8Array(4 + payload.length);
	new DataView(buf.buffer).setUint32(0, peerId, false);
	buf.set(payload, 4);
	return buf;
}

function peerIdOf(bytes) {
	return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
}

async function assertCloseCode(url, expected, label) {
	const ws = new WebSocket(url);
	const ev = await waitFor(ws, "close");
	if (ev.code !== expected) throw new Error(`${label}: expected close ${expected}, got ${ev.code}`);
	console.log(`ok - ${label} (close ${ev.code})`);
}

await assertCloseCode(`${BASE}/r/${ROOM}?role=guest`, 4004, "guest joining a missing room is rejected");

const host = new WebSocket(`${BASE}/r/${ROOM}?role=host`);
await waitFor(host, "open");
console.log("ok - host connects and creates the room");

const guest = new WebSocket(`${BASE}/r/${ROOM}?role=guest`);
await waitFor(guest, "open");
const joinMsg = JSON.parse((await waitFor(host, "message")).data);
if (joinMsg.t !== "peer-joined" || joinMsg.peer !== 1) {
	throw new Error(`unexpected join message: ${JSON.stringify(joinMsg)}`);
}
console.log("ok - host is notified of the guest join");

host.send(envelope(0, "hello-guest"));
const fromHost = new Uint8Array(await (await waitFor(guest, "message")).data.arrayBuffer());
if (new TextDecoder().decode(fromHost.subarray(4)) !== "hello-guest") {
	throw new Error("host broadcast payload mismatch");
}
console.log("ok - host broadcast (peerId 0) reaches the guest unchanged");

guest.send(envelope(0, "hi-host"));
const fromGuest = new Uint8Array(await (await waitFor(host, "message")).data.arrayBuffer());
if (peerIdOf(fromGuest) !== 1) throw new Error(`expected rewritten peerId 1, got ${peerIdOf(fromGuest)}`);
if (new TextDecoder().decode(fromGuest.subarray(4)) !== "hi-host") throw new Error("guest payload mismatch");
console.log("ok - guest message is forwarded to host with peerId rewritten to 1");

await assertCloseCode(`${BASE}/r/${ROOM}?role=host`, 4009, "a second host for the same room is rejected");

host.close();
const closedMsg = JSON.parse((await waitFor(guest, "message")).data);
if (closedMsg.t !== "room-closed") throw new Error(`unexpected message on host disconnect: ${JSON.stringify(closedMsg)}`);
const guestClose = await waitFor(guest, "close");
if (guestClose.code !== 4001) throw new Error(`expected guest close 4001, got ${guestClose.code}`);
console.log("ok - host disconnect notifies and closes the guest");

console.log("smoke test passed");
