import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve:{
    alias:{
      '@':'/src'
    }
  },
  // 注意：不要使用 define: { global: 'globalThis' }
  // 这会导致对象属性名 global 也被替换为 globalThis
  // 例如 { global: xxx } 会变成 { globalThis: xxx }
  // 导致 axios 的 utils.global 变成 undefined
  define: {
    // 使用字符串形式，只替换标识符，不替换属性名
    'typeof global': JSON.stringify('object'),
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // 在每个 chunk 开头注入代码，定义 global 变量
        intro: `
// Polyfill: define global for axios and other libraries
if (typeof global === 'undefined') {
  var global = globalThis;
}
`.trim()
      }
    }
  },
})
