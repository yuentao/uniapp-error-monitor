/**
 * UniApp错误监控器类型定义
 * 专门为UniApp环境设计的错误监控和上报工具
 */

declare class ErrorMonitor {
  /**
   * 初始化错误监控器
   * @param options 配置选项
   */
  init(options?: ErrorMonitorOptions): void;

  /**
   * 手动上报错误
   * @param type 错误类型
   * @param error 错误对象或错误信息
   * @param context 错误上下文信息
   * @param forceSend 强制发送（忽略环境检查）
   */
  reportError(
    type?: ErrorType,
    error?: Error | object | string,
    context?: object,
    forceSend?: boolean
  ): void;

  /**
   * 包装Promise，自动捕获Promise错误
   * @param promise 要包装的Promise
   * @returns 包装后的Promise
   */
  wrapPromise<T>(promise: Promise<T>): Promise<T>;

  /**
   * 获取错误统计信息
   * @returns 错误统计信息
   */
  getErrorStats(): ErrorStats;

  /**
   * 重置错误统计
   */
  resetErrorStats(): void;

  /**
   * 获取当前环境信息
   * @returns 环境信息
   */
  getEnvironmentInfo(): EnvironmentInfo;
}

declare interface ErrorMonitorOptions {
  /**
   * 是否启用全局错误捕获
   * @default true
   */
  enableGlobalError?: boolean;

  /**
   * 是否启用Promise错误捕获
   * @default true
   */
  enablePromiseError?: boolean;

  /**
   * 是否启用console.error捕获
   * @default false
   */
  enableConsoleError?: boolean;

  /**
   * 自定义webhook地址
   */
  webhookUrl?: string;

  /**
   * 发送失败时最大重试次数
   * @default 3
   */
  maxRetries?: number;

  /**
   * 重试延迟时间(毫秒)
   * @default 1000
   */
  retryDelay?: number;

  /**
   * 强制启用错误监控（忽略环境检查）
   * @default false
   */
  forceEnable?: boolean;

  /**
   * 自定义错误格式化函数
   */
  customFormatter?: (errorInfo: ErrorInfo) => string;

  /**
   * 自定义发送函数
   */
  customSender?: (errorInfo: ErrorInfo) => Promise<void>;
}

declare type ErrorType = 
  | 'manual' 
  | 'api' 
  | 'network' 
  | 'global' 
  | 'promise' 
  | 'console' 
  | 'miniProgram';

declare interface ErrorStats {
  total: number;
  global: number;
  promise: number;
  console: number;
  miniProgram: number;
  api: number;
  network: number;
  manual: number;
  lastErrorTime: number | null;
}

declare interface EnvironmentInfo {
  isProduction: boolean;
  mode: string;
  platform: string;
  errorMonitorEnabled: boolean;
  timestamp: number;
}

declare interface ErrorInfo {
  type: ErrorType;
  error: string | object;
  stack?: string | null;
  context?: object;
  timestamp: number;
  url: string;
  userAgent: string;
  page: string;

  // API错误特有字段
  statusCode?: number;
  statusText?: string;
  responseTime?: number;
  requestData?: object;
  requestHeaders?: object;
  requestId?: string;
  environment?: string;

  // 网络错误特有字段
  retryCount?: number;
  networkType?: string;
  isConnected?: boolean;

  // 全局错误特有字段
  message?: string;
  source?: string;
  lineno?: number;
  colno?: number;

  // Promise错误特有字段
  reason?: string | object;

  // Console错误特有字段
  args?: string[];

  // 小程序错误特有字段
  path?: string;
  query?: string;
}

// 导出默认实例
declare const ErrorMonitorInstance: ErrorMonitor;
export default ErrorMonitorInstance;

// 导出类型
export {
  ErrorMonitor,
  ErrorMonitorOptions,
  ErrorType,
  ErrorStats,
  EnvironmentInfo,
  ErrorInfo,
};