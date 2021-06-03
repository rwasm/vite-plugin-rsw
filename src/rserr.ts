import chalk from 'chalk';

class RustError {
  // current line
  line: string;
  // current index
  index: number;
  // browser display
  msgTagGroup: string[];
  // terminal display
  msgCmdGroup: string[];

  constructor() {
    this.line = '';
    this.index = -1;
    this.msgTagGroup = [];
    this.msgCmdGroup = [];
  }

  init(line: string, index: number) {
    this.line = line;
    this.index= index;
    this.msgTagGroup[index] = line;
    this.msgCmdGroup[index] = line;
    return this;
  }

  setTag(type: string, reg: RegExp) {
    if (new RegExp(reg).test(this.line)) {
      this.msgTagGroup[this.index] = this.line.replace(reg, `<code class="rsw-${type}">$1</code>`);
    }
  }

  setCmd(color: string, reg: RegExp) {
    if (new RegExp(reg).test(this.line)) {
      this.msgCmdGroup[this.index] = this.line.replace(reg, (chalk.bold as any)[color]('$1'));
    }
  }

  handle(type: string, color: string, reg: RegExp) {
    this.setTag(type, reg);
    this.setCmd(color, reg);
    return this;
  }

  getValue() {
    return {
      msgTag: this.msgTagGroup.join('\n'),
      msgCmd: this.msgCmdGroup.join('\n'),
    };
  }
}

export default function fmtRustError(content: string) {
  const rsIns = new RustError();
  /**
   *   Compiling crate
   *  -->
   * 2 | code  error
   * 3 |       ^^^^^
   *   = note:
   * warning:
   * error:
   * error[E0425]:
   * help:
   */
  content.split('\n').forEach((line, index) => {
    rsIns.init(line, index)
      .handle('line', 'blue', /(^\s+-->|\s*=|[\s\d]*\|)/)
      .handle('compiling', 'green', /(^\s+Compiling)/)
      .handle('error', 'red', /(^error(\[\w+\])?)/)
      .handle('warn', 'yellow', /(^warning)/)
      .handle('help', 'cyan', /(^help)/);
  });

  return rsIns.getValue();
}
