// First-run setup for `npm run dev` / `npm test`: env files, dependencies, Docker check.
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

for (const dir of ['backend', 'frontend']) {
  if (!existsSync(`${dir}/.env`)) {
    copyFileSync(`${dir}/.env.example`, `${dir}/.env`);
    console.log(`Created ${dir}/.env from .env.example`);
  }
  if (!existsSync(`${dir}/node_modules`)) execSync('npm install', { cwd: dir, stdio: 'inherit' });
}

// Turn on the secret-blocking pre-commit hook (.githooks/pre-commit) for this clone.
try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
} catch {
  /* not a git checkout */
}

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  console.error('\nDocker is not running. Start Docker Desktop, then run the command again.\n');
  process.exit(1);
}

const env = readFileSync('backend/.env', 'utf8');
const provider = env.match(/^LLM_PROVIDER=(\w+)/m)?.[1] ?? 'anthropic';
const key = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
if (!new RegExp(`^${key}=\\S+`, 'm').test(env)) console.warn(`\n⚠  ${key} is empty in backend/.env — the app runs, but chat/AI features return an error until you set it.\n`);
