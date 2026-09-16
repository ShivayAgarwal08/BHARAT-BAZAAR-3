import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseEnvironment } from './env-schema.js';

// Works from both src/config and dist/config, independent of the launch directory.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const env = parseEnvironment(process.env);
