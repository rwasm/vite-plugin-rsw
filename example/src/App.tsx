import React, { useEffect } from 'react'
import logo from './logo.svg'
import './App.css'
import init, { greet } from 'rsw';
// import init2, { greet as greet2 } from '../rsw-test/pkg';

function App() {
  useEffect(() => {
    init();
    // init2();
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello WebAssembly!</p>
        <p>Vite + Rust + React</p>
        <p>
          <button onClick={() => greet('wasm')}>
            hello wasm2
          </button>
          {' '}
          {/* <button onClick={() => greet2('wasm')}>
            hi wasm
          </button> */}
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
        <p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          {' | '}
          <a
            className="App-link"
            href="https://vitejs.dev/guide/features.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vite Docs
          </a>
        </p>
      </header>
    </div>
  )
}

export default App
