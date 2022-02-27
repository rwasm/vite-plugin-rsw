import fs from 'fs';
import path from 'path';
import readline from 'readline';

interface RswInfo {
  status: 'ok' | 'err' | '';
  name: string;
  file: string;
  args: string;
  error: string;
}

const rswContent: RswInfo = {
  status: '',
  name: '',
  args: '',
  error: '',
  file: '',
};

const rswInfo = path.resolve(process.cwd(), '.rsw', 'rsw.info');
const rswErr = path.resolve(process.cwd(), '.rsw', 'rsw.err');

export function watch(callback: (opts: RswInfo) => void) {
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
          rswContent.name = line.match(/(\[RSW::NAME\] )(.*)/)?.[2] || '';
          break;
        case /\[RSW::FILE\]/.test(line):
          rswContent.file = line.match(/(\[RSW::FILE\] )(.*)/)?.[2] || '';
          break;
        case /\[RSW::ARGS\]/.test(line):
          rswContent.args = line.match(/(\[RSW::ARGS\] )(.*)/)?.[2] || '';
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
