import fs from 'node:fs';

export function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

export function readFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

export function parseJson(content: string, sourceName: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse JSON from ${sourceName}: invalid syntax`);
  }
}

export function isStdinPiped(): boolean {
  return !process.stdin.isTTY;
}
