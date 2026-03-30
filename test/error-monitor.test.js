/**
 * 错误监控功能测试文件
 * 运行方式：node test/error-monitor.test.js
 */

// 模拟 uni 环境
global.uni = {
  getSystemInfoSync: () => ({
    appName: '测试应用',
    appVersion: '1.0.0',
    platform: 'windows',
    system: 'Windows 10',
    model: 'PC',
    mode: 'default',
  }),
  request: (options) => {
    console.log(`[模拟请求] ${options.method} ${options.url}`)
    console.log('[请求内容]', JSON.stringify(options.data, null, 2))
    // 模拟成功响应
    setTimeout(() => {
      if (options.success) {
        options.success({
          statusCode: 200,
          data: { errcode: 0, errmsg: 'ok' }
        })
      }
    }, 100)
    return { abort: () => {} }
  },
  onError: (callback) => {
    global._uniOnErrorCallback = callback
  },
  onPageNotFound: (callback) => {
    global._uniOnPageNotFoundCallback = callback
  },
}

// 模拟 getCurrentPages
global.getCurrentPages = () => [
  {
    route: 'pages/index/index',
    $page: { fullPath: '/pages/index/index' }
  }
]

// 模拟 window 环境
global.window = {
  location: { href: 'http://localhost:8080/test' },
  onerror: null,
  addEventListener: (event, callback) => {
    if (event === 'unhandledrejection') {
      global._unhandledRejectionCallback = callback
    }
  },
}

global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Test Browser'
}

// 设置环境变量
process.env.MODE = 'production'
process.env.VITE_WEBHOOK = ''

// 读取源文件并修改 import.meta 引用
const fs = require('fs')
const path = require('path')

// 读取源代码
const sourcePath = path.join(__dirname, '../src/index.js')
let sourceCode = fs.readFileSync(sourcePath, 'utf-8')

// 替换 import.meta.env 为 process.env
sourceCode = sourceCode.replace(/import\.meta\.env\.MODE/g, 'process.env.MODE || "production"')
sourceCode = sourceCode.replace(/import\.meta\.env\.VITE_WEBHOOK/g, 'process.env.VITE_WEBHOOK || ""')

// 创建临时模块
const tempModulePath = path.join(__dirname, 'temp-index.js')
fs.writeFileSync(tempModulePath, sourceCode)

// 导入错误监控模块
const errorMonitor = require('./temp-index.js')
const { initErrorMonitor, reportError, getErrorStats, resetErrorStats, getErrorLevel, setErrorLevel, clearErrorCache, ERROR_LEVEL } = errorMonitor

// 测试配置
const TEST_WEBHOOK = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=9a401eb2-065a-4882-82e9-b438bcd1eac4'

// 测试结果统计
let passCount = 0
let failCount = 0

/**
 * 断言函数
 */
