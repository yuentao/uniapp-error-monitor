/**
 * UniApp Error Monitor 使用示例
 * 展示如何在不同场景下使用错误监控工具
 */

// ============================================================================
// 1. 基础使用 - 命名导出方式（推荐）
// ============================================================================

// 方式一：导入所有命名导出
import { 
  initErrorMonitor, 
  reportError, 
  getErrorStats, 
  wrapPromise 
} from 'uniapp-error-monitor'

// 初始化错误监控
initErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com', // 必填
  enableGlobalError: true,       // 启用全局错误捕获
  enablePromiseError: true,      // 启用 Promise 错误捕获
  enableConsoleError: false,     // 禁用 console.error 捕获
  maxRetries: 3,                 // 最大重试次数
  retryDelay: 1000,              // 重试延迟时间(ms)
})

// 手动上报错误
reportError('manual', new Error('自定义错误'), {
  page: 'index',
  action: '用户操作失败'
})

// 获取错误统计
const stats = getErrorStats()
console.log('错误统计:', stats)

// Promise 包装示例
const fetchData = async () => {
  try {
    const response = await wrapPromise(
      fetch('https://api.example.com/data')
    )
    return response.json()
  } catch (error) {
    // 错误已经被自动捕获和上报
    console.error('获取数据失败:', error)
  }
}

// ============================================================================
// 2. 高级使用 - 类实例方式
// ============================================================================

import { ErrorMonitor } from 'uniapp-error-monitor'

// 创建自定义实例
const errorMonitor = new ErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com',
  enableGlobalError: true,
  enablePromiseError: true,
  forceEnable: true // 强制启用（忽略环境检查）
})

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
errorMonitor.initErrorMonitor()

// 使用实例方法
errorMonitor.reportError('api', new Error('接口调用失败'), {
  api: '/user/profile',
  method: 'GET'
})

// ============================================================================
// 3. 向后兼容 - 默认实例
// ============================================================================

import ErrorMonitorDefault from 'uniapp-error-monitor'

// 使用默认实例（向后兼容）
ErrorMonitorDefault.initErrorMonitor({
  webhookUrl: 'https://your-webhook-url.com'
})

ErrorMonitorDefault.reportError('manual', new Error('测试错误'))

// ============================================================================
// 4. TypeScript 类型安全使用
// ============================================================================

import type { 
  ErrorMonitorOptions, 
  ErrorType, 
  ErrorStats,
  EnvironmentInfo 
} from 'uniapp-error-monitor'

// 类型安全的配置
const options: ErrorMonitorOptions = {
  webhookUrl: 'https://example.com/webhook',
  enableGlobalError: true,
  enablePromiseError: true,
  maxRetries: 5,
  retryDelay: 2000,
  forceEnable: false
}

// 类型安全的错误上报
const reportTypeSafeError = (type: ErrorType, message: string) => {
  reportError(type, new Error(message), {
    timestamp: Date.now(),
    userId: '12345'
  })
}

// 类型安全的统计获取
const getSafeStats = (): ErrorStats => {
  return getErrorStats()
}

// ============================================================================
// 5. 环境检测和使用
// ============================================================================

import { getEnvironmentInfo } from 'uniapp-error-monitor'

// 获取环境信息
const envInfo: EnvironmentInfo = getEnvironmentInfo()

if (envInfo.isProduction) {
  // 生产环境逻辑
  console.log('生产环境，错误监控已启用')
} else {
  // 开发环境逻辑
  console.log('开发环境，错误监控已禁用')
}

// ============================================================================
// 6. 错误类型示例
// ============================================================================

// 全局错误 - 自动捕获，无需手动上报
// window.onerror 触发

// Promise 错误 - 通过 wrapPromise 包装或自动捕获
wrapPromise(someAsyncFunction())

// Console 错误 - 需要 enableConsoleError: true
console.error('这条错误会被捕获')

// 小程序错误 - 自动捕获
// uni.onError, uni.onPageNotFound 触发

// 网络错误 - 自动捕获
// 拦截的 uni.request 失败

// API 错误 - 手动上报
reportError('api', new Error('接口调用失败'), {
  url: '/api/users',
  method: 'GET',
  statusCode: 500
})

// 手动错误 - 手动上报
reportError('manual', new Error('用户操作失败'), {
  action: 'submitForm',
  formData: { name: 'John' }
})

// ============================================================================
// 7. 错误上下文信息
// ============================================================================

// 添加丰富的错误上下文
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

// ============================================================================
// 8. 批量错误处理
// ============================================================================

// 重置错误统计（在页面刷新或特定事件后）
const resetStats = () => {
  import { resetErrorStats } from 'uniapp-error-monitor'
  resetErrorStats()
  console.log('错误统计已重置')
}

// 定时检查错误状态
setInterval(() => {
  const stats = getErrorStats()
  if (stats.total > 10) {
    console.warn('检测到大量错误:', stats)
    // 可以发送告警或执行其他处理逻辑
  }
}, 60000) // 每分钟检查一次