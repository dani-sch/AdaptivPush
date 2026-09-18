// Local database fixtures are browser-only. Never advertise this server on LAN.
import { spawn, spawnSync } from 'node:child_process';
const status = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '--output', 'json'], { encoding: 'utf8', windowsHide: true });
if (status.status !== 0) throw new Error('Start local Supabase before browser QA.');
const local = JSON.parse(status.stdout);
if (local.API_URL !== 'http://127.0.0.1:54321' || !local.ANON_KEY) throw new Error('Unexpected local QA backend.');
const child = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--web', '--localhost', '--port', '8082'], {
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_SUPABASE_URL: local.API_URL,
    EXPO_PUBLIC_SUPABASE_KEY: local.ANON_KEY, EXPO_PUBLIC_AP02_DURABLE_WRITER: 'true', EXPO_PUBLIC_AP03_ATOMIC_WRITER: 'true' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
