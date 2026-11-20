import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import configuration from '../config/configuration';

configuration();
const result = spawnSync(process.execPath, [require.resolve('prisma'), 'migrate', 'deploy'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
