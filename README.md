# uniapp-error-monitor

🔍 UniApp 专业错误监控和上报工具 - 支持全平台、多场景错误捕获

[![npm version](https://badge.fury.io/js/uniapp-error-monitor.svg)](https://badge.fury.io/js/uniapp-error-monitor)
[![npm downloads](https://img.shields.io/npm/dm/uniapp-error-monitor.svg)](https://www.npmjs.com/package/uniapp-error-monitor)
[![license](https://img.shields.io/npm/l/uniapp-error-monitor.svg)](https://github.com/your-username/uniapp-error-monitor/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![rollup](https://img.shields.io/badge/rollup-build-blue.svg)](https://rollupjs.org/)

## ✨ 核心特性

- 🎯 **零配置使用**: 开箱即用，支持多种导入方式

- 🔍 **全面错误捕获**: 全局错误、Promise错误、控制台错误、网络错误、小程序错误

- 🧠 **环境智能**: 自动检测生产环境，非生产环境优雅降级

- ⚡ **高性能**: 异步发送错误，不阻塞主线程

- 🔄 **重试机制**: 网络失败自动重试，可配置次数和间隔

- 📊 **错误统计**: 内置统计功能，便于数据分析

- 🔧 **高度可定制**: 支持自定义发送器和格式化函数

- 📱 **全平台支持**: H5、微信小程序、App、支付宝小程序等

- 🛡️ **类型安全**: 完整的 TypeScript 类型定义

- 📦 **多格式输出**: 支持 ESM、CommonJS、UMD 格式

- 🎚️ **错误级别控制**: 支持 strict/standard/silent 三种监控模式

- 🔄 **错误去重**: 相同错误在指定间隔内只上报一次，避免重复告警

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



### 方式一：命名导出（推荐）



```javascript

import { 
  initErrorMonitor, 
  reportError, 
  getErrorStats, 
  wrapPromise,
  setErrorLevel,
  clearErrorCache,
  ERROR_LEVEL
} from 'uniapp-error-monitor'


// 初始化错误监控
initErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com',  // 必填
  enableGlobalError: true,     // 启用全局错误捕获
  enablePromiseError: true,    // 启用 Promise 错误捕获
  enableConsoleError: false,   // 禁用 console.error 捕获
  errorLevel: ERROR_LEVEL.STRICT,  // 错误级别：strict/standard/silent
  dedupInterval: 60000,        // 错误去重间隔（毫秒），默认1分钟
})


// 设置错误级别（可选）
setErrorLevel(ERROR_LEVEL.STANDARD)  // 切换为标准模式


// 手动上报错误
reportError('manual', new Error('自定义错误'), {
  page: 'index',
  action: '用户操作失败'
})


// Promise 包装（自动捕获 Promise 错误）
const result = await wrapPromise(
  fetch('https://api.example.com/data')
)


// 获取错误统计
const stats = getErrorStats()
console.log('错误统计:', stats)


// 清空错误去重缓存（可选）
clearErrorCache()

```

### 方式二：类实例（高级用法）

```javascript
import { ErrorMonitor } from 'uniapp-error-monitor'

// 创建自定义实例
const errorMonitor = new ErrorMonitor()

// 设置自定义发送器
errorMonitor.setSender(async (errorInfo) => {
  // 发送到自己的服务器
  await fetch('/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorInfo)
  })
})

// 设置自定义格式化函数
errorMonitor.setFormatter((errorInfo) => {
  return `🔴 错误详情：
  类型：${errorInfo.type}
  消息：${errorInfo.error}
  页面：${errorInfo.page}
  时间：${new Date(errorInfo.timestamp).toLocaleString()}`
})

// 初始化
errorMonitor.initErrorMonitor({
  webhookUrl: 'your-webhook-url'
})

// 使用实例方法
errorMonitor.reportError('api', new Error('接口调用失败'))
```

### 方式三：默认实例（向后兼容）

```javascript
import ErrorMonitor from 'uniapp-error-monitor'

// 使用默认实例
ErrorMonitor.initErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com'
})

ErrorMonitor.reportError('manual', new Error('测试错误'))
```

## ⚙️ 配置选项



```typescript

interface ErrorMonitorOptions {
  // 基础配置
  webhookUrl?: string           // Webhook 地址（可选，使用环境变量）
  enableGlobalError?: boolean   // 启用全局错误捕获（默认：true）
  enablePromiseError?: boolean  // 启用 Promise 错误捕获（默认：true）
  enableConsoleError?: boolean  // 启用 console.error 捕获（默认：false）


  // 错误级别配置
  errorLevel?: 'strict' | 'standard' | 'silent'  // 错误级别（默认：silent）
  

  // 错误去重配置
  dedupInterval?: number        // 相同错误去重间隔(ms)（默认：60000，即1分钟）


  // 重试配置
  maxRetries?: number           // 最大重试次数（默认：3）
  retryDelay?: number           // 重试延迟时间(ms)（默认：1000）


  // 高级配置
  forceEnable?: boolean         // 强制启用错误监控（忽略环境检查）
  sender?: (errorInfo: ErrorInfo) => Promise<void>  // 自定义发送器
  formatter?: (errorInfo: ErrorInfo) => string      // 自定义格式化函数
}

```



### 错误级别说明



| 级别 | 说明 | 监控范围 |

|------|------|----------|

| `strict` | 严格模式 | 监控所有错误（global、promise、console、miniProgram、api、network） |

| `standard` | 标准模式 | 监控基本错误（global、promise、miniProgram） |

| `silent` | 静默模式 | 仅监控严重错误（miniProgram、pageNotFound） |



### 错误严重程度分类



| 严重程度 | 错误类型 |

|----------|----------|

| **critical** (严重) | miniProgram, pageNotFound |

| **normal** (普通) | global, promise, api, network, manual |

| **minor** (轻微) | console |

## 📊 错误类型

| 类型 | 说明 | 自动捕获 | 手动上报 | 触发场景 |
|------|------|----------|----------|----------|
| `global` | 全局 JavaScript 错误 | ✅ | ❌ | `window.onerror` |
| `promise` | Promise 拒绝错误 | ✅ | ❌ | `unhandledrejection` |
| `console` | console.error 输出 | ✅ | ❌ | 启用后自动捕获 |
| `miniProgram` | 小程序特定错误 | ✅ | ❌ | `uni.onError`, `uni.onPageNotFound` |
| `network` | 网络请求失败 | ✅ | ❌ | 拦截的 `uni.request` 失败 |
| `api` | API 接口错误 | ❌ | ✅ | 手动调用 `reportError` |
| `manual` | 手动上报错误 | ❌ | ✅ | 手动调用 `reportError` |

## 🔧 高级用法

### 环境检测

```javascript
import { getEnvironmentInfo } from 'uniapp-error-monitor'

const envInfo = getEnvironmentInfo()

if (envInfo.isProduction) {
  console.log('生产环境，错误监控已启用')
} else {
  console.log('开发环境，错误监控已禁用')
}
```

### 重置统计

```javascript
import { resetErrorStats } from 'uniapp-error-monitor'

// 重置错误统计（在页面刷新或特定事件后）
resetErrorStats()
console.log('错误统计已重置')
```

### 错误级别控制

```javascript
import { setErrorLevel, getErrorLevel, ERROR_LEVEL } from 'uniapp-error-monitor'

// 获取当前错误级别
const currentLevel = getErrorLevel()
console.log('当前错误级别:', currentLevel)

// 设置错误级别
setErrorLevel(ERROR_LEVEL.STRICT)   // 严格模式：监控所有错误
setErrorLevel(ERROR_LEVEL.STANDARD) // 标准模式：监控基本错误
setErrorLevel(ERROR_LEVEL.SILENT)   // 静默模式：仅监控严重错误
```

### 错误去重管理

```javascript
import { clearErrorCache } from 'uniapp-error-monitor'

// 清空错误去重缓存（允许相同错误重新上报）
clearErrorCache()

// 去重机制说明：
// - 相同错误在 dedupInterval 间隔内只会被上报一次
// - 默认间隔为 60 秒（60000ms）
// - 可通过配置 dedupInterval 自定义间隔时间
```

### 丰富的错误上下文

```javascript
reportError('global', new Error('页面崩溃'), {
  // 用户信息
  userId: 'user123',
  userAgent: navigator.userAgent,
  
  // 页面信息
  currentPage: getCurrentPageName(),
  routeParams: getCurrentPage()?.$page?.fullPath,
  
  // 业务信息
  action: '用户点击按钮',
  component: 'UserProfile',
  
  // 性能信息
  loadTime: performance.now(),
  memoryUsage: performance.memory?.usedJSHeapSize,
  
  // 自定义数据
  customData: {
    sessionId: getSessionId(),
    feature: 'user_management'
  }
})
```

### 批量错误处理

```javascript
// 定时检查错误状态
setInterval(() => {
  const stats = getErrorStats()
  if (stats.total > 10) {
    console.warn('检测到大量错误:', stats)
    // 可以发送告警或执行其他处理逻辑
  }
}, 60000) // 每分钟检查一次
```

## 🛡️ TypeScript 支持



完整的类型安全支持：


```typescript

import type { 
  ErrorMonitorOptions, 
  ErrorType, 
  ErrorStats, 
  EnvironmentInfo, 
  ErrorInfo 
} from 'uniapp-error-monitor'

import { 
  initErrorMonitor, 
  reportError, 
  setErrorLevel,
  ERROR_LEVEL 
} from 'uniapp-error-monitor'


// 类型安全的配置

const options: ErrorMonitorOptions = {
  webhookUrl: 'https://example.com/webhook',
  enableGlobalError: true,
  enablePromiseError: true,
  errorLevel: ERROR_LEVEL.STRICT,
  dedupInterval: 60000,
  maxRetries: 5,
  retryDelay: 2000,
}


// 类型安全的错误上报

const reportTypeSafeError = (type: ErrorType, message: string) => {
  reportError(type, new Error(message), {
    timestamp: Date.now(),
    userId: '12345'
  })
}

```

## 📱 平台兼容性

- ✅ **微信小程序**: 完整支持，包括所有错误类型
- ✅ **H5**: 完整支持，支持所有现代浏览器
- ✅ **App (iOS/Android)**: 完整支持
- ✅ **支付宝小程序**: 基本支持
- ✅ **字节跳动小程序**: 基本支持
- ✅ **百度小程序**: 基本支持
- ✅ **快应用**: 基本支持

## 🏗️ 环境配置

### 环境变量

在你的项目中设置环境变量：

```bash
# .env 文件
VITE_WEBHOOK=https://your-webhook-url.com
```

### 环境检测逻辑

插件会在以下情况下自动禁用（非生产环境）：

- 开发模式 (`import.meta.env.MODE === 'development'`)
- 小程序体验版、开发版、预览版
- 非 UniApp 环境

如需强制启用，设置 `forceEnable: true`。

## 📦 构建产物

构建后会在 `dist/` 目录生成：

- `index.js` - CommonJS 格式（Node.js）
- `index.esm.js` - ES Module 格式（现代构建工具）
- `index.umd.js` - UMD 格式（浏览器直接使用）
- `index.umd.min.js` - UMD 压缩版
- `index.d.ts` - TypeScript 类型声明
- `*.map` - Source map 文件

## 🔧 开发调试

```bash
# 克隆项目
git clone https://github.com/your-username/uniapp-error-monitor.git
cd uniapp-error-monitor

# 安装依赖
npm install

# 开发调试
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 构建
npm run build

# 发布
npm publish
```

## 📄 使用示例

完整的使用示例请参考 [USAGE_EXAMPLES.js](./USAGE_EXAMPLES.js) 文件。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件