import { defineConfig } from 'rollup'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import typescript from '@rollup/plugin-typescript'

const pkg = require('./package.json')

const external = [
  'vue',
  'vue3',
  '@dcloudio/uni-app',
  '@dcloudio/uni-core',
  'uniapp'
]

// 复制 TypeScript 定义文件到 dist 目录
function copyTypescriptDefinitions() {
  return {
    name: 'copy-types',
    writeBundle() {
      const fs = require('fs')
      const path = require('path')
      
      const srcTypesFile = path.resolve(__dirname, 'src/index.d.ts')
      const destTypesFile = path.resolve(__dirname, 'dist/index.d.ts')
      
      if (fs.existsSync(srcTypesFile)) {
        fs.copyFileSync(srcTypesFile, destTypesFile)
        console.log('✅ TypeScript definitions copied to dist/index.d.ts')
      }
    }
  }
}

const plugins = [
  typescript(),
  babel({
    babelHelpers: 'bundled',
    extensions: ['.js', '.ts'],
    exclude: ['node_modules/**'],
    presets: [
      ['@babel/preset-env', {
        modules: false,
        targets: {
          esmodules: true
        }
      }]
    ]
  }),
  copyTypescriptDefinitions()
]

export default defineConfig([
  {
    input: 'src/index.js',
    output: [
      // ESM 输出
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
        exports: 'named'
      },
      // UMD 输出 (用于浏览器)
      {
        file: pkg.browser,
        format: 'umd',
        name: 'UniAppErrorMonitor',
        sourcemap: true,
        globals: {
          'vue': 'Vue'
        },
        exports: 'named'
      },
      // CommonJS 输出 (用于 Node.js)
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    external,
    plugins
  },
  // 生产环境构建 (压缩版本)
  {
    input: 'src/index.js',
    output: [
      {
        file: pkg.browser.replace('.umd.js', '.umd.min.js'),
        format: 'umd',
        name: 'UniAppErrorMonitor',
        sourcemap: false,
        exports: 'named',
        plugins: [terser()]
      }
    ],
    external,
    plugins
  }
])