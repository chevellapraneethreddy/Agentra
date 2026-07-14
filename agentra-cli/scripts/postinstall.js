#!/usr/bin/env node

import { exec } from 'child_process';
import os from 'os';

console.log('====================================\n');
console.log('🚀 Welcome to Agentra\n');
console.log('Generative AI as a Service\n');
console.log('Opening Agentra in your browser...\n');
console.log('https://YOUR-DOMAIN.com\n');
console.log('====================================');

const url = 'https://YOUR-DOMAIN.com';

let command;
switch (os.platform()) {
  case 'darwin':
    command = `open "${url}"`;
    break;
  case 'win32':
    command = `cmd.exe /c start "" "${url}"`;
    break;
  default:
    command = `xdg-open "${url}"`;
    break;
}

// Safely execute without blocking installer process
try {
  exec(command, (err) => {
    if (err) {
      console.log(`\nVisit ${url}`);
    }
  });
} catch (e) {
  console.log(`\nVisit ${url}`);
}
