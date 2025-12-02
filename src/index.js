/**
 * 错误监控和上报类
 */
class ErrorMonitor {
  constructor(options = {}) {
    // 初始化错误统计
    this.errorStats = {
      total: 0,
      global: 0,
      promise: 0,
      console: 0,
      miniProgram: 0,
      api: 0,
      network: 0,
      lastErrorTime: null,
    }

    // Promise包装方法
    this.wrapPromise = null

    // 配置信息
    this.config = null

    // 项目信息
    this.projectInfo = {
      name: '未命名项目',
      version: '0.0.0',
    }

    // 尝试从 manifest.json 加载项目信息
    this._loadProjectInfo()

    // 应用初始配置
    if (Object.keys(options).length > 0) {
      this.initErrorMonitor(options)
    }
  }

  /**
   * 检测是否为生产环境
   * @private
   * @returns {boolean} 是否为生产环境
   */
  _isProduction() {
    // 检查uniapp运行模式
    try {
      const systemInfo = uni.getSystemInfoSync?.()
      if (systemInfo?.mode && systemInfo.mode !== 'default') {
        // 体验版、开发版、预览版
        return false
      }
    } catch (error) {
      // 忽略错误，继续检测
    }

    // 检查环境变量MODE
    if (import.meta.env.MODE === 'development') {
      return false
    }

    // 默认：开发环境和体验版不启用，生产环境启用
    return true
  }

  /**
   * 初始化全局错误监控
   * @param {Object} options 配置选项
   * @param {boolean} [options.enableGlobalError=true] 是否启用全局错误捕获
   * @param {boolean} [options.enablePromiseError=true] 是否启用Promise错误捕获
   * @param {boolean} [options.enableConsoleError=true] 是否启用console.error捕获
   * @param {string} [options.webhookUrl] 自定义webhook地址，不传则使用环境变量
   * @param {number} [options.maxRetries=3] 发送失败时最大重试次数
   * @param {number} [options.retryDelay=1000] 重试延迟时间(毫秒)
   * @param {boolean} [options.forceEnable=false] 强制启用错误监控（忽略环境检查）
   */
  initErrorMonitor(options = {}) {
    const config = {
      enableGlobalError: true,
      enablePromiseError: true,
      enableConsoleError: false,
      webhookUrl: import.meta.env.VITE_WEBHOOK,
      maxRetries: 3,
      retryDelay: 1000,
      forceEnable: false,
      ...options,
    }

    // 环境检查：只在生产环境下启用错误监控
    if (!config.forceEnable && !this._isProduction()) {
      console.info('当前为非生产环境，错误监控已禁用')
      return
    }

    // 检查webhook配置
    if (!config.webhookUrl) {
      console.warn('错误监控初始化失败：未配置webhook地址')
      return
    }

    this.config = config

    // 全局错误捕获（uniapp环境适配）
    if (config.enableGlobalError) {
      // Web环境
      if (typeof window !== 'undefined') {
        window.onerror = (message, source, lineno, colno, error) => {
          this._handleGlobalError({
            type: 'global',
            message,
            source,
            lineno,
            colno,
            error,
            timestamp: Date.now(),
          })
        }

        // 处理未捕获的Promise错误
        window.addEventListener('unhandledrejection', event => {
          this._handlePromiseError({
            type: 'promise',
            reason: event.reason,
            promise: event.promise,
            timestamp: Date.now(),
          })
        })
      }

      // uniapp环境 - 提供Promise包装工具
      if (typeof uni !== 'undefined' && config.enablePromiseError) {
        // 提供一个包装Promise的方法，让开发者可以手动包装重要的Promise
        this.wrapPromise = promise => {
          const self = this
          return promise.catch(error => {
            self._handlePromiseError({
              type: 'promise',
              reason: error,
              timestamp: Date.now(),
            })
            throw error
          })
        }
      }
    }

    // console.error捕获（可选）
    if (config.enableConsoleError) {
      const originalError = console.error
      console.error = (...args) => {
        originalError.apply(console, args)
        this._handleConsoleError({
          type: 'console',
          args: args.map(arg => this._serializeError(arg)),
          timestamp: Date.now(),
        })
      }
    }

    // 微信小程序错误捕获
    if (typeof uni !== 'undefined') {
      // 监听小程序错误事件
      uni.onError &&
        uni.onError(error => {
          this._handleMiniProgramError({
            type: 'miniProgram',
            error,
            timestamp: Date.now(),
          })
        })

      // 监听小程序页面错误
      uni.onPageNotFound &&
        uni.onPageNotFound(result => {
          this._handleMiniProgramError({
            type: 'pageNotFound',
            path: result.path,
            query: result.query,
            timestamp: Date.now(),
          })
        })

      // 监听小程序网络请求错误
      const originalRequest = uni.request
      uni.request = options => {
        return originalRequest({
          ...options,
          fail: err => {
            options.fail && options.fail(err)
            this._handleNetworkError({
              type: 'network',
              url: options.url,
              method: options.method,
              error: err,
              timestamp: Date.now(),
            })
          },
        })
      }
    }

    console.log('错误监控已初始化')
  }

