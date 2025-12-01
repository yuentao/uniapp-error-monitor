/**
 * UniApp错误监控器
 * 专门为UniApp环境设计的错误监控和上报工具
 * 支持全局错误捕获、Promise错误捕获、网络错误捕获等
 */

class ErrorMonitor {
  constructor() {
    // 错误统计信息
    this.errorStats = {
      total: 0,
      global: 0,
      promise: 0,
      console: 0,
      miniProgram: 0,
      api: 0,
      network: 0,
      manual: 0,
      lastErrorTime: null,
    }

    // Promise包装工具
    this.wrapPromise = null

    // 项目信息
    this.projectInfo = {
      name: 'uniapp-error-monitor',
      version: '1.0.0',
    }

    // 配置对象
    this.config = null
  }

  /**
   * 初始化错误监控器
   * @param {Object} options 配置选项
   * @param {boolean} [options.enableGlobalError=true] 是否启用全局错误捕获
   * @param {boolean} [options.enablePromiseError=true] 是否启用Promise错误捕获
   * @param {boolean} [options.enableConsoleError=false] 是否启用console.error捕获
   * @param {string} [options.webhookUrl] 自定义webhook地址
   * @param {number} [options.maxRetries=3] 发送失败时最大重试次数
   * @param {number} [options.retryDelay=1000] 重试延迟时间(毫秒)
   * @param {boolean} [options.forceEnable=false] 强制启用错误监控（忽略环境检查）
   * @param {Function} [options.customFormatter] 自定义错误格式化函数
   * @param {Function} [options.customSender] 自定义发送函数
   */
  init(options = {}) {
    const config = {
      enableGlobalError: true,
      enablePromiseError: true,
      enableConsoleError: false,
      webhookUrl: '',
      maxRetries: 3,
      retryDelay: 1000,
      forceEnable: false,
      customFormatter: null,
      customSender: null,
      ...options,
    }

    // 环境检查：默认在生产环境下启用错误监控
    if (!config.forceEnable && !this._isProduction()) {
      console.info('[ErrorMonitor] 当前为非生产环境，错误监控已禁用')
      return
    }

    this.config = config

    // 全局错误捕获
    if (config.enableGlobalError) {
      this._setupGlobalErrorHandlers()
    }

    // Promise错误捕获
    if (config.enablePromiseError) {
      this._setupPromiseErrorHandlers()
    }

    // console错误捕获
    if (config.enableConsoleError) {
      this._setupConsoleErrorHandlers()
    }

    // 小程序特定错误捕获
    this._setupMiniProgramErrorHandlers()

    console.log('[ErrorMonitor] 错误监控已初始化')
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
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),

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

