class RustError {
  // current line
  line: string;
  // current index
  index: number;
  // browser display
  msgTagGroup: string[];

  constructor() {
    this.line = '';
    this.index = -1;
    this.msgTagGroup = [];
  }

  init(line: string, index: number) {
    this.line = line;
    this.index= index;
    this.msgTagGroup[index] = line;
    return this;
  }

  setTag(type: string, reg: RegExp) {
    if (new RegExp(reg).test(this.line)) {
      this.msgTagGroup[this.index] = this.line.replace(reg, `<code class="rsw-${type}">$1</code>`);
    }
  }

  handle(type: string, reg: RegExp) {
    this.setTag(type, reg);
    return this;
  }

  getValue() {
    return this.msgTagGroup.join('\n');
  }
}

export default function fmtRustError(content: String) {
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
      .handle('line', /(^\s+-->|\s*=|[\s\d]*\|)/)
      .handle('compiling', /(^\s+Compiling)/)
      .handle('error', /(^error(\[\w+\])?)/)
      .handle('warn', /(^warning)/)
      .handle('help', /(^help)/);
  });

  return rsIns.getValue();
}
