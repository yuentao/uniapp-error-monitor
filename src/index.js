/**
 * UniApp 错误监控上报插件 - 入口文件
 * 提供完整的 JavaScript 错误监控和上报解决方案
 */

import ErrorMonitor from './ErrorMonitor'
import { getCurrentPageName, getCurrentUrl, getUserAgent, serializeError } from './utils'

// 创建单例实例
const errorMonitorInstance = new ErrorMonitor()

/**
 * 初始化错误监控
 * @param {Object} options 配置选项
 * @returns {ErrorMonitor} 错误监控实例
 */
export function initErrorMonitor(options = {}) {
  return errorMonitorInstance.init(options)
}

/**
 * 手动上报错误
 * @param {string} type 错误类型
 * @param {Error|Object} error 错误对象或错误信息
 * @param {Object} context 错误上下文信息
 * @param {boolean} forceSend 强制发送（忽略环境检查）
 */
export function reportError(type = 'manual', error, context = {}, forceSend = false) {
  errorMonitorInstance.reportError(type, error, context, forceSend)
}

/**
 * Promise 包装工具
 * 自动捕获 Promise 错误
 * @param {Promise} promise 要包装的 Promise
 * @returns {Promise} 包装后的 Promise
 */
export function wrapPromise(promise) {
  return errorMonitorInstance.wrapPromise(promise)
}

/**
 * 获取错误统计信息
 * @returns {Object} 错误统计信息
 */
export function getErrorStats() {
  return errorMonitorInstance.getErrorStats()
}

/**
 * 重置错误统计
 */
export function resetErrorStats() {
  errorMonitorInstance.resetErrorStats()
}

/**
 * 获取环境信息
 * @returns {Object} 环境信息
 */
export function getEnvironmentInfo() {
  return errorMonitorInstance.getEnvironmentInfo()
}

/**
 * 检查是否为生产环境
 * @returns {boolean} 是否为生产环境
 */
export function isProduction() {
  return errorMonitorInstance.isProduction()
}

/**
 * 设置自定义发送器
 * @param {Function} sender 自定义发送函数
 */
export function setCustomSender(sender) {
  errorMonitorInstance.setSender(sender)
}

/**
 * 设置自定义格式化函数
 * @param {Function} formatter 自定义格式化函数
 */
export function setCustomFormatter(formatter) {
  errorMonitorInstance.setFormatter(formatter)
}

// 导出 ErrorMonitor 类本身
export { ErrorMonitor }

// 导出工具函数
export {
  getCurrentPageName,
  getCurrentUrl, 
  getUserAgent,
  serializeError
}

// 导出类型定义
export {
  ErrorMonitorOptions,
  ErrorType,
  ErrorStats,
  ErrorInfo
} from './types'

// 导出默认实例（方便直接使用）
export default errorMonitorInstance