    this._updateErrorStats(type)
    this._sendError(errorInfo, forceSend)
  }

  /**
   * 包装Promise，自动捕获Promise错误
   * @param {Promise} promise 要包装的Promise
   * @returns {Promise} 包装后的Promise
   */
  wrapPromise(promise) {
    return promise.catch(error => {
      this.reportError('promise', error)
      throw error
    })
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
      manual: 0,
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
      mode: this._getMode(),
      platform: this._getUserAgent(),
      errorMonitorEnabled: !!this.config,
      timestamp: Date.now(),
    }
  }

  /**
   * 设置全局错误处理器
   * @private
   */
  _setupGlobalErrorHandlers() {
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
  }

  /**
   * 设置Promise错误处理器
   * @private
   */
  _setupPromiseErrorHandlers() {
    // 在UniApp环境中，wrapPromise方法会处理Promise错误
    this.wrapPromise = promise => {
      return promise.catch(error => {
        this._handlePromiseError({
          type: 'promise',
          reason: error,
          timestamp: Date.now(),
        })
        throw error
      })
    }
  }

  /**
   * 设置console错误处理器
   * @private
   */
  _setupConsoleErrorHandlers() {
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

  /**
   * 设置小程序错误处理器
   * @private
   */
  _setupMiniProgramErrorHandlers() {
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
  }

  /**
   * 处理全局错误
   * @private
   */
  _handleGlobalError(errorInfo) {
    this._updateErrorStats('global')
    this._sendError({
      ...errorInfo,
      message: errorInfo.message || 'Unknown global error',
      source: errorInfo.source || '',
      lineno: errorInfo.lineno || 0,
      colno: errorInfo.colno || 0,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),
    })
  }

  /**
   * 处理Promise错误
   * @private
   */
  _handlePromiseError(errorInfo) {
    this._updateErrorStats('promise')
    this._sendError({
      ...errorInfo,
      reason: this._serializeError(errorInfo.reason),
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),
    })
  }

  /**
   * 处理console错误
   * @private
   */
  _handleConsoleError(errorInfo) {
    this._updateErrorStats('console')
    this._sendError({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),
    })
  }

  /**
   * 处理小程序错误
   * @private
   */
  _handleMiniProgramError(errorInfo) {
    this._updateErrorStats('miniProgram')
    this._sendError({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),
    })
  }

  /**
   * 处理网络错误
   * @private
   */
  _handleNetworkError(errorInfo) {
    this._updateErrorStats('network')
    this._sendError({
      ...errorInfo,
      url: this._getCurrentUrl(),
      userAgent: this._getUserAgent(),
      page: this._getCurrentPageName(),
    })
  }

  /**
   * 更新错误统计
   * @private
   */
  _updateErrorStats(type) {
    this.errorStats.total++
    this.errorStats[type] = (this.errorStats[type] || 0) + 1
    this.errorStats.lastErrorTime = Date.now()
  }

  /**
   * 发送错误信息
   * @private
   */
  async _sendError(errorInfo, forceSend = false) {
    // 环境检查
    if (!forceSend && !this._isProduction() && !this.config?.forceEnable) {
      console.info('[ErrorMonitor] 非生产环境，错误信息不发送:', errorInfo.type)
      return
    }

    try {
      // 使用自定义发送器或默认发送器
      if (this.config?.customSender) {
        await this.config.customSender(errorInfo)
      } else {
        await this._sendToWebhook(errorInfo)
      }

      console.log('[ErrorMonitor] 错误信息已处理')
    } catch (error) {
      console.error('[ErrorMonitor] 发送错误信息失败:', error)
    }
  }

  /**
   * 发送到webhook
   * @private
   */
  async _sendToWebhook(errorInfo) {
    const webhookUrl = this.config?.webhookUrl
    if (!webhookUrl) {
      console.warn('[ErrorMonitor] 未配置webhook地址')
      return
    }

    // 格式化错误信息
    const message = this.config?.customFormatter ? this.config.customFormatter(errorInfo) : this._formatErrorMessage(errorInfo)

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
  }

  /**
   * 格式化错误消息
   * @private
   */
  _formatErrorMessage(errorInfo) {
    const timestamp = new Date(errorInfo.timestamp).toLocaleString('zh-CN')
    const systemInfo = uni.getSystemInfoSync?.()

    let message = `🚨 JavaScript错误报告\n`
    message += `📦 项目: ${systemInfo.appName || this.projectInfo.name}\n`
    message += `🏷️ 版本: ${systemInfo.appVersion || this.projectInfo.version}\n`
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

        if (errorInfo.error) {
          if (typeof errorInfo.error === 'object') {
            message += `🔢 错误代码: ${errorInfo.error.code || errorInfo.error.errCode || 'Unknown'}\n`
            message += `📝 错误信息: ${errorInfo.error.message || errorInfo.error.errMsg || this._serializeError(errorInfo.error)}\n`

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

        if (errorInfo.requestData) {
          message += `📋 请求参数: ${typeof errorInfo.requestData === 'object' ? JSON.stringify(errorInfo.requestData, null, 2) : errorInfo.requestData}\n`
        }

        if (errorInfo.statusCode) {
          message += `📊 状态码: ${errorInfo.statusCode}\n`
        }
        if (errorInfo.statusText) {
          message += `📝 状态文本: ${errorInfo.statusText}\n`
        }

        if (errorInfo.error) {
          if (typeof errorInfo.error === 'object') {
            if (errorInfo.error.code || errorInfo.error.status) {
              message += `🔢 错误代码: ${errorInfo.error.code || errorInfo.error.status}\n`
            }
            if (errorInfo.error.message || errorInfo.error.msg) {
              message += `📝 错误信息: ${errorInfo.error.message || errorInfo.error.msg}\n`
            }
            if (errorInfo.error.data) {
              message += `📄 响应数据: ${this._serializeError(errorInfo.error.data)}\n`
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
    message += `手动错误: ${this.errorStats.manual}\n`

    if (errorInfo.userAgent) {
      message += `\n📱 设备信息:\n${errorInfo.userAgent}\n`
    }

    return message
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
   * 获取当前页面名称
   * @private
   */
  _getCurrentPageName() {
    try {
      const pages = getCurrentPages()
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        return currentPage.route || currentPage.$page?.fullPath || '未知页面'
      }
    } catch (error) {
      // 忽略错误，返回默认值
    }

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

    try {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.pathname || '未知页面'
      }
    } catch (error) {
      return '未知页面'
    }

    return '未知页面'
  }

  /**
   * 获取运行模式
   * @private
   */
  _getMode() {
    try {
      if (import.meta?.env?.MODE) {
        return import.meta.env.MODE
      }
    } catch (error) {
      // 忽略访问错误
    }
    return 'unknown'
  }

  /**
   * 检测是否为生产环境
   * @private
   */
  _isProduction() {
    // 检查uniapp运行模式
    try {
      const systemInfo = uni?.getSystemInfoSync?.()
      if (systemInfo?.mode && systemInfo.mode !== 'default') {
        // 体验版、开发版、预览版
        return false
      }
    } catch (error) {
      // 忽略错误，继续检测
    }

    // 检查环境变量MODE
    const mode = this._getMode()
    if (mode === 'development' || mode === 'sandbox') {
      return false
    }

    // 默认：开发环境和体验版不启用，生产环境启用
    return true
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
}

// 导出单例
export default new ErrorMonitor()
