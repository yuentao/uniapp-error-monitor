/**
 * 错误级别常量
 * @constant {Object}
 * @property {string} STRICT - 严格模式：监控所有错误
 * @property {string} STANDARD - 标准模式：监控基本错误（全局错误、Promise错误、小程序错误、网络错误）
 * @property {string} SILENT - 静默模式：仅监控严重错误（全局错误、小程序错误）
 */
export const ERROR_LEVEL = {
  STRICT: 'strict', // 所有错误监控
  STANDARD: 'standard', // 基本错误监控
  SILENT: 'silent', // 仅监控严重的错误
}
/**
 * 错误类型严重程度映射
 * @private
 */
const ERROR_SEVERITY = {
  global: 'critical', // 全局错误 - 严重
  miniProgram: 'critical', // 小程序错误 - 严重
  promise: 'normal', // Promise错误 - 普通
  network: 'normal', // 网络错误 - 普通
  api: 'normal', // API错误 - 普通
  console: 'minor', // Console错误 - 轻微
  manual: 'normal', // 手动上报 - 普通
  pageNotFound: 'critical', // 页面未找到 - 严重
}
/**
 * 默认错误去重间隔时间（毫秒）
 * @constant {number}
 */
const DEFAULT_DEDUP_INTERVAL = 60 * 1000 // 1分钟

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
		// 错误去重缓存：存储最近上报的错误签名和时间戳
		this._errorCache = new Map()
		// 尝试从 manifest.json 加载项目信息
		this._loadProjectInfo()
		// 应用初始配置
		if (Object.keys(options).length > 0) {
			this.initErrorMonitor(options)
		}
	}  /**
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
  	 * @param {string} [options.errorLevel='standard'] 错误级别：strict(所有错误)、standard(基本错误)、silent(仅严重错误)
  	 * @param {number} [options.dedupInterval=60000] 相同错误去重间隔时间(毫秒)，默认1分钟
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
  			errorLevel: ERROR_LEVEL.SILENT, // 默认静默模式
  			dedupInterval: DEFAULT_DEDUP_INTERVAL, // 默认1分钟去重间隔
  			...options,
  		}    // 环境检查：只在生产环境下启用错误监控
    if (!config.forceEnable && !this._isProduction()) {
      console.info('当前为非生产环境，错误监控已禁用')
      return
    }
    // 检查webhook配置
    if (!config.webhookUrl) {
      console.warn('错误监控初始化失败：未配置webhook地址')
      return
    }
    // 验证错误级别
    const validLevels = [ERROR_LEVEL.STRICT, ERROR_LEVEL.STANDARD, ERROR_LEVEL.SILENT]
    if (!validLevels.includes(config.errorLevel)) {
      console.warn(`无效的错误级别 "${config.errorLevel}"，使用默认值 "standard"`)
      config.errorLevel = ERROR_LEVEL.SILENT
    }
    this.config = config
    // 输出错误级别信息
    const levelDescriptions = {
      [ERROR_LEVEL.STRICT]: '严格模式 - 监控所有错误',
      [ERROR_LEVEL.STANDARD]: '标准模式 - 监控基本错误',
      [ERROR_LEVEL.SILENT]: '静默模式 - 仅监控严重错误',
    }
    console.log(`错误监控级别: ${levelDescriptions[config.errorLevel]}`)
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
   * @param {boolean} [forceSend=false] 强制发送（忽略环境检查和错误级别过滤）
   */
  reportError(type = 'manual', error, context = {}, forceSend = false) {
  		// 错误级别过滤（forceSend 时跳过）
  		if (!forceSend && !this._shouldReportError(type)) {
  			console.info(`错误级别过滤：跳过上报 ${type} 类型错误`)
  			return
  		}
  
  		// 生成错误签名用于去重
  		const errorSignature = this._generateErrorSignature(type, error, context)
  		
  		// 错误去重检查（forceSend 时跳过）
  		if (!forceSend && this._isDuplicateError(errorSignature)) {
  			console.info(`错误去重：跳过重复错误 ${errorSignature}`)
  			return
  		}
  
  		// 自动提取API错误相关信息
  		let extractedError = error
    let extractedContext = context
    if (type === 'api' && typeof error === 'object' && error.config) {
      // 当type为'api'且error对象包含config属性时，自动提取API相关信息
      const response = error
      extractedContext = {
        url: response.config?.url,
        method: response.config?.method,
        statusCode: response.data?.code || response.statusCode,
        statusText: response.data?.msg || response.data?.message || '未知错误',
        responseTime: Date.now() - (response.config?.startTime || Date.now()),
        requestData: response.config?.data,
        requestHeaders: response.config?.header,
        environment: import.meta.env.MODE,
        // 保留原有的error信息
        ...context,
      }
      extractedError = response.data?.msg || response.data?.message || response.message || error
    }
    const errorInfo = {
      type,
      error: extractedError instanceof Error ? extractedError.message : extractedError,
      stack: extractedError instanceof Error ? extractedError.stack : null,
      context: extractedContext,
      timestamp: Date.now(),
      url: extractedContext.url || this._getCurrentUrl(),
      method: extractedContext.method || '',
      userAgent: this._getUserAgent(),
      page: getCurrentPageName(),
      // API错误特有字段
      statusCode: extractedContext.statusCode,
      statusText: extractedContext.statusText,
      responseTime: extractedContext.responseTime,
      requestData: extractedContext.requestData,
      requestHeaders: extractedContext.requestHeaders,
      requestId: extractedContext.requestId,
      environment: extractedContext.environment,
      // 网络错误特有字段
      retryCount: extractedContext.retryCount,
      networkType: extractedContext.networkType,
      isConnected: extractedContext.isConnected,
    }
    // 更新错误统计
    this.errorStats.total++
    this.errorStats[type] = (this.errorStats[type] || 0) + 1
    this.errorStats.lastErrorTime = errorInfo.timestamp
    // 确定是否强制发送
    const shouldForceSend = forceSend || (type === 'api' && extractedContext && typeof extractedContext === 'object')
    if (shouldForceSend) {
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
      errorLevel: this.config?.errorLevel || ERROR_LEVEL.SILENT,
      timestamp: Date.now(),
    }
  }
  /**
   * 根据错误级别判断是否应该上报该错误
   * @private
   * @param {string} errorType 错误类型
   * @returns {boolean} 是否应该上报
   */
  _shouldReportError(errorType) {
    const level = this.config?.errorLevel || ERROR_LEVEL.SILENT
    const severity = ERROR_SEVERITY[errorType] || 'normal'
    switch (level) {
      case ERROR_LEVEL.STRICT:
        // 严格模式：上报所有错误
        return true
      case ERROR_LEVEL.STANDARD:
        // 标准模式：上报严重和普通错误，不上报轻微错误
        return severity !== 'minor'
      case ERROR_LEVEL.SILENT:
        // 静默模式：仅上报严重错误
        return severity === 'critical'
      default:
        return true
    }
  }
  /**
   * 获取当前错误级别
   * @returns {string} 当前错误级别
   */
  getErrorLevel() {
    return this.config?.errorLevel || ERROR_LEVEL.SILENT
  }
  /**
  	 * 设置错误级别
  	 * @param {string} level 错误级别 (strict/standard/silent)
  	 */
  	setErrorLevel(level) {
  		const validLevels = [ERROR_LEVEL.STRICT, ERROR_LEVEL.STANDARD, ERROR_LEVEL.SILENT]
  		if (!validLevels.includes(level)) {
  			console.warn(`无效的错误级别 "${level}"，有效值为: strict, standard, silent`)
  			return
  		}
  		if (this.config) {
  			this.config.errorLevel = level
  			console.log(`错误级别已更新为: ${level}`)
  		}
  	}
  
  	/**
  		 * 生成错误签名（用于去重）
  		 * @private
  		 * @param {string|Object} typeOrErrorInfo 错误类型或错误信息对象
  		 * @param {Error|Object} [error] 错误对象（当第一个参数是类型时使用）
  		 * @param {Object} [context] 错误上下文（当第一个参数是类型时使用）
  		 * @returns {string} 错误签名
  		 */
  		_generateErrorSignature(typeOrErrorInfo, error, context) {
  			// 兼容两种调用方式
  			let type, errorInfo
  			if (typeof typeOrErrorInfo === 'string') {
  				type = typeOrErrorInfo
  				// 根据类型提取签名所需的关键信息
  				const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
  				const url = context?.url || ''
  				const method = context?.method || ''
  				const statusCode = context?.statusCode || 0
  				
  				switch (type) {
  					case 'global':
  						return `${type}:${errorMessage}:${context?.source || ''}:${context?.lineno || 0}:${context?.colno || 0}`
  					case 'promise':
  						return `${type}:${errorMessage}`
  					case 'console':
  						return `${type}:${errorMessage}`
  					case 'miniProgram':
  					case 'pageNotFound':
  						return `${type}:${errorMessage}:${context?.path || ''}`
  					case 'network':
  						return `${type}:${url}:${method}`
  					case 'api':
  						return `${type}:${url}:${method}:${statusCode}`
  					default:
  						return `${type}:${errorMessage}`
  				}
  			} else {
  				// 旧的方式：传入 errorInfo 对象
  				errorInfo = typeOrErrorInfo
  				type = errorInfo.type || 'unknown'
  				let signature = type
  	
  				switch (type) {
  					case 'global':
  						signature = `${type}:${errorInfo.message || ''}:${errorInfo.source || ''}:${errorInfo.lineno || 0}:${errorInfo.colno || 0}`
  						break
  					case 'promise':
  						const reason = typeof errorInfo.reason === 'object'
  							? JSON.stringify(errorInfo.reason)
  							: String(errorInfo.reason || '')
  						signature = `${type}:${reason}`
  						break
  					case 'console':
  						signature = `${type}:${(errorInfo.args || []).join('|')}`
  						break
  					case 'miniProgram':
  					case 'pageNotFound':
  						signature = `${type}:${errorInfo.error || errorInfo.path || ''}`
  						break
  					case 'network':
  						signature = `${type}:${errorInfo.url || ''}:${errorInfo.method || ''}`
  						break
  					case 'api':
  						signature = `${type}:${errorInfo.url || ''}:${errorInfo.method || ''}:${errorInfo.statusCode || 0}`
  						break
  					default:
  						signature = `${type}:${errorInfo.error || errorInfo.message || ''}`
  				}
  				return signature
  			}
  		}  
  	/**
  		 * 检查错误是否在去重间隔内已上报过
  		 * @private
  		 * @param {string|Object} signatureOrErrorInfo 错误签名或错误信息对象
  		 * @returns {boolean} true表示是重复错误（应跳过），false表示是新错误（应上报）
  		 */
  		_isDuplicateError(signatureOrErrorInfo) {
  			// 支持传入签名或 errorInfo 对象
  			const signature = typeof signatureOrErrorInfo === 'string' 
  				? signatureOrErrorInfo 
  				: this._generateErrorSignature(signatureOrErrorInfo)
  			
  			const now = Date.now()
  			const dedupInterval = this.config?.dedupInterval || DEFAULT_DEDUP_INTERVAL
  	
  			// 检查缓存中是否存在该签名
  			if (this._errorCache.has(signature)) {
  				const lastReportTime = this._errorCache.get(signature)
  	
  				// 如果在去重间隔内，认为是重复错误
  				if (now - lastReportTime < dedupInterval) {
  					console.info(`错误去重：跳过重复错误，距上次上报 ${Math.round((now - lastReportTime) / 1000)} 秒`)
  					return true
  				}
  			}
  	
  			// 更新缓存
  			this._errorCache.set(signature, now)
  	
  			// 清理过期的缓存条目（避免内存泄漏）
  			this._cleanupErrorCache(now, dedupInterval)
  
  		return false
  	}
  
  	/**
  	 * 清理过期的错误缓存
  	 * @private
  	 * @param {number} now 当前时间戳
  	 * @param {number} dedupInterval 去重间隔
  	 */
  	_cleanupErrorCache(now, dedupInterval) {
  		// 当缓存超过100条时进行清理
  		if (this._errorCache.size > 100) {
  			for (const [key, timestamp] of this._errorCache.entries()) {
  				if (now - timestamp > dedupInterval) {
  					this._errorCache.delete(key)
  				}
  			}
  		}
  	}
  
  	/**
  	 * 清空错误去重缓存
  	 */
  	clearErrorCache() {
  		this._errorCache.clear()
  		console.log('错误去重缓存已清空')
  	}
  
  	/**
  
  		 * 处理全局错误
  
  		 * @private
  
  		 */
  
  		_handleGlobalError(errorInfo) {
  
  			// 错误级别过滤
  
  			if (!this._shouldReportError('global')) {
  
  				return
  
  			}
  
  			// 构建完整错误信息用于去重检查
  
  			const fullErrorInfo = {
  
  				...errorInfo,
  
  				message: errorInfo.message || 'Unknown global error',
  
  				source: errorInfo.source || '',
  
  				lineno: errorInfo.lineno || 0,
  
  				colno: errorInfo.colno || 0,
  
  			}
  
  			// 错误去重检查
  
  			if (this._isDuplicateError(fullErrorInfo)) {
  
  				return
  
  			}
  
  			this.errorStats.total++
  
  			this.errorStats.global++
  
  			this.errorStats.lastErrorTime = errorInfo.timestamp
  
  			this._sendErrorToWebhook({
  
  				...fullErrorInfo,
  
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
  		// 错误级别过滤
  		if (!this._shouldReportError('promise')) {
  			return
  		}
  		// 构建完整错误信息用于去重检查
  		const fullErrorInfo = {
  			...errorInfo,
  			reason: this._serializeError(errorInfo.reason),
  		}
  		// 错误去重检查
  		if (this._isDuplicateError(fullErrorInfo)) {
  			return
  		}
  		this.errorStats.total++
  		this.errorStats.promise++
  		this.errorStats.lastErrorTime = errorInfo.timestamp
  		this._sendErrorToWebhook({
  			...fullErrorInfo,
  			url: this._getCurrentUrl(),
  			userAgent: this._getUserAgent(),
  			page: getCurrentPageName(),
  		})
  	}  /**
   * 处理console错误
   * @private
   */
  _handleConsoleError(errorInfo) {
  // 错误级别过滤
  if (!this._shouldReportError('console')) {
  return
  }
  // 错误去重检查
  if (this._isDuplicateError(errorInfo)) {
   return
  }
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
  // 错误级别过滤（小程序错误和页面未找到都属于严重错误）
  const errorType = errorInfo.type === 'pageNotFound' ? 'pageNotFound' : 'miniProgram'
  if (!this._shouldReportError(errorType)) {
  return
  }
  // 错误去重检查
  if (this._isDuplicateError(errorInfo)) {
   return
  }
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
  // 错误级别过滤
  if (!this._shouldReportError('network')) {
  return
  }
  // 错误去重检查
  if (this._isDuplicateError(errorInfo)) {
   return
  }
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
  
  		// 优先使用配置中的 webhookUrl，否则使用环境变量
  		const webhookUrl = this.config?.webhookUrl || import.meta.env.VITE_WEBHOOK
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
        setTimeout(
          () => {
            this._sendErrorToWebhook(errorInfo, retryCount + 1)
          },
          (this.config?.retryDelay || 1000) * (retryCount + 1),
        )
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
export const initErrorMonitor = options => {
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
export const wrapPromise = promise => {
  return errorMonitorInstance.wrapPromise ? errorMonitorInstance.wrapPromise(promise) : promise
}
export const getErrorLevel = () => {
return errorMonitorInstance.getErrorLevel()
}
export const setErrorLevel = level => {
return errorMonitorInstance.setErrorLevel(level)
}
export const clearErrorCache = () => {
	return errorMonitorInstance.clearErrorCache()
}
// 默认导出 - 向后兼容
export default errorMonitorInstance
