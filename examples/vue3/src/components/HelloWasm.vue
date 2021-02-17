<template>
  <button @click="greet('webAssembly')">hello wasm</button>
  <button @click="greet2('wasm')">hi wasm</button>
</template>

<script lang="ts">
import init, { greet } from '@rsw/hey';
import init2, { greet as greet2 } from 'rsw-test';
import { ref, defineComponent } from 'vue'

// init wasm
init();
init2();

export default defineComponent({
  name: 'HelloWasm',
  setup: () => {
    return { greet, greet2 }
  }
})
</script>
