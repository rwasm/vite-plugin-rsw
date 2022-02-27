export const rswOverlay = `
const rswTemplate = \`
<style>
:host {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
  --monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --green: #26cb7c;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;
  --blue: #3884ff;
}
.window {
  font-family: var(--monospace);
  line-height: 1.5;
  width: 800px;
  color: #d8d8d8;
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: #181818;
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
}
pre {
  font-family: var(--monospace);
  font-size: 14px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}
pre::-webkit-scrollbar {
  display: none;
}
.message {
  line-height: 1.3;
  color: #6d7878;
  font-size: 14px;
}
.plugin {
  color: var(--purple);
  font-weight: bold;
}
.file {
  color: var(--green);
  margin: 8px 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 14px;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
}
.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
}
code {
  font-size: 13px;
  font-family: var(--monospace);
  font-weight: bold;
}
.rsw-line {
  color: var(--blue);
}
.rsw-compiling {
  color: var(--green);
}
.rsw-error {
  color: var(--red);
}
.rsw-warn {
  color: var(--yellow);
}
.rsw-help {
  color: var(--cyan);
}
.file-link {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class="window">
  <span class="plugin"></span>
  <pre class="file"></pre>
  <pre class="message"></pre>
  <div class="tip">
    [rsw::error] This error occurred during the build time, click outside or fix the code to dismiss.
  </div>
</div>
\`;
class RswErrorOverlay extends HTMLElement {
  constructor(payload) {
    super()
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = rswTemplate;
    this.text('.message', payload.message.trim());
    this.text('.plugin', payload.plugin.trim());
    this.text('.file', payload.id.trim());
    this.root.querySelector('.window').addEventListener('click', (e) => {
      e.stopPropagation();
    });
    this.addEventListener('click', () => {
      this.close();
    });
  }
  text(selector, text) {
    const el = this.root.querySelector(selector);
    if (el) el.innerHTML = text;
  }
  close() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
}
const overlayRswId = 'vite-rsw-error-overlay';
if (!customElements.get(overlayRswId)) {
  customElements.define(overlayRswId, RswErrorOverlay);
}
function createRswErrorOverlay(err) {
  clearRswErrorOverlay();
  document.body.appendChild(new RswErrorOverlay(err));
}
function clearRswErrorOverlay() {
  document
    .querySelectorAll(overlayRswId)
    .forEach((n) => n.close());
}
window.createRswErrorOverlay = createRswErrorOverlay;`;
