# ins-outs

三个独立的前端/全栈子工程，各自拥有完整的构建、测试与部署流程。

## 子工程

| 目录 | 项目 | 简介 | 技术栈 |
|------|------|------|--------|
| [`chemistry/`](./chemistry/) | Talbica 3 | 交互式元素周期表与化学数据库，中英双语、Web Audio 程序化音效、Three.js 3D 晶体模型、高斯消元方程式配平 | Vite, Vanilla JS, Three.js, Web Audio API |
| [`chroma-lab/`](./chroma-lab/) | Chroma Lab | 液体分类益智游戏，中央大瓶 + 未知色层机制，跨平台（Web / Android / iOS） | React 18, TypeScript, Vite, Capacitor 6 |
| [`texas-holdem/`](./texas-holdem/) | River Club | 六人无限注德州扑克，离线 AI 练习 + Socket.IO 好友房间，全平台（Web / Desktop / Mobile） | React, TypeScript, Socket.IO, Electron, Capacitor |

## Prerequisites

- **Node.js**: chemistry / chroma-lab 需要 18+；texas-holdem 需要 22.12+
- **npm**: 9+
- 移动端构建另需 Android Studio + JDK 17 (Android) 或 macOS + Xcode (iOS)

## 开发

每个子工程独立管理依赖，进入对应目录后按各自的 README 操作：

```bash
cd chemistry && npm install && npm run dev
cd chroma-lab && npm install && npm run dev
cd texas-holdem && npm ci && npm run dev
```

## 许可

各子工程均采用 MIT License，详见各目录内的 LICENSE 文件。
