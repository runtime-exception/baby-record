import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import configuration from '../config/configuration';
import { validationSchema } from '../config/validation';

const { error } = validationSchema.validate(process.env, { allowUnknown: true });
if (error) throw new Error(error.message);
configuration();
const result = spawnSync(process.execPath, [require.resolve('prisma'), 'migrate', 'deploy'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
