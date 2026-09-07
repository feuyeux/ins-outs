# ⚛️ Talbica 3 交互式元素周期表与化学数据库 (Bilingual & Audio Enhanced)

> **完美复刻 [Talbica.com](https://www.talbica.com/)** 的现代化交互式周期表与化学反应平台。原生支持**中英双语无缝切换**、基于 Web Audio API 打造的**宇宙环境背景音 (Ambient BGM) 与物理谐波交互音效 (SFX)**、**2D Bohr 电子云公转动画**、**Three.js 3D 晶体点阵模型**与**高斯消元化学方程式配平求解器**。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/Vite-8.x-646CFF.svg)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r182-black.svg)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio-Procedural%20Synthesis-green.svg)]()
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87-orange.svg)]()

---

## 🌟 核心特性 (Features)

### 1. 周期表三大核心视觉模式
- **🎨 配色模式 (Colors Mode)**：11 类化学系列（碱金属、碱土金属、过渡金属、贫金属、类金属、非金属、卤素、稀有气体、镧系、锕系等）经典高对比色彩分类，搭配底部可交互系列图例。
- **📸 实物标本摄影模式 (Photos Mode)**：无缝展示全部 118 种元素的真实实物标本高精度摄影图。
- **🔥 9+ 维度热力图模式 (Heatmaps Mode)**：
  - 涵盖熔点、沸点、密度、原子量、原子半径、电负性、宇宙丰度、地壳丰度、半衰期等属性。
  - 基于 Chroma.js 动态计算属性范围，渲染平滑的渐变色阶与实时刻度指示条。

### 2. 沉浸式多媒体与环境音效 (Audio Engine)
- **🪐 宇宙环境背景音 (Cosmic Drone BGM)**：
  - 纯原生 **Web Audio API** 程序化实时合成，**零外部脆弱音频文件依赖，秒级即开**。
  - 55Hz 温暖亚低音衬底 + A-C-E-G-B 空灵九和弦环境漂移 + 微量粉红噪音模拟宇宙背景微波辐射 + 随机星际五度谐波钟鸣（Generative Harmonic Chimes）。
- **🔔 交互式物理泛音 (Interactive SFX)**：
  - **原子序数映射音效**：鼠标滑过元素时，根据原子序数（Z=1~118）映射到五声音阶的晶莹泛音共鸣。
  - **交互触感声效**：卡片展开、模式切换、计算配平具备利落未来感的按键与状态反馈。
- **🎛️ 音效控制面板**：顶栏一键展开音频面板，支持 BGM 与 SFX 独立静音开关与音量平滑线性微调。

### 3. 可交互元素详情卡片 (Element Detail Card)
- **🌌 2D Bohr 原子模型**：HTML5 Canvas 实时计算电子轨道与旋转公转动画，支持核外电子排布动态高亮。
- **🧊 Three.js 3D 晶体/原子点阵**：支持 360° 鼠标拖拽旋转、滚轮缩放与日间 (Day) / 夜间 (Night) 科研级光照切换。
- **🌈 可见光谱吸收与发射带**：高精度展示各元素对应的可见光光谱带。
- **🕯️ 热力学蜡烛温度计 (Candle Thermometer)**：动态直观显示元素在室温下的物态（固/液/气），支持摄氏度 (°C)、开尔文 (K) 与华氏度 (°F) 实时转换。

### 4. 智能化学搜索与方程式配平 (Smart Field & Balancer)
- **🔍 智能联想检索**：支持按元素符号（如 `Fe`）、中文名（`铁`）、英文名（`Iron`）、拼音（`tie`）模糊查找与周期表靶向高亮定位。
- **⚖️ 方程式配平器 (Balance)**：采用**高斯消元算法 (Gaussian Elimination)** 求解化学计量矩阵空空间，瞬间配平复杂化学方程式（如 `H2 + O2 = H2O`、`Fe + Cl2 = FeCl3`、`KMnO4 + HCl = KCl + MnCl2 + Cl2 + H2O`）。
- **🧪 反应求解器 (Solve)**：内置高频常见无机与有机反应库，输入反应物自动预测生成产物。
- **🏷️ 分子芯片快选**：提供水、双氧水、浓硫酸、氢氧化钠、乙醇等常见化学品快速填充。

### 5. 语言与工程支持
- **🌐 完整中英双语 (EN / 中文)**：全元素译名、拼音、属性参数、详细概述、操作界面及化学术语表（Glossary）全部深度汉化，本地 LocalStorage 状态持久化。
- **🖨️ 高清打印与导出**：支持标准 A4 / A3 纸张规格的高清周期表排版与系统级打印导出。

---

