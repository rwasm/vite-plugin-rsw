import React, { useEffect } from 'react'
import logo from './logo.svg'
import './App.css'
import init, { greet } from 'rsw';
import init2, { greet as greet2 } from 'rsw-test';

function App() {
  useEffect(() => {
    init();
    init2();
  }, [])

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello WebAssembly!</p>
        <p>Vite + Rust + React</p>
        <p>
          <button onClick={() => greet('wasm')}>
            hello wasm
          </button>
          {' '}
          <button onClick={() => greet2('wasm')}>
            hi wasm
          </button>
        </p>
        <p>
          Edit <code>App.tsx</code> and save to test HMR updates.
        </p>
      </header>
    </div>
  )
}

export default App
