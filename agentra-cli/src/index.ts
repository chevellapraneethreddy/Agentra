#!/usr/bin/env node

import { parseCliArgs } from './cli.js';

// Execute arguments parsing
parseCliArgs(process.argv).catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
