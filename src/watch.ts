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

const getVal = (line: string): string => line.split(' :~> ')?.[1] || '';

export const getCrates = (): string[] => {
  const crates: string[] = [];
  if (fs.existsSync(rswCrates)) {
    const content = fs.readFileSync(rswCrates, { encoding: 'utf8' });
    content.split('\n').forEach(line => {
      const val = getVal(line);
      if (val) crates.push(val);
    })
  }
  return crates;
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
      switch (true) {
        case /\[RSW::OK\]/.test(line):
          rswContent.status = 'ok';
          break;
        case /\[RSW::ERR\]/.test(line):
          rswContent.status = 'err';
          break;
        case /\[RSW::NAME\]/.test(line):
          rswContent.name = getVal(line);
          break;
        case /\[RSW::PATH\]/.test(line):
          rswContent.path = getVal(line);
          break;
        case /\[RSW::BUILD\]/.test(line):
          rswContent.build = getVal(line);
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