  /**
   * 手动上报错误
   * @param {string} type 错误类型 ('manual', 'api', 'network', 'global', 'promise', 'console', 'miniProgram')
   * @param {Error|Object} error 错误对象或错误信息
   * @param {Object} [context] 错误上下文信息
   * @param {boolean} [forceSend=false] 强制发送（忽略环境检查）
   */
  reportError(type = 'manual', error, context = {}, forceSend = false) {
    const errorInfo = {
      type,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : null,
      context,
      timestamp: Date.now(),
      url: error.url || this._getCurrentUrl(),
      method: error.method || '',
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),

      // API错误特有字段
      statusCode: error.statusCode,
      statusText: error.statusText,
      responseTime: error.responseTime,
      requestData: error.requestData,
      requestHeaders: error.requestHeaders,
      requestId: error.requestId,
      environment: error.environment,

      // 网络错误特有字段
      retryCount: error.retryCount,
      networkType: error.networkType,
      isConnected: error.isConnected,
    }

    this.errorStats.total++
    this.errorStats[type] = (this.errorStats[type] || 0) + 1
    this.errorStats.lastErrorTime = errorInfo.timestamp

    if (forceSend) {
      // 强制发送
      this._sendErrorToWebhook(errorInfo, 0, true)
    } else {
      this._sendErrorToWebhook(errorInfo)
    }
  }

  /**
   * 获取错误统计信息
   * @returns {Object} 错误统计信息
   */
  getErrorStats() {
    return { ...this.errorStats }
  }

  /**
   * 重置错误统计
   */
  resetErrorStats() {
    this.errorStats = {
      total: 0,
      global: 0,
      promise: 0,
      console: 0,
      miniProgram: 0,
      api: 0,
      network: 0,
      lastErrorTime: null,
    }
  }

  /**
   * 获取当前环境信息
   * @returns {Object} 环境信息
   */
  getEnvironmentInfo() {
    return {
      isProduction: this._isProduction(),
      mode: import.meta.env.MODE,
      platform: this._getUserAgent(),
      errorMonitorEnabled: !!this.config,
      timestamp: Date.now(),
    }
  }

  /**
   * 处理全局错误
   * @private
   */
  _handleGlobalError(errorInfo) {
    this.errorStats.total++
    this.errorStats.global++
    this.errorStats.lastErrorTime = errorInfo.timestamp

    this._sendErrorToWebhook({
      ...errorInfo,
      message: errorInfo.message || 'Unknown global error',
      source: errorInfo.source || '',
      lineno: errorInfo.lineno || 0,
      colno: errorInfo.colno || 0,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
    })
  }

  /**
   * 处理Promise错误
   * @private
   */
  _handlePromiseError(errorInfo) {
    this.errorStats.total++
    this.errorStats.promise++
    this.errorStats.lastErrorTime = errorInfo.timestamp

    this._sendErrorToWebhook({
      ...errorInfo,
      reason: this._serializeError(errorInfo.reason),
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
    })
  }

  /**
   * 处理console错误
   * @private
   */
  _handleConsoleError(errorInfo) {
    this.errorStats.total++
    this.errorStats.console++
    this.errorStats.lastErrorTime = errorInfo.timestamp

    this._sendErrorToWebhook({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
    })
  }

  /**
   * 处理小程序错误
   * @private
   */
  _handleMiniProgramError(errorInfo) {
    this.errorStats.total++
    this.errorStats.miniProgram++
    this.errorStats.lastErrorTime = errorInfo.timestamp

    this._sendErrorToWebhook({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
    })
  }

  /**
   * 处理网络错误
   * @private
   */
  _handleNetworkError(errorInfo) {
    this.errorStats.total++
    this.errorStats.network++
    this.errorStats.lastErrorTime = errorInfo.timestamp

    this._sendErrorToWebhook({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
    })
  }

  /**
   * 获取当前URL
   * @private
   */
  _getCurrentUrl() {
    if (typeof window !== 'undefined') {
      return window.location?.href || ''
    }

    if (typeof uni !== 'undefined') {
      try {
        const pages = getCurrentPages()
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          return currentPage.route || ''
        }
      } catch (error) {
        // 忽略错误
      }
    }

    return ''
  }

  /**
   * 获取用户代理信息
   * @private
   */
  _getUserAgent() {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent || ''
    }

    if (typeof uni !== 'undefined') {
      try {
        const systemInfo = uni.getSystemInfoSync()
        return `${systemInfo.platform} ${systemInfo.system} ${systemInfo.model}`
      } catch (error) {
        return 'Unknown Device'
      }
    }

    return 'Unknown Device'
  }

  /**
   * 序列化错误对象
   * @private
   */
  _serializeError(error) {
    if (error instanceof Error) {
      return {
        name: error.name || error.code,
        message: error.message,
        stack: error.stack,
      }
    }

    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.stringify(error, null, 2)
      } catch (e) {
        return String(error)
      }
    }

    return String(error)
  }

  /**
   * 发送错误到webhook
   * @private
   */
  async _sendErrorToWebhook(errorInfo, retryCount = 0, forceSend = false) {
    // 环境检查：只在生产环境下发送错误信息
    if (!forceSend && !this._isProduction() && !this.config?.forceEnable) {
      console.info('非生产环境，错误信息不上报到webhook:', errorInfo.type)
      return
    }

    const webhookUrl = import.meta.env.VITE_WEBHOOK
    if (!webhookUrl) {
      console.error('未配置webhook地址，无法发送错误信息')
      return
    }

    try {
      // 格式化错误信息
      const message = this._formatErrorMessage(errorInfo)
      // 使用uni.request发送POST请求（适配uniapp环境）
      await new Promise((resolve, reject) => {
        uni.request({
          url: webhookUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
          },
          data: {
            msgtype: 'text',
            text: {
              content: message,
              mentioned_list: [],
            },
          },
          success: resolve,
          fail: reject,
        })
      })

      console.log('错误信息已发送到webhook')
    } catch (error) {
      console.error('发送错误到webhook失败:', error)

      // 重试机制
      if (retryCount < (this.config?.maxRetries || 3)) {
        setTimeout(() => {
          this._sendErrorToWebhook(errorInfo, retryCount + 1)
        }, (this.config?.retryDelay || 1000) * (retryCount + 1))
      }
    }
  }

  /**
   * 加载项目信息
   * @private
   */
  _loadProjectInfo() {
    try {
      if (uni.getSystemInfoSync()) {
        const AppInfo = uni.getSystemInfoSync()
        this.projectInfo.name = AppInfo.appName
        this.projectInfo.version = AppInfo.appVersion
      }
    } catch (error) {
      // 如果加载失败，使用默认信息
      console.warn('无法加载项目信息，使用默认值')
    }
  }

  /**
   * 格式化错误消息
   * @private
   */
  _formatErrorMessage(errorInfo) {
    const timestamp = new Date(errorInfo.timestamp).toLocaleString('zh-CN')

    let message = `🚨 JavaScript错误报告\n`
    message += `📦 项目: ${this.projectInfo.name}\n`
    message += `🏷️ 版本: ${this.projectInfo.version}\n`
    message += `⏰ 时间: ${timestamp}\n`
    message += `📱 页面: ${errorInfo.page || '未知页面'}\n`
    message += `🌐 链接: ${errorInfo.url || '未知链接'}\n\n`

    switch (errorInfo.type) {
      case 'global':
        message += `🔍 错误类型: 全局错误\n`
        message += `📝 错误信息: ${errorInfo.message}\n`
        if (errorInfo.source) {
          message += `📂 文件: ${errorInfo.source}\n`
        }
        if (errorInfo.lineno) {
          message += `📍 行号: ${errorInfo.lineno}:${errorInfo.colno}\n`
        }
        break

      case 'promise':
        message += `🔍 错误类型: Promise错误\n`
        message += `📝 错误信息: ${this._serializeError(errorInfo.reason)}\n`
        break

      case 'console':
        message += `🔍 错误类型: Console错误\n`
        message += `📝 错误信息: ${errorInfo.args.join(' ')}\n`
        break

      case 'miniProgram':
        message += `🔍 错误类型: 小程序错误\n`
        message += `📝 错误信息: ${errorInfo.error || 'Unknown'}\n`
        if (errorInfo.path) {
          message += `📱 页面路径: ${errorInfo.path}\n`
        }
        if (errorInfo.query) {
          message += `🔗 查询参数: ${errorInfo.query}\n`
        }
        break

      case 'network':
        message += `🔍 错误类型: 网络错误\n`
        message += `📝 请求地址: ${errorInfo.url || 'Unknown'}\n`
        message += `📝 请求方法: ${errorInfo.method || 'Unknown'}\n`

        // 网络错误详细信息
        if (errorInfo.error) {
          if (typeof errorInfo.error === 'object') {
            // 处理网络错误对象
            message += `🔢 错误代码: ${errorInfo.error.code || errorInfo.error.errCode || 'Unknown'}\n`
            message += `📝 错误信息: ${errorInfo.error.message || errorInfo.error.errMsg || this._serializeError(errorInfo.error)}\n`

            // 网络错误特定信息
            if (errorInfo.error.errCode) {
              message += `🆔 微信错误码: ${errorInfo.error.errCode}\n`
            }
            if (errorInfo.error.errMsg) {
              message += `💬 微信错误信息: ${errorInfo.error.errMsg}\n`
            }
          } else {
            message += `📝 错误信息: ${errorInfo.error}\n`
          }
        }
        break

      case 'api':
        message += `🔍 错误类型: 接口错误\n`
        message += `📝 请求地址: ${errorInfo.url || 'Unknown'}\n`
        message += `📝 请求方法: ${errorInfo.method || 'Unknown'}\n`

        // 请求信息
        if (errorInfo.requestData) {
          message += `📋 请求参数: ${typeof errorInfo.requestData === 'object' ? JSON.stringify(errorInfo.requestData, null, 2) : errorInfo.requestData}\n`
        }
        if (errorInfo.requestHeaders) {
          message += `🔑 请求头: ${this._serializeError(errorInfo.requestHeaders)}\n`
        }

        // 响应信息
        if (errorInfo.statusCode) {
          message += `📊 状态码: ${errorInfo.statusCode}\n`
        }
        if (errorInfo.statusText) {
          message += `📝 状态文本: ${errorInfo.statusText}\n`
        }

        // 错误详情
        if (errorInfo.error) {
          if (typeof errorInfo.error === 'object') {
            // 处理标准的错误响应格式
            if (errorInfo.error.code || errorInfo.error.status) {
              message += `🔢 错误代码: ${errorInfo.error.code || errorInfo.error.status}\n`
            }
            if (errorInfo.error.message || errorInfo.error.msg) {
              message += `📝 错误信息: ${errorInfo.error.message || errorInfo.error.msg}\n`
            }
            if (errorInfo.error.data) {
              message += `📄 响应数据: ${this._serializeError(errorInfo.error.data)}\n`
            }

            // 如果是标准错误对象格式
            if (errorInfo.error.name || errorInfo.error.code) {
              message += `🏷️ 错误名称: ${errorInfo.error.name || errorInfo.error.code}\n`
            }
            if (errorInfo.error.stack) {
              message += `📜 错误堆栈: ${errorInfo.error.stack}\n`
            }
          } else {
            message += `📝 错误信息: ${errorInfo.error}\n`
          }
        }
        break

      default:
        message += `🔍 错误类型: ${errorInfo.type}\n`
        message += `📝 错误信息: ${this._serializeError(errorInfo.error)}\n`
    }

    message += `\n📊 统计信息:\n`
    message += `总计错误: ${this.errorStats.total}\n`
    message += `全局错误: ${this.errorStats.global}\n`
    message += `Promise错误: ${this.errorStats.promise}\n`
    message += `Console错误: ${this.errorStats.console}\n`
    message += `小程序错误: ${this.errorStats.miniProgram}\n`
    message += `接口错误: ${this.errorStats.api}\n`
    message += `网络错误: ${this.errorStats.network}\n`

    // 添加设备信息
    if (errorInfo.userAgent) {
      message += `\n📱 设备信息:\n${errorInfo.userAgent}\n`
    }

    return message
  }
}

