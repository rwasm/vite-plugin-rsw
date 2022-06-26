import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface RswInfo {
  status: 'ok' | 'err' | '';
  name: string;
  path: string;
  build: string;
  error: string;
}

const rswContent: RswInfo = {
  status: '',
  name: '',
  build: '',
  error: '',
  path: '',
};

const rswInfo = path.resolve(process.cwd(), '.rsw', 'rsw.info');
const rswErr = path.resolve(process.cwd(), '.rsw', 'rsw.err');
const rswCrates = path.resolve(process.cwd(), '.rsw', 'rsw.crates');

const getVal = (line: string): string[] => line.split(' :~> ') || [];

export const getCrates = (): Record<string, string[]> => {
  const crates: string[] = [];
  const cratesPath: string[] = [];
  if (fs.existsSync(rswCrates)) {
    const content = fs.readFileSync(rswCrates, { encoding: 'utf8' });
    content.split('\n').forEach(line => {
      const val = getVal(line);
      if (val.length > 0) {
        val?.[0] && crates.push(val?.[0]);
        val?.[1] && cratesPath.push(val?.[1]);
      }
    })
  }
  return { crates, cratesPath };
}

export const watch = (callback: (opts: RswInfo) => void) => {
  fs.watchFile(rswInfo, {
    bigint: false,
    interval: 300,
    persistent: true,
  }, () => {
    if (!fs.existsSync(rswInfo)) return;
    const rl = readline.createInterface({
      input: fs.createReadStream(rswInfo),
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      const [, cratesPath] = getVal(line);
      switch (true) {
        case /\[RSW::OK\]/.test(line):
          rswContent.status = 'ok';
          break;
        case /\[RSW::ERR\]/.test(line):
          rswContent.status = 'err';
          break;
        case /\[RSW::NAME\]/.test(line):
          rswContent.name = cratesPath;
          break;
        case /\[RSW::PATH\]/.test(line):
          rswContent.path = cratesPath;
          break;
        case /\[RSW::BUILD\]/.test(line):
          rswContent.build = cratesPath;
          break;
      }
    });

    rl.on('close', () => {
      if (rswContent.status === 'err') {
        rswContent.error = fs.readFileSync(rswErr, { encoding: 'utf8' });
      } else {
        rswContent.error = '';
      }
      callback(rswContent);
    })
  })
}
