import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const distDir = path.resolve('.tmp-e2e-dist');
const viteBin = path.resolve('node_modules/vite/bin/vite.js');
const pwBin = path.resolve('node_modules/@playwright/test/cli.js');
const sharedEnv = {
  ...process.env,
  WITNESS_OUT_DIR: '.tmp-e2e-dist',
  VITE_FLAGSMITH_ENV_KEY: 'ser.playwright_local_mock_key',
  VITE_APP_ENV: 'development',
};

try {
  execFileSync(process.execPath, [viteBin, 'build'], {
    stdio: 'inherit',
    env: sharedEnv,
  });
  execFileSync(process.execPath, [pwBin, 'test', '--workers=1'], {
    stdio: 'inherit',
    env: process.env,
  });
} finally {
  fs.rmSync(distDir, { recursive: true, force: true });
}
