// Rust Error StateMachine

import chalk from 'chalk';

class MsgState {
  type: string;
  color: string;
  reg: RegExp;

  constructor(type: string, color: string, reg: RegExp) {
    this.type = type;
    this.color = color;
    this.reg = reg;
  }
  handleTag(context: MsgContext) {
    context.setTag(this);
  }
  handleCmd(context: MsgContext) {
    context.setCmd(this);
  }
  handleAll(context: MsgContext) {
    context.setAll(this);
  }
}

class MsgContext {
  msgTag: string;
  msgCmd: string;
  constructor(message: string) {
    this.msgTag = message;
    this.msgCmd = message;
  }
  setTag(state: MsgState) {
    this.msgTag = this.msgTag.replace(state.reg, `<code class="rsw-${state.type}">$1</code>`);
  }
  setCmd(state: MsgState) {
    this.msgCmd = this.msgCmd.replace(state.reg, (chalk.bold as any)[state.color]('$1'));
  }
  setAll(state: MsgState) {
    this.setTag(state);
    this.setCmd(state);
  }
  getTag() {
    return this.msgTag;
  }
  getCmd() {
    return this.msgCmd;
  }
  getAll() {
    return {
      msgTag: this.msgTag,
      msgCmd: this.msgCmd,
    };
  }
}

export default function rustError(content: string) {
  let msgTags: string[] = [];
  let msgCmds: string[] = [];

  content.split('\n').map(i => {
    const init = new MsgContext(i);
    /**
     *   Compiling crate
     *  -->
     * 2 | code
     *   = note:
     * warning:
     * error:
     * error[E0425]:
     * help:
     */
    new MsgState('line', 'blue', /(^\s+-->|\s+\=|[\s\d]+\|)/).handleAll(init);
    new MsgState('compiling', 'green', /(^\s+Compiling)/).handleAll(init);
    new MsgState('error', 'red', /(^error(\[\w+\])?)/).handleAll(init);
    new MsgState('warn', 'yellow', /(^warning)/).handleAll(init);
    new MsgState('help', 'cyan', /(^help)/).handleAll(init);
    const { msgTag, msgCmd } = init.getAll();
    msgTags.push(msgTag);
    msgCmds.push(msgCmd);
  })
  return {
    msgTag: msgTags.join('\n'),
    msgCmd: msgCmds.join('\n'),
  };
}
