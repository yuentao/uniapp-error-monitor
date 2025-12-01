import { defineConfig } from 'rollup'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'

const pkg = require('./package.json')

const external = [
  'vue',
  'vue3',
  '@dcloudio/uni-app',
  '@dcloudio/uni-core',
  'uniapp'
]

const plugins = [
  babel({
    babelHelpers: 'bundled',
    extensions: ['.js', '.ts', '.vue'],
    exclude: ['node_modules/**'],
    presets: [
      ['@babel/preset-env', {
        modules: false,
        targets: {
          esmodules: true
        }
      }]
    ]
  })
]

export default defineConfig([
  {
    input: 'src/index.js',
    output: [
      // ESM 输出
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true
      },
      // UMD 输出 (用于浏览器)
      {
        file: pkg.browser,
        format: 'umd',
        name: 'UniAppErrorMonitor',
        sourcemap: true,
        globals: {
          'vue': 'Vue'
        }
      },
      // CommonJS 输出 (用于 Node.js)
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true
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
        plugins: [terser()]
      }
    ],
    external,
    plugins
  }
])