/**
 * 获取当前页面名称
 * @returns {string} 页面名称
 */
function getCurrentPageName() {
  try {
    // 尝试从getCurrentPages获取
    const pages = getCurrentPages()
    if (pages && pages.length > 0) {
      const currentPage = pages[pages.length - 1]
      return currentPage.route || currentPage.$page?.fullPath || '未知页面'
    }
  } catch (error) {
    // 忽略错误，返回默认值
  }

  // 微信小程序环境
  if (typeof uni !== 'undefined') {
    try {
      const currentPages = getCurrentPages?.()
      if (currentPages && currentPages.length > 0) {
        return currentPages[currentPages.length - 1]?.route || '未知页面'
      }
    } catch (error) {
      return '未知页面'
    }
  }

  // Web环境
  try {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.pathname || '未知页面'
    }
  } catch (error) {
    return '未知页面'
  }

  return '未知页面'
}

// 创建默认实例
const errorMonitorInstance = new ErrorMonitor()

// 命名导出 - 便捷方法
export const initErrorMonitor = (options) => {
  return errorMonitorInstance.initErrorMonitor(options)
}

export const reportError = (type, error, context, forceSend) => {
  return errorMonitorInstance.reportError(type, error, context, forceSend)
}

export const getErrorStats = () => {
  return errorMonitorInstance.getErrorStats()
}

export const resetErrorStats = () => {
  return errorMonitorInstance.resetErrorStats()
}

export const getEnvironmentInfo = () => {
  return errorMonitorInstance.getEnvironmentInfo()
}

export const wrapPromise = (promise) => {
  return errorMonitorInstance.wrapPromise ? errorMonitorInstance.wrapPromise(promise) : promise
}

// 默认导出 - 向后兼容
export default errorMonitorInstance
