/**
 * UniApp 错误监控和上报工具类型定义
 * @version 1.0.1
 * @author yuantao
 */

declare module 'uniapp-error-monitor' {
  /**
   * 错误类型枚举
   */
  export type ErrorType = 
    | 'global' 
    | 'promise' 
    | 'console' 
    | 'miniProgram' 
    | 'network' 
    | 'api' 
    | 'manual'

  /**
   * 错误统计信息接口
   */
  export interface ErrorStats {
    total: number
    global: number
    promise: number
    console: number
    miniProgram: number
    api: number
    network: number
    lastErrorTime: number | null
  }

  /**
   * 错误监控配置选项
   */
  export interface ErrorMonitorOptions {
    /** 是否启用全局错误捕获 */
    enableGlobalError?: boolean
    /** 是否启用Promise错误捕获 */
    enablePromiseError?: boolean
    /** 是否启用console.error捕获 */
    enableConsoleError?: boolean
    /** 自定义webhook地址，不传则使用环境变量 */
    webhookUrl?: string
    /** 发送失败时最大重试次数 */
    maxRetries?: number
    /** 重试延迟时间(毫秒) */
    retryDelay?: number
    /** 强制启用错误监控（忽略环境检查） */
    forceEnable?: boolean
    /** 自定义发送器 */
    sender?: (errorInfo: ErrorInfo) => Promise<void>
    /** 自定义格式化函数 */
    formatter?: (errorInfo: ErrorInfo) => string
  }

  /**
   * 错误信息接口
   */
  export interface ErrorInfo {
    type: ErrorType
    error: string | Error | object
    stack?: string | null
    context?: object
    timestamp: number
    url?: string
    method?: string
    userAgent?: string
    page?: string
    
    // API错误特有字段
    statusCode?: number
    statusText?: string
    responseTime?: number
    requestData?: any
    requestHeaders?: any
    requestId?: string
    environment?: string
    
    // 网络错误特有字段
    retryCount?: number
    networkType?: string
    isConnected?: boolean
    
    // Promise错误特有字段
    reason?: any
    promise?: any
    
    // 全局错误特有字段
    message?: string
    source?: string
    lineno?: number
    colno?: number
    
    // Console错误特有字段
    args?: any[]
    
    // 小程序错误特有字段
    path?: string
    query?: string
  }

  /**
   * 环境信息接口
   */
  export interface EnvironmentInfo {
    isProduction: boolean
    mode: string
    platform: string
    errorMonitorEnabled: boolean
    timestamp: number
  }

  /**
   * 错误监控类
   */
  export class ErrorMonitor {
    constructor(options?: ErrorMonitorOptions)

    /**
     * 初始化全局错误监控
     * @param options 配置选项
     */
    initErrorMonitor(options?: ErrorMonitorOptions): void

    /**
     * 手动上报错误
     * @param type 错误类型
     * @param error 错误对象或错误信息
     * @param context 错误上下文信息
     * @param forceSend 强制发送（忽略环境检查）
     */
    reportError(
      type?: ErrorType,
      error?: Error | string | object,
      context?: object,
      forceSend?: boolean
    ): void

    /**
     * 获取错误统计信息
     * @returns 错误统计信息
     */
    getErrorStats(): ErrorStats

    /**
     * 重置错误统计
     */
    resetErrorStats(): void

    /**
     * 获取当前环境信息
     * @returns 环境信息
     */
    getEnvironmentInfo(): EnvironmentInfo

    /**
     * 设置自定义发送器
     * @param sender 自定义发送器函数
     */
    setSender(sender: (errorInfo: ErrorInfo) => Promise<void>): void

    /**
     * 设置自定义格式化函数
     * @param formatter 自定义格式化函数
     */
    setFormatter(formatter: (errorInfo: ErrorInfo) => string): void

    /**
     * 包装Promise以自动捕获错误
     * @param promise 要包装的Promise
     * @returns 包装后的Promise
     */
    wrapPromise<T>(promise: Promise<T>): Promise<T>
  }

  /**
   * 便捷方法 - 初始化错误监控
   * @param options 配置选项
   */
  export function initErrorMonitor(options?: ErrorMonitorOptions): void

  /**
   * 便捷方法 - 手动上报错误
   * @param type 错误类型
   * @param error 错误对象或错误信息
   * @param context 错误上下文信息
   * @param forceSend 强制发送（忽略环境检查）
   */
  export function reportError(
    type?: ErrorType,
    error?: Error | string | object,
    context?: object,
    forceSend?: boolean
  ): void

  /**
   * 便捷方法 - 获取错误统计信息
   * @returns 错误统计信息
   */
  export function getErrorStats(): ErrorStats

  /**
   * 便捷方法 - 重置错误统计
   */
  export function resetErrorStats(): void

  /**
   * 便捷方法 - 获取当前环境信息
   * @returns 环境信息
   */
  export function getEnvironmentInfo(): EnvironmentInfo

  /**
   * 便捷方法 - 包装Promise以自动捕获错误
   * @param promise 要包装的Promise
   * @returns 包装后的Promise
   */
  export function wrapPromise<T>(promise: Promise<T>): Promise<T>

  /**
   * 默认实例 - 向后兼容
   */
  const errorMonitor: ErrorMonitor
  export default errorMonitor
}

// 全局类型声明（如果需要在全局使用）
declare global {
  interface Window {
    UniAppErrorMonitor: typeof import('uniapp-error-monitor').default
  }

  const uni: any
  const getCurrentPages: any
}