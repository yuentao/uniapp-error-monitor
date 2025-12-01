# uniapp-error-monitor

UniApp 错误监控上报插件 - 专业的 JavaScript 错误监控和上报解决方案

[![npm version](https://badge.fury.io/js/uniapp-error-monitor.svg)](https://badge.fury.io/js/uniapp-error-monitor)
[![npm downloads](https://img.shields.io/npm/dm/uniapp-error-monitor.svg)](https://www.npmjs.com/package/uniapp-error-monitor)
[![license](https://img.shields.io/npm/l/uniapp-error-monitor.svg)](https://github.com/your-username/uniapp-error-monitor/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![rollup](https://img.shields.io/badge/rollup-build-blue.svg)](https://rollupjs.org/)

## 🌟 特性

- 🔍 **全面错误捕获**: 支持全局错误、Promise 错误、控制台错误、网络错误、小程序错误
- 🎯 **环境智能**: 自动检测生产环境，非生产环境不启用错误上报
- 🚀 **高性能**: 异步发送错误，不阻塞主线程
- 🔄 **重试机制**: 网络失败自动重试，可配置重试次数和间隔
- 📊 **错误统计**: 内置错误统计功能，便于数据分析
- 🔧 **易于集成**: 零配置使用，支持自定义 webhook 和发送器
- 📱 **多平台支持**: 支持 H5、微信小程序、App 等 UniApp 支持的所有平台
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义
- 📦 **模块化**: 支持 ESM、CommonJS、UMD 多种模块格式

## 📦 安装

```bash
# npm
npm install uniapp-error-monitor

# yarn
yarn add uniapp-error-monitor

# pnpm
pnpm add uniapp-error-monitor
```

## 🚀 快速开始

### 基础使用

```javascript
import { initErrorMonitor } from 'uniapp-error-monitor'

// 初始化错误监控
initErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com', // 必填
  enableGlobalError: true,       // 启用全局错误捕获
  enablePromiseError: true,      // 启用 Promise 错误捕获
  enableConsoleError: false,     // 禁用 console.error 捕获
})

// 手动上报错误
import { reportError } from 'uniapp-error-monitor'

reportError('manual', new Error('自定义错误'), {
  page: 'index',
  action: '用户操作失败'
})
```

### Promise 包装

```javascript
import { wrapPromise } from 'uniapp-error-monitor'

// 自动捕获 Promise 错误
const result = await wrapPromise(
  fetch('https://api.example.com/data')
)
```

## 📋 配置选项

```typescript
interface ErrorMonitorOptions {
  // 基础配置
  webhookUrl: string                     // Webhook 地址（必填）
  enableGlobalError?: boolean            // 启用全局错误捕获（默认：true）
  enablePromiseError?: boolean           // 启用 Promise 错误捕获（默认：true）
  enableConsoleError?: boolean           // 启用 console.error 捕获（默认：false）
  
  // 重试配置
  maxRetries?: number                    // 最大重试次数（默认：3）
  retryDelay?: number                    // 重试延迟时间(ms)（默认：1000）
  
  // 高级配置
  forceEnable?: boolean                  // 强制启用错误监控（忽略环境检查）
  formatter?: (error: ErrorInfo) => string  // 自定义格式化函数
  sender?: (payload: ErrorInfo) => Promise<void> // 自定义发送器
}
```

## 🔧 高级使用

### 自定义发送器

```javascript
import { ErrorMonitor } from 'uniapp-error-monitor'

const errorMonitor = new ErrorMonitor()

// 使用自定义发送器
errorMonitor.setSender(async (errorInfo) => {
  // 发送到自己的服务器
  await fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorInfo)
  })
})

errorMonitor.init({
  webhookUrl: 'custom-sender' // 使用自定义发送器时，webhookUrl 可以设置为任意值
})
```

### 自定义错误格式化

```javascript
import { ErrorMonitor } from 'uniapp-error-monitor'

const errorMonitor = new ErrorMonitor()

// 设置自定义格式化函数
errorMonitor.setFormatter((errorInfo) => {
  return `🔴 错误详情：
  类型：${errorInfo.type}
  消息：${errorInfo.error}
  页面：${errorInfo.page}
  时间：${new Date(errorInfo.timestamp).toLocaleString()}`
})

errorMonitor.init({
  webhookUrl: 'your-webhook-url'
})
```

### 获取错误统计

```javascript
import { getErrorStats } from 'uniapp-error-monitor'

const stats = getErrorStats()
console.log('错误统计:', stats)
/*
输出：
{
  total: 5,
  global: 2,
  promise: 1,
  console: 0,
  miniProgram: 1,
  network: 1,
  lastErrorTime: 1640995200000
}
*/
```

## 📊 错误类型说明

| 错误类型 | 说明 | 触发条件 |
|---------|------|---------|
| `global` | 全局 JavaScript 错误 | `window.onerror` 捕获 |
| `promise` | 未处理的 Promise 拒绝 | `unhandledrejection` 事件 |
| `console` | console.error 输出 | 手动启用后捕获 |
| `miniProgram` | 小程序特定错误 | `uni.onError`, `uni.onPageNotFound` |
| `network` | 网络请求失败 | 拦截的 `uni.request` 失败 |
| `api` | API 接口错误 | 手动上报的接口错误 |
| `manual` | 手动上报的错误 | 手动调用 `reportError` |

## 🏗️ 构建配置

### 环境变量

在你的项目中设置环境变量：

```javascript
// .env 文件
VITE_WEBHOOK=https://your-webhook-url.com
```

### 开发环境自动禁用

插件会在以下情况下自动禁用（非生产环境）：

- 开发模式 (`import.meta.env.MODE === 'development'`)
- 小程序体验版、开发版、预览版
- 非 UniApp 环境

如需强制启用，设置 `forceEnable: true`。

## 🔍 TypeScript 支持

完整的 TypeScript 类型支持：

```typescript
import { ErrorMonitor, ErrorMonitorOptions, ErrorType, ErrorStats } from 'uniapp-error-monitor'

const options: ErrorMonitorOptions = {
  webhookUrl: 'https://example.com/webhook',
  maxRetries: 3
}

const errorMonitor = new ErrorMonitor(options)
```

## 📱 平台兼容性

- ✅ **微信小程序**: 完整支持
- ✅ **H5**: 完整支持  
- ✅ **App (iOS/Android)**: 完整支持
- ✅ **支付宝小程序**: 基本支持
- ✅ **字节跳动小程序**: 基本支持
- ✅ **百度小程序**: 基本支持
- ✅ **快应用**: 基本支持

## 🛠️ 开发调试

```bash
# 克隆项目
git clone https://github.com/yuentao/uniapp-error-monitor.git
cd uniapp-error-monitor

# 安装依赖
npm install

# 开发调试
npm run dev

# 类型检查
npm run type-check

# 构建
npm run build

# 单元测试
npm run test
```

## 📦 构建产物

构建后会在 `dist/` 目录生成：

- `index.js` - CommonJS 格式
- `index.mjs` - ES Module 格式  
- `index.umd.js` - UMD 格式（用于浏览器）
- `index.umd.min.js` - UMD 压缩版
- `index.d.ts` - TypeScript 类型声明
- `types/` - 类型声明目录

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

⭐ 如果这个项目对你有帮助，请给它一个星标！