/**
 * TypeScript 类型定义
 * 为插件提供完整的类型安全保障
 */

/**
 * 错误监控配置选项
 */
export interface ErrorMonitorOptions {
  /** Webhook 地址（必填） */
  webhookUrl: string
  /** 是否启用全局错误捕获（默认：true） */
  enableGlobalError?: boolean
  /** 是否启用 Promise 错误捕获（默认：true） */
  enablePromiseError?: boolean
  /** 是否启用 console.error 捕获（默认：false） */
  enableConsoleError?: boolean
  /** 最大重试次数（默认：3） */
  maxRetries?: number
  /** 重试延迟时间（毫秒）（默认：1000） */
  retryDelay?: number
  /** 强制启用错误监控（忽略环境检查）（默认：false） */
  forceEnable?: boolean
  /** 自定义格式化函数 */
  formatter?: (error: ErrorInfo) => string
  /** 自定义发送器 */
  sender?: (payload: ErrorInfo) => Promise<void>
}

/**
 * 错误类型枚举
 */
export type ErrorType = 
  | 'global'        // 全局 JavaScript 错误
  | 'promise'       // Promise 错误
  | 'console'       // console.error
  | 'miniProgram'   // 小程序特定错误
  | 'network'       // 网络请求错误
  | 'api'          // API 接口错误
  | 'manual'       // 手动上报错误

/**
 * 错误统计信息
 */
export interface ErrorStats {
  /** 总错误数 */
  total: number
  /** 全局错误数 */
  global: number
  /** Promise 错误数 */
  promise: number
  /** Console 错误数 */
  console: number
  /** 小程序错误数 */
  miniProgram: number
  /** API 错误数 */
  api: number
  /** 网络错误数 */
  network: number
  /** 最后错误时间 */
  lastErrorTime: number | null
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  /** 错误类型 */
  type: ErrorType
  /** 错误消息 */
  error: string
  /** 错误堆栈 */
  stack: string | null
  /** 错误上下文 */
  context: Record<string, any>
  /** 错误时间戳 */
  timestamp: number
  /** 错误发生的 URL */
  url: string
  /** HTTP 方法（API 错误时） */
  method?: string
  /** 用户代理 */
  userAgent: string
  /** 页面名称 */
  page: string
  
  // 全局错误特有字段
  /** 错误源文件 */
  source?: string
  /** 行号 */
  lineno?: number
  /** 列号 */
  colno?: number
  
  // Promise 错误特有字段
  /** Promise 拒绝原因 */
  reason?: any
  /** Promise 对象 */
  promise?: any
  
  // Console 错误特有字段
  /** Console 参数 */
  args?: any[]
  
  // 小程序错误特有字段
  /** 错误对象 */
  error?: any
  /** 页面路径（pageNotFound 时） */
  path?: string
  /** 查询参数（pageNotFound 时） */
  query?: string
  
  // 网络错误特有字段
  /** 网络错误对象 */
  networkError?: any
  /** 网络类型 */
  networkType?: string
  /** 连接状态 */
  isConnected?: boolean
  
  // API 错误特有字段
  /** HTTP 状态码 */
  statusCode?: number
  /** HTTP 状态文本 */
  statusText?: string
  /** 响应时间（毫秒） */
  responseTime?: number
  /** 请求数据 */
  requestData?: any
  /** 请求头 */
  requestHeaders?: Record<string, string>
  /** 请求 ID */
  requestId?: string
  /** 环境信息 */
  environment?: string
  /** 重试次数 */
  retryCount?: number
}

/**
 * 环境信息接口
 */
export interface EnvironmentInfo {
  /** 是否为生产环境 */
  isProduction: boolean
  /** 运行环境模式 */
  mode: string
  /** 平台信息 */
  platform: string
  /** 错误监控是否启用 */
  errorMonitorEnabled: boolean
  /** 时间戳 */
  timestamp: number
}

/**
 * 格式化函数类型
 */
export type FormatterFunction = (error: ErrorInfo) => string

/**
 * 发送器函数类型
 */
export type SenderFunction = (payload: ErrorInfo) => Promise<void>

/**
 * 工具函数接口
 */
export interface Utils {
  /** 获取当前页面名称 */
  getCurrentPageName: () => string
  /** 获取当前 URL */
  getCurrentUrl: () => string
  /** 获取用户代理 */
  getUserAgent: () => string
  /** 序列化错误对象 */
  serializeError: (error: any) => any
}

/**
 * 构造函数选项（用于类实例化）
 */
export interface ConstructorOptions extends ErrorMonitorOptions {
  /** 配置选项 */
  config?: Partial<ErrorMonitorOptions>
}

/**
 * Webhook 消息格式
 */
export interface WebhookMessage {
  msgtype: 'text'
  text: {
    content: string
    mentioned_list?: string[]
  }
}

/**
 * UniApp 环境信息
 */
export interface UniAppSystemInfo {
  /** 应用名称 */
  appName?: string
  /** 应用版本 */
  appVersion?: string
  /** 平台信息 */
  platform?: string
  /** 系统信息 */
  system?: string
  /** 设备型号 */
  model?: string
  /** 小程序模式 */
  mode?: string
}