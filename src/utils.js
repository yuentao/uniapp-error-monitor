/**
 * 工具函数
 * 提供环境检测、错误序列化等通用功能
 */

/**
 * 获取当前页面名称
 * @returns {string} 页面名称
 */
export function getCurrentPageName() {
  try {
    // 尝试从 getCurrentPages 获取（小程序环境）
    if (typeof getCurrentPages !== 'undefined') {
      const pages = getCurrentPages()
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        return currentPage.route || currentPage.$page?.fullPath || '未知页面'
      }
    }
  } catch (error) {
    // 忽略错误，返回默认值
  }

  // Web 环境
  try {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.pathname || '未知页面'
    }
  } catch (error) {
    return '未知页面'
  }

  // UniApp 环境
  try {
    if (typeof uni !== 'undefined') {
      const pages = getCurrentPages?.()
      if (pages && pages.length > 0) {
        return pages[pages.length - 1]?.route || '未知页面'
      }
    }
  } catch (error) {
    return '未知页面'
  }

  return '未知页面'
}

/**
 * 获取当前 URL
 * @returns {string} 当前 URL
 */
export function getCurrentUrl() {
  // Web 环境
  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href
  }

  // UniApp 小程序环境
  if (typeof uni !== 'undefined') {
    try {
      const pages = getCurrentPages?.()
      if (pages && pages.length > 0) {
        const currentPage = pages[pages.length - 1]
        return currentPage?.route || ''
      }
    } catch (error) {
      // 忽略错误
    }
  }

  return ''
}

/**
 * 获取用户代理信息
 * @returns {string} 用户代理信息
 */
export function getUserAgent() {
  // Web 环境
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent
  }

  // UniApp 环境
  if (typeof uni !== 'undefined') {
    try {
      const systemInfo = uni.getSystemInfoSync?.()
      if (systemInfo) {
        return `${systemInfo.platform || 'Unknown'} ${systemInfo.system || 'Unknown'} ${systemInfo.model || 'Unknown'}`
      }
    } catch (error) {
      // 忽略错误
    }
  }

  return 'Unknown Device'
}

/**
 * 序列化错误对象
 * @param {any} error 要序列化的错误对象
 * @returns {any} 序列化后的错误对象
 */
export function serializeError(error) {
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
 * 检测是否为生产环境
 * @returns {boolean} 是否为生产环境
 */
export function isProduction() {
  try {
    // 检查 uniapp 运行模式
    if (typeof uni !== 'undefined') {
      const systemInfo = uni.getSystemInfoSync?.()
      if (systemInfo?.mode && systemInfo.mode !== 'default') {
        // 体验版、开发版、预览版 - 认为是非生产环境
        return false
      }
    }
  } catch (error) {
    // 忽略错误，继续检测
  }

  // 检查环境变量 MODE
  try {
    if (typeof import !== 'undefined' && import.meta?.env?.MODE === 'development') {
      return false
    }
  } catch (error) {
    // 忽略错误，继续检测
  }

  // 检查是否为浏览器环境
  if (typeof window !== 'undefined') {
    try {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return false
      }
    } catch (error) {
      // 忽略错误
    }
  }

  // 默认：开发环境和体验版不启用，生产环境启用
  return true
}

/**
 * 检测是否为 UniApp 环境
 * @returns {boolean} 是否为 UniApp 环境
 */
export function isUniAppEnvironment() {
  return typeof uni !== 'undefined' && typeof getCurrentPages !== 'undefined'
}

/**
 * 检测是否为微信小程序环境
 * @returns {boolean} 是否为微信小程序环境
 */
export function isWeChatMiniProgram() {
  if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
    try {
      const systemInfo = uni.getSystemInfoSync()
      return systemInfo.hostName === 'wechat' || systemInfo.platform === 'devtools'
    } catch (error) {
      // 忽略错误
    }
  }
  return false
}

/**
 * 延迟执行函数
 * @param {number} ms 延迟时间（毫秒）
 * @returns {Promise<void>} Promise 对象
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 重试函数
 * @param {Function} fn 要执行的函数
 * @param {number} maxRetries 最大重试次数
 * @param {number} delayTime 重试延迟时间（毫秒）
 * @returns {Promise} 执行结果
 */
export async function retry(fn, maxRetries = 3, delayTime = 1000) {
  let lastError

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i < maxRetries) {
        await delay(delayTime * (i + 1))
      }
    }
  }

  throw lastError
}

/**
 * 获取系统信息
 * @returns {Object} 系统信息对象
 */
export function getSystemInfo() {
  const systemInfo = {}

  try {
    if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
      Object.assign(systemInfo, uni.getSystemInfoSync())
    }
  } catch (error) {
    // 忽略错误
  }

  try {
    if (typeof navigator !== 'undefined') {
      systemInfo.userAgent = navigator.userAgent
      systemInfo.language = navigator.language
    }
  } catch (error) {
    // 忽略错误
  }

  try {
    if (typeof window !== 'undefined' && window.location) {
      systemInfo.url = window.location.href
      systemInfo.hostname = window.location.hostname
      systemInfo.pathname = window.location.pathname
    }
  } catch (error) {
    // 忽略错误
  }

  return systemInfo
}

/**
 * 验证 webhook URL 格式
 * @param {string} url 要验证的 URL
 * @returns {boolean} URL 是否有效
 */
export function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch (error) {
    return false
  }
}

/**
 * 深度克隆对象
 * @param {any} obj 要克隆的对象
 * @returns {any} 克隆后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }

  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }

  return obj
}

/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 限制时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}