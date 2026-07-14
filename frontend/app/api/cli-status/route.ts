import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cliPath = path.join(process.cwd(), '../agentra-cli');
    const exists = fs.existsSync(cliPath);
    return NextResponse.json({ exists });
  } catch (err) {
    return NextResponse.json({ exists: false });
  }
}