function assert(condition, testName) {
  if (condition) {
    console.log(`✅ 通过: ${testName}`)
    passCount++
  } else {
    console.log(`❌ 失败: ${testName}`)
    failCount++
  }
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 测试套件
 */
async function runTests() {
  console.log('\n========================================')
  console.log(' 错误监控功能测试')
  console.log('========================================\n')

  // ========== 测试1: 初始化 ==========
  console.log('📋 测试组1: 初始化测试')
  console.log('----------------------------------------')

  // 重置状态
  resetErrorStats()
  clearErrorCache()

  // 初始化错误监控
  initErrorMonitor({
    webhookUrl: TEST_WEBHOOK,
    forceEnable: true,
    errorLevel: ERROR_LEVEL.STRICT,
    dedupInterval: 5000, // 5秒去重间隔（测试用）
  })

  await delay(100)
  assert(getErrorLevel() === ERROR_LEVEL.STRICT, '初始化后错误级别应为 strict')

  // ========== 测试2: 错误级别功能 ==========
  console.log('\n📋 测试组2: 错误级别功能')
  console.log('----------------------------------------')

  // 测试设置错误级别
  setErrorLevel(ERROR_LEVEL.STANDARD)
  assert(getErrorLevel() === ERROR_LEVEL.STANDARD, '设置错误级别应为 standard')

  setErrorLevel(ERROR_LEVEL.SILENT)
  assert(getErrorLevel() === ERROR_LEVEL.SILENT, '设置错误级别应为 silent')

  // 恢复为 strict 进行后续测试
  setErrorLevel(ERROR_LEVEL.STRICT)

  // ========== 测试3: 手动上报错误 ==========
  console.log('\n📋 测试组3: 手动上报错误')
  console.log('----------------------------------------')

  resetErrorStats()
  clearErrorCache()

  const stats1 = getErrorStats()
  assert(stats1.total === 0, '重置后错误总数应为0')

  // 上报一个手动错误
  reportError('manual', new Error('测试手动错误'), { testId: 'test-001' })

  await delay(200)
  const stats2 = getErrorStats()
  assert(stats2.total >= 1, '上报后错误总数应增加')
  assert(stats2.manual >= 1, '手动错误计数应增加')

  // ========== 测试4: 错误去重功能 ==========
  console.log('\n📋 测试组4: 错误去重功能')
  console.log('----------------------------------------')

  resetErrorStats()
  clearErrorCache()

  // 上报相同错误两次
  const testError = new Error('重复错误测试')
  reportError('manual', testError, { dedupTest: 1 })

  await delay(100)
  const stats3 = getErrorStats()
  const firstCount = stats3.total

  // 立即再次上报相同错误（应该被去重）
  reportError('manual', testError, { dedupTest: 1 })

  await delay(100)
  const stats4 = getErrorStats()
  assert(stats4.total === firstCount, '相同错误在去重间隔内不应重复上报')

  // 清空缓存后再次上报
  clearErrorCache()
  reportError('manual', testError, { dedupTest: 1 })

  await delay(100)
  const stats5 = getErrorStats()
  assert(stats5.total > firstCount, '清空缓存后可以重新上报')

  // ========== 测试5: API错误上报 ==========
  console.log('\n📋 测试组5: API错误上报')
  console.log('----------------------------------------')

  resetErrorStats()
  clearErrorCache()

  // 模拟API错误响应
  const apiError = {
    config: {
      url: 'https://api.example.com/test',
      method: 'POST',
      data: { id: 123 },
      header: { 'Content-Type': 'application/json' },
      startTime: Date.now() - 500,
    },
    statusCode: 500,
    data: {
      code: 500,
      msg: '服务器内部错误',
    },
  }

  reportError('api', apiError)

  await delay(200)
  const stats6 = getErrorStats()
  assert(stats6.api >= 1, 'API错误应被正确统计')

  // ========== 测试6: 网络错误上报 ==========
  console.log('\n📋 测试组6: 网络错误上报')
  console.log('----------------------------------------')

  resetErrorStats()
  clearErrorCache()

  reportError('network', new Error('网络连接失败'), {
    url: 'https://api.example.com/network-test',
    method: 'GET',
  })

  await delay(200)
  const stats7 = getErrorStats()
  assert(stats7.network >= 1, '网络错误应被正确统计')

  // ========== 测试7: 强制发送 ==========
  console.log('\n📋 测试组7: 强制发送功能')
  console.log('----------------------------------------')

  resetErrorStats()
  clearErrorCache()

  setErrorLevel(ERROR_LEVEL.SILENT) // 设置为静默模式

  // 在静默模式下，普通错误不应上报
  reportError('promise', new Error('静默模式Promise错误'))

  await delay(100)
  const stats8 = getErrorStats()
  const silentCount = stats8.total

  // 使用强制发送
  reportError('promise', new Error('强制发送的Promise错误'), {}, true)

  await delay(200)
  const stats9 = getErrorStats()
  assert(stats9.total > silentCount, '强制发送应绕过错误级别过滤')

  // 恢复为 strict
  setErrorLevel(ERROR_LEVEL.STRICT)

  // ========== 测试8: 错误统计重置 ==========
  console.log('\n📋 测试组8: 错误统计重置')
  console.log('----------------------------------------')

  reportError('manual', new Error('测试错误'))

  await delay(100)
  const beforeReset = getErrorStats()
  assert(beforeReset.total > 0, '重置前应有错误记录')

  resetErrorStats()
  const afterReset = getErrorStats()
  assert(afterReset.total === 0, '重置后错误总数应为0')
  assert(afterReset.global === 0, '重置后全局错误数应为0')
  assert(afterReset.promise === 0, '重置后Promise错误数应为0')

  // ========== 测试总结 ==========
  console.log('\n========================================')
  console.log(' 测试总结')
  console.log('========================================')
  console.log(`✅ 通过: ${passCount}`)
  console.log(`❌ 失败: ${failCount}`)
  console.log(`📊 总计: ${passCount + failCount}`)
  console.log('========================================\n')

  if (failCount === 0) {
    console.log('🎉 所有测试通过！')
  } else {
    console.log('⚠️ 部分测试失败，请检查相关功能')
  }

  // 清理临时文件
  try {
    fs.unlinkSync(tempModulePath)
  } catch (e) {
    // 忽略清理错误
  }

  return failCount === 0
}

// 运行测试
runTests().catch(console.error)