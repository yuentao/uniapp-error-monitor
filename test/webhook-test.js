/**
 * Webhook 真实发送测试
 * 运行方式：node test/webhook-test.js
 */

const https = require('https')

// 测试用的 webhook 地址
const TEST_WEBHOOK = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=9a401eb2-065a-4882-82e9-b438bcd1eac4'

// 模拟 uni 环境（使用真实的 HTTP 请求）
global.uni = {
  getSystemInfoSync: () => ({
    appName: '错误监控测试',
    appVersion: '1.0.0',
    platform: 'node',
    system: 'Node.js ' + process.version,
    model: 'Server',
    mode: 'test',
  }),

  // 使用真实的 HTTPS 请求
  request: (options) => {
    console.log('\n========================================')
    console.log('📤 发送真实请求到 Webhook')
    console.log('========================================')
    console.log('URL:', options.url)
    console.log('Method:', options.method)
    console.log('数据:', JSON.stringify(options.data, null, 2))

    const url = new URL(options.url)
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }

    const req = https.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('\n📥 响应状态:', res.statusCode)
        console.log('响应内容:', data)
        if (options.success) {
          options.success({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          })
        }
      })
    })

    req.on('error', (e) => {
      console.error('❌ 请求错误:', e.message)
      if (options.fail) {
        options.fail(e)
      }
    })

    req.write(JSON.stringify(options.data))
    req.end()

    return { abort: () => req.destroy() }
  },

  onError: (callback) => { global._uniOnErrorCallback = callback },
  onPageNotFound: (callback) => { global._uniOnPageNotFoundCallback = callback },
}

// 模拟 getCurrentPages
global.getCurrentPages = () => [
  {
    route: 'pages/test/test',
    $page: { fullPath: '/pages/test/test?id=webhook-test' }
  }
]

// 模拟 window 环境
global.window = {
  location: { href: 'http://localhost:8080/webhook-test' },
  onerror: null,
  addEventListener: () => {},
}
global.navigator = { userAgent: 'Node.js Error Monitor Test' }

// 设置环境变量
process.env.MODE = 'production'
// 注意：webhookUrl 需要通过 initErrorMonitor 传入，不能通过环境变量

// 读取并修改源代码
const fs = require('fs')
const path = require('path')
const sourcePath = path.join(__dirname, '../src/index.js')
let sourceCode = fs.readFileSync(sourcePath, 'utf-8')

// 替换 import.meta.env
sourceCode = sourceCode.replace(/import\.meta\.env\.MODE/g, 'process.env.MODE || "production"')
sourceCode = sourceCode.replace(/import\.meta\.env\.VITE_WEBHOOK/g, 'process.env.VITE_WEBHOOK || ""')

const tempModulePath = path.join(__dirname, 'temp-webhook-index.js')
fs.writeFileSync(tempModulePath, sourceCode)

// 导入模块
const errorMonitor = require('./temp-webhook-index.js')
const { initErrorMonitor, reportError, getErrorStats, resetErrorStats, setErrorLevel, clearErrorCache, ERROR_LEVEL } = errorMonitor

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 主测试函数
async function runWebhookTest() {
  console.log('\n========================================')
  console.log(' 错误监控 Webhook 真实发送测试')
  console.log('========================================\n')

  // 初始化
  resetErrorStats()
  clearErrorCache()
  initErrorMonitor({
    webhookUrl: TEST_WEBHOOK,
    forceEnable: true,
    errorLevel: ERROR_LEVEL.STRICT,
  })
  console.log('✅ 错误监控已初始化')
  console.log('📍 Webhook:', TEST_WEBHOOK)
  await delay(500)

  // 测试1: 发送手动错误
  console.log('\n----------------------------------------')
  console.log('🧪 测试1: 发送手动错误')
  console.log('----------------------------------------')
  reportError('manual', new Error('这是一条测试错误消息 - 手动上报'), {
    testId: 'test-001',
    testTime: new Date().toISOString(),
    description: '用于验证 webhook 发送功能'
  })
  await delay(2000)

  // 测试2: 发送 API 错误
  console.log('\n----------------------------------------')
  console.log('🧪 测试2: 发送 API 错误')
  console.log('----------------------------------------')
  clearErrorCache()
  reportError('api', {
    config: {
      url: 'https://api.example.com/test-api',
      method: 'POST',
      data: { userId: 123 },
      header: { 'Authorization': 'Bearer xxx' },
      startTime: Date.now() - 500,
    },
    statusCode: 500,
    data: {
      code: 500,
      msg: '服务器内部错误',
    }
  })
  await delay(2000)

  // 测试3: 发送网络错误
  console.log('\n----------------------------------------')
  console.log('🧪 测试3: 发送网络错误')
  console.log('----------------------------------------')
  clearErrorCache()
  reportError('network', new Error('网络连接超时'), {
    url: 'https://api.example.com/timeout',
    method: 'GET',
    retryCount: 3,
    networkType: 'wifi',
  })
  await delay(2000)

  // 清理
  console.log('\n----------------------------------------')
  console.log('📊 测试统计')
  console.log('----------------------------------------')
  const stats = getErrorStats()
  console.log('总错误数:', stats.total)
  console.log('手动错误:', stats.manual)
  console.log('API错误:', stats.api)
  console.log('网络错误:', stats.network)

  // 清理临时文件
  try {
    fs.unlinkSync(tempModulePath)
  } catch (e) {}

  console.log('\n========================================')
  console.log(' 测试完成！请检查企业微信机器人')
  console.log('========================================\n')
}

runWebhookTest().catch(console.error)