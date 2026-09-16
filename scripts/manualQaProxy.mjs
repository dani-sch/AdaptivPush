// Local-only fault controls for physical-device QA. Never logs headers/payloads.
import http from 'node:http';
const listenAddress = process.env.AP_QA_LISTEN_ADDRESS ?? '127.0.0.1';
const port = Number(process.env.AP_QA_PROXY_PORT ?? 54329);
if (!/^(127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(listenAddress)
  || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Only a private workstation address and unprivileged port are supported.');
let mode = 'normal';
const modes = new Set(['normal', 'offline', 'legacy-reader', 'missing-schema', 'lose-next-write']);
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:54329');
  const reply = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); };
  if (url.pathname === '/__qa/health') return reply(200, { service: 'AdaptivPush synthetic QA', upstream: 'local-only', mode });
  if (url.pathname === '/__qa/mode') {
    if (!['127.0.0.1', '::1', listenAddress].includes(request.socket.remoteAddress)) return reply(403, { error: 'Fault controls are workstation-only' });
    if (request.method === 'GET') return reply(200, { mode });
    if (request.method !== 'PUT') return reply(405, { error: 'Use PUT' });
    let input = '';
    request.on('data', (chunk) => { input += chunk; if (input.length > 256) request.destroy(); });
    request.on('end', () => {
      try { const next = JSON.parse(input).mode; if (!modes.has(next)) return reply(400, { error: 'Unknown mode' }); mode = next; reply(200, { mode }); }
      catch { reply(400, { error: 'Invalid mode request' }); }
    });
    return;
  }
  const rest = url.pathname.startsWith('/rest/v1/');
  if (rest && mode === 'offline') return reply(503, { message: 'Local QA backend unavailable' });
  if (rest && mode === 'missing-schema') return reply(404, { code: '42P01', message: 'relation "public.programs" does not exist' });
  if (mode === 'legacy-reader' && url.pathname === '/rest/v1/programs'
    && /current_revision|archive_checkpoint|stable_day_id/.test(url.searchParams.get('select') ?? '')) {
    return reply(400, { code: '42703', message: 'column programs.current_revision does not exist' });
  }
  const loseResponse = mode === 'lose-next-write' && request.method === 'POST' && url.pathname.startsWith('/rest/v1/rpc/');
  if (loseResponse) mode = 'normal';
  const upstream = http.request({ hostname: '127.0.0.1', port: 54321, path: request.url, method: request.method,
    headers: { ...request.headers, host: '127.0.0.1:54321' } }, (incoming) => {
    if (loseResponse && incoming.statusCode >= 200 && incoming.statusCode < 300) {
      incoming.resume(); incoming.on('end', () => response.destroy()); return;
    }
    response.writeHead(incoming.statusCode ?? 502, incoming.headers); incoming.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) reply(502, { message: 'Local QA upstream unavailable' }); else response.destroy(); });
  request.pipe(upstream);
});
server.listen(port, listenAddress, () => console.log(`Local QA proxy ready on ${listenAddress}:${port}; mode=normal; upstream=local Supabase only.`));