## 🛠️ 技术架构 (Tech Stack)

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **构建框架** | Vite 8.x | 极速热重载、原生 ES Module 规范打包 |
| **核心逻辑** | Native JavaScript (ES6+) | 原生高性能架构，无重型 UI 框架开销 |
| **3D 晶体可视化** | Three.js (r182) | WebGL 硬件加速晶体结构与原子排布渲染 |
| **2D 粒子与原子** | HTML5 Canvas API | 宇宙星际粒子穿梭 (`#space-travel`) 与 Bohr 原子轨道公转 |
| **音频合成** | Web Audio API | 原生双振荡器、双二阶滤波器与实时程序化音频合成 |
| **色彩计算** | Chroma.js | 热力图色阶平滑渐变与数值映射 |
| **样式系统** | Vanilla CSS3 | 严格还原原版 Talbica 现代化深色质感，支持深浅主题切换 |

---

## 📁 目录结构 (Project Structure)

```text
ins-outs/
├── index.html                 # 主入口 HTML 页面与视口布局
├── package.json               # 项目依赖与运行脚本配置
├── Dockerfile                 # 多阶段生产环境 Docker 构建配置
├── compose.yaml               # 容器化编排文件
├── nginx.conf                 # 生产级 Nginx 反向代理与 Gzip 缓存配置
├── README.md                  # 项目官方说明文档
├── docs/                      # 项目文档与维护记录
│   ├── user-guide.md          # 详细操作与功能使用指南
│   └── project-notes.md       # 项目创建与维护记录
├── scripts/                   # 便捷运维与工程脚本
│   ├── install.sh             # 一键环境检查与依赖安装脚本
│   ├── dev.sh                 # 开发环境启动脚本
│   ├── build.sh               # 生产编译打包脚本
│   └── deploy.sh              # 生产预览与 Docker 部署脚本
├── public/                    # 静态多媒体资源
│   └── assets/
│       ├── images/            # 图标与界面素材
│       └── elements/          # 元素实物照片与光谱图资源
└── src/                       # 核心业务源码
    ├── main.js                # 应用启动入口与全局组件编排
    ├── audio/
    │   └── audio-engine.js    # Web Audio API 原生程序化音频引擎
    ├── components/
    │   ├── periodic-table.js  # 周期表核心渲染器（Colors/Photos/Heatmaps）
    │   ├── element-card.js    # 元素多维详情卡片面板
    │   ├── bohr-model.js      # 2D Bohr 动态电子云 Canvas 渲染器
    │   ├── three-model.js     # Three.js 3D 晶体/原子点阵视口
    │   ├── smart-field.js     # 智能搜索、高斯消元配平与反应求解器
    │   ├── space-travel.js    # 动态 3D 星际穿越背景画布
    │   ├── header.js          # 顶栏操作、音频控制面板与主题切换
    │   ├── print-dialog.js    # A4/A3 高清周期表打印导出器
    │   └── glossary.js        # 中英双语化学术语表
    ├── data/
    │   ├── elements.js        # 118 种元素全量化学物理属性数据库
    │   ├── media.js           # 元素图片与媒体元数据
    │   ├── translations.js    # 全量中英对照、拼音与术语字典
    │   └── raw/               # 原始数据快照，仅供追溯
    │       ├── elements.js
    │       └── media.js
    └── styles/
        ├── app.css            # 双语、音频、3D 与模态框增强样式
        └── vendor/             # 原版基础样式
            ├── talbica-base.css
            └── talbica-mobile.css
```

---

## 🚀 快速上手 (Quick Start)

### 环境要求
- **Node.js**：v18.0+ 或 v20.0+ (推荐 LTS 版本)
- **npm**：v9.0+ 或更高版本

### 1. 一键安装与启动
```bash
# 赋予脚本执行权限
chmod +x scripts/*.sh

# 执行自动环境检测与依赖安装
./scripts/install.sh

# 启动本地开发服务器
./scripts/dev.sh
```
启动后，在浏览器访问：👉 **http://localhost:5173**

---

### 2. 标准 npm 指令
```bash
# 安装依赖
npm install

# 启动开发服务
npm run dev

# 编译生产包
npm run build

# 本地预览生产构建产物
npm run preview
```

---

### 3. Docker 容器化部署
如果你偏好使用 Docker 部署运行：
```bash
# 一键编译并在后台启动 Docker 容器 (默认端口 8080)
./scripts/deploy.sh docker

# 或者直接使用 Docker Compose：
docker compose up -d --build
```
启动后，在浏览器访问：👉 **http://localhost:8080**

---

## 📖 详细使用指南
关于各类模式的使用细节、高斯配平语法、音频设置和快捷键操作，请参阅：
👉 **[完整使用指南 (docs/user-guide.md)](./docs/user-guide.md)**

---

## 📄 开源许可证与致谢 (License & Acknowledgements)
- 本工程核心算法与双语架构采用 **MIT License** 开源。
- 基础视觉理念与元素公开属性数据致敬原作者 [Talbica](https://www.talbica.com/)。
