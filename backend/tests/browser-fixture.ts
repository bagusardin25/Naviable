/** Disposable localhost-only browser fixture. No production entrypoint imports this file.
 * Auth is simulated; OTP 123456 signs in the fixture user. Never use real user data.
 */
import express from 'express';
import cors from 'cors';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { LocalStore } from '../src/store.js';
import { createApp } from '../src/app.js';

const directory = await mkdtemp(join(tmpdir(), 'naviable-browser-'));
const store = await new LocalStore(directory).init();
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', phone: '6281234567890', app_metadata: { provider: 'phone' }, user_metadata: {}, created_at: new Date().toISOString() };
const token = 'naviable-browser-fixture-token';
const config = { mode: 'local' as const, production: false, host: '127.0.0.1', port: 4000, localDir: directory, origins: ['http://127.0.0.1:3000'], publicUrl: 'http://127.0.0.1:4000', trustProxy: 0 };
const api = createApp({ store, config, authenticate: async t => t === token ? user.id : undefined, analyze: async () => { throw new Error('Fixture AI unavailable'); } }).listen(4000, '127.0.0.1');
const auth = express();
auth.use(cors({ origin: config.origins })); auth.use(express.json());
auth.post('/auth/v1/otp', (_req, res) => res.json({}));
auth.post('/auth/v1/verify', (req, res) => {
  if (req.body.token !== '123456') return res.status(400).json({ msg: 'Invalid fixture code' });
  res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fixture-refresh', user });
});
auth.get('/auth/v1/user', (_req, res) => res.json(user));
auth.post('/auth/v1/logout', (_req, res) => res.status(204).end());
const authServer = auth.listen(4011, '127.0.0.1');
console.log('Disposable browser fixture: API 4000, simulated auth 4011; OTP 123456.');
async function stop() {
  api.closeAllConnections(); authServer.closeAllConnections(); api.close(); authServer.close();
  if (!resolve(directory).startsWith(resolve(tmpdir()))) throw new Error('Unsafe temporary directory');
  await rm(directory, { recursive: true, force: true }); process.exit(0);
}
process.on('SIGINT', stop); process.on('SIGTERM', stop);
