import { execFileSync } from 'node:child_process';

const base = 'http://localhost:3000/api';

const auth = {
  email: 'kofi.admin@afrireach.africa',
  password: 'AfriOOH!2026',
};

const login = async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  });
  const data = await res.json();
  console.log('login', res.status, JSON.stringify(data));
};

const health = async () => {
  const res = await fetch(`${base.replace('/api', '')}/api/health`);
  const data = await res.json();
  console.log('health', res.status, JSON.stringify(data));
};

async function main() {
  await health();
  await login();
}

await main();
