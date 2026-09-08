# Talbica 3 - Interactive Periodic Table

交互式元素周期表与化学数据库。中英双语、程序化音效、Three.js 3D 晶体模型、高斯消元方程式配平。致敬 [Talbica.com](https://www.talbica.com/)。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite 8.x](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r182-black.svg)](https://threejs.org/)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87-orange.svg)]()

## Quick Start

```bash
npm install
npm run dev          # http://localhost:5173
```

需要 Node.js 18+ 和 npm 9+。也可以用一键脚本：

```bash
chmod +x scripts/*.sh
./scripts/install.sh   # 环境检测 + 安装依赖
./scripts/dev.sh       # 启动开发服务器
```

生产构建与预览：

```bash
npm run build
npm run preview
```

## Features

### 周期表三种视图

- **Colors** -- 11 类化学系列（碱金属、过渡金属、卤素等）经典色彩分类，底部可交互图例
- **Photos** -- 118 种元素的真实标本摄影图
- **Heatmaps** -- 9+ 维度热力图（熔点、沸点、密度、原子量、原子半径、电负性、宇宙/地壳丰度、半衰期）

顶栏切换视图，点击元素打开详情卡片。

### 元素详情卡片

点击任意元素展开详情面板：

- **Bohr 原子模型** -- Canvas 实时电子轨道动画
- **3D 晶体点阵** -- Three.js 渲染，支持拖拽旋转、缩放、日/夜光照切换
- **可见光谱** -- 吸收与发射带
- **蜡烛温度计** -- 显示室温下物态（固/液/气），支持 C / K / F 切换

### 智能搜索与方程式配平

顶部输入框支持多种查找方式：

| 输入 | 示例 |
|------|------|
| 元素符号 | `Fe` |
| 中文名 | `铁` |
| 英文名 | `Iron` |
| 拼音 | `tie` |

**配平方程式**：用 `=` 分隔反应物和生成物，如 `H2 + O2 = H2O`、`KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O`。

**反应求解**：输入反应物（如 `Fe + Cl2`），自动预测产物。下方提供水、双氧水、乙醇等常用分子快选芯片。

### 音效系统

- 宇宙环境背景音（55Hz 低音 + 九和弦漂移 + 粉红噪音 + 随机谐波钟鸣）-- Web Audio API 程序化合成，无音频文件依赖
- 鼠标滑过元素触发原子序数映射的五声音阶泛音
- 顶栏音频面板可独立控制 BGM / SFX 开关和音量

### 其他

- 中英双语全量汉化（元素名、拼音、属性、术语表），语言偏好存于 localStorage
- A4 / A3 高清周期表打印导出

## Deployment

### Docker

```bash
docker compose up -d --build
# http://localhost:8080
```

或：

```bash
./scripts/deploy.sh docker
```

### 脚本一览

| 脚本 | 用途 |
|------|------|
| `scripts/install.sh` | 环境检测 + 安装依赖 |
| `scripts/dev.sh` | 启动开发服务器 |
| `scripts/build.sh` | 生产构建 |
| `scripts/deploy.sh` | 预览构建产物 / Docker 部署 |

## Tech Stack

| 模块 | 技术 |
|------|------|
| 构建 | Vite 8.x |
| 核心 | Vanilla JavaScript (ES6+) |
| 3D 可视化 | Three.js (r182) |
| 2D 动画 | Canvas API |
| 音频 | Web Audio API |
| 色彩 | Chroma.js |
| 样式 | Vanilla CSS3 |

## Documentation

- [使用指南](./docs/user-guide.md) -- 各模式操作细节、配平语法、音频设置、快捷键
- [项目笔记](./docs/project-notes.md) -- 创建与维护记录

## License

MIT. 视觉理念与元素公开属性数据致敬 [Talbica](https://www.talbica.com/)。
