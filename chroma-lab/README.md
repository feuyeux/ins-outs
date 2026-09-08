# Chroma Lab

跨平台液体分类益智游戏。实验台上摆着一排试剂瓶，把混在一起的液体倒成「每瓶一色」。核心机制：中央大瓶。

纯 CSS + SVG 渲染，无图片资源依赖。支持 Web、Android、iOS。

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

需要 Node.js 18+。

## How to Play

点击瓶子选中（上浮），再点击目标瓶倒液。

**基本规则：**

- 只能倒入空瓶，或顶层颜色相同的瓶子
- 一次倒出瓶口连续同色的一整段，受目标瓶剩余空间限制
- 普通瓶容量 4 层

**中央大瓶：**

正中间贯穿上下的大瓶也是一个瓶子，容量 6 / 10 / 14 / 18 层。每关有一种颜色的总量恰好等于大瓶容量，而大瓶容量恒为 4n+2，在普通瓶里永远凑不满 -- 只能整段倒进中央大瓶。

**未知色层（第 7 关起）：**

灰底 `?` 层藏在液面之下，把上面的液体倒走、它浮到液面时才揭晓真实颜色。

**通关条件：**

所有瓶子都变成空瓶或装满单色。卡住时可以撤销、重玩，或每关免费加一个空瓶救援。

## Level Design

四条难度曲线：

| 旋钮 | 曲线 |
|------|------|
| 颜色数 | 第 1 关 3 色，每 2 关 +1，上限 10 |
| 空瓶数 | 常规 2 个；每 5 关出现仅 1 个的高难度关 |
| 大瓶容量 | 每 4 关 +4 层：6 -> 10 -> 14 -> 18 |
| 未知色层 | 第 7 关起，每 3 关 +1 层，上限 6；同一瓶最多 2 层 |

关卡由 level 编号派生种子生成，同一关卡每次进入牌面一致。生成后经求解器校验可解，不可解自动换种子。

## Development

```bash
npm run typecheck  # 类型检查
npm test           # 单元测试（156 个）
npm run build      # 生产构建到 dist/
```

## Mobile Build

```bash
npm run build
npx cap add android      # 首次，生成原生工程
npx cap add ios
npm run cap:sync         # 同步 web 产物
npm run cap:android      # Android Studio 打开
npm run cap:ios          # Xcode 打开
```

iOS 需 macOS + Xcode；Android 需 Android Studio + JDK 17。

## Tech Stack

| 层面 | 选型 |
|------|------|
| UI | React 18 + TypeScript |
| 构建 | Vite 5 |
| 跨平台 | Capacitor 6 + PWA-ready Web |
| 测试 | Vitest |

## Documentation

- [游戏设计文档](./docs/game-design.md) -- 规则推导、难度曲线、求解器、视觉规范、系统设计
- [品类设计稿](./docs/sort-genre-design.md) -- 水排序品类 8 个可调旋钮 + 10 个原创变体

## License

MIT
