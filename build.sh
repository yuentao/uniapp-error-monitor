#!/bin/bash

# 清理 dist 目录
echo "🧹 清理构建目录..."
rm -rf dist
rm -rf types

# TypeScript 类型检查和编译
echo "🔍 TypeScript 类型检查..."
npm run type-check

# 生成类型声明文件
echo "📝 生成类型声明文件..."
npm run build:types

# Rollup 构建
echo "📦 执行 Rollup 构建..."
npm run build:dist

# 复制类型文件到 dist 目录
echo "📋 复制类型文件..."
cp -r types/* dist/types/

# 构建完成
echo "✅ 构建完成！"
echo "📁 输出目录: dist/"
echo "🎯 主要文件:"
echo "  - dist/index.js (CommonJS)"
echo "  - dist/index.mjs (ESM)"
echo "  - dist/index.umd.js (UMD)"
echo "  - dist/index.d.ts (TypeScript 类型)"
echo ""
echo "📊 统计信息:"
ls -lh dist/
echo ""

echo "🚀 可以执行 'npm publish' 发布到 npm！"