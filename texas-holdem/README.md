# River Club 德州扑克

精致写实的六人无限注德州扑克，支持离线 AI 练习和自建服务器好友房间。界面共用于网页、Windows、macOS、Linux、iOS 和 Android。游戏仅使用虚拟筹码。

## 1. 本地运行

需要 Node.js 22.12 或更新的受支持版本。首次安装后分别启动网页与房间服务：

```bash
npm ci
npm run dev
```

```bash
npm run server
```

网页默认使用 `http://localhost:5173`，端口占用时自动顺延。服务监听 `0.0.0.0:3001`，健康检查为 `/health`。单人练习不依赖服务器。

点击「开始游戏」进入牌局。「好友牌局」中填写服务器地址，创建房间并把六位房间码交给好友。局域网原生客户端使用主机实际 IP，例如 `http://192.168.0.111:3001`，不能使用另一台设备的 `localhost`。异地连接需要公网可达的服务器。

网页通过 HTTPS 或 localhost 运行，确保 Web Crypto、离线缓存和安装能力可用。公网网页连接 HTTPS/WSS 服务。Android、iOS 允许连接自建局域网 HTTP 服务，公网仍建议 HTTPS。

---

## 2. 游戏行为

- 每桌最多六位玩家，默认筹码 2,000，固定盲注 10/20。空位由 AI 补足；房主手动开始下一手。
- 支持弃牌、过牌、跟注、下注、加注与全下，金额按合法范围校验。加注金额表示本轮累计投入。
- 正确处理短码全下、未跟注金额返还、主池与边池、同牌平分和零头筹码顺序。
- 真人在手间替换 AI 入座，加入后点击准备。房主离开时转交给在线真人。
- 行动限时 25 秒，超时自动过牌；无法过牌则弃牌。断线保留座位 60 秒，逾期在手间由 AI 替换。
- 手间可补充至 2,000 筹码，AI 破产后自动补充。不同房间的筹码相互独立。
- 标准与休闲 AI 仅使用自身底牌、公共牌、位置及底池信息，有限采样估算胜率，不访问其他玩家底牌。
- 本机保存昵称、音量、动画偏好、练习速度和最近 50 手结果。服务器重启会结束内存中的房间；不包含账号或跨设备战绩同步。
- 网页生产构建包含离线缓存，首次完整加载后可离线练习。原生客户端随包携带全部素材。

---

## 3. 开发与验证

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

规则测试包括 1,000 手随机对局、重复操作、非法金额、隐藏手牌、边池、短码全下与筹码守恒。联机测试自行启动独立测试服务，模拟六位真人、会话恢复和手间入座。浏览器测试覆盖桌面、手机横竖屏、实际操作和资源加载。测试截图保存在 `test-results/`。

| 模块               | 职责                             |
| ------------------ | -------------------------------- |
| `shared/`          | 规则适配、牌力评估、AI、共享协议 |
| `src/`             | React 牌桌与离线 Worker          |
| `server/`          | Socket.IO 网关、独立房间线程     |
| `desktop/`         | Electron 沙箱窗口                |
| `android/`、`ios/` | Capacitor 原生工程               |
| `scripts/`         | 素材生成与离线缓存构建           |

**规则适配**使用 `poker-ts` 驱动下注轮次、发牌和合法行动，在适配层修正不足额全下后的最小加注和重新开放下注条件。该库原生边池派彩存在跨轮次全下玩家丢失问题，因此按完整投入独立计算底池，使用 `pokersolver` 比较牌力，再写回结算后的筹码。相关行为由回归测试锁定。

客户端只接收自己的底牌与公开信息。`ActionCommand` 包含唯一操作编号和状态版本；服务器按座位隔离去重，拒绝过期或非法操作。洗牌使用安全随机数，AI 在独立线程计算。

---

## 4. 平台构建

### 4.1 桌面

```bash
npm run desktop
npm run desktop:pack
```

安装包输出至 `release/`。macOS 配置 Apple Silicon 与 Intel 的 DMG；Windows 输出 NSIS 安装器；Linux 输出 AppImage 和 DEB。各系统应在对应环境验证。默认构建未进行商店发布或正式代码签名。

### 4.2 Android

需要 JDK 21、Android SDK 36，设置 `JAVA_HOME` 和 `ANDROID_HOME`。

```bash
npm run android:debug
```

调试包：`android/app/build/outputs/apk/debug/app-debug.apk`。在 Android Studio 中打开 `android/` 可配置正式签名、真机调试与 AAB 发布。

### 4.3 iOS

需要 macOS 与支持项目 SDK 的 Xcode。

```bash
npm run ios:simulator
```

模拟器应用：`build/ios/Build/Products/Debug-iphonesimulator/App.app`。真机与 App Store 分发需要在 `ios/App/App.xcodeproj` 中配置 Apple 开发者团队和签名。

仓库根目录 `.github/workflows/texas-holdem.yml` 提供网页验证、三大桌面系统、Android 调试包和 iOS 模拟器构建流水线。流水线只上传构建产物，不发布商店。

---

## 5. 自建部署

安装 Docker 和 Compose 后，在此目录执行：

```bash
docker compose up --build -d
```

默认在 `http://localhost:8080` 同时提供网页与 Socket.IO 服务。好友房间的服务器地址填写同一地址。局域网原生应用可连接此地址；远程浏览器使用下列 HTTPS 配置。

公网部署示例，将域名解析到主机并开放 80/443：

```bash
SITE_ADDRESS=poker.example.com HTTP_PORT=80 HTTPS_PORT=443 docker compose up --build -d
```

Caddy 自动申请证书并代理 WebSocket。客户端填写 `https://poker.example.com`。可用 `CORS_ORIGINS` 限定网页来源，逗号分隔；原生客户端还需加入实际来源，如 `capacitor://localhost`、`https://localhost` 以及 Electron 的 `null` 来源。默认允许来源以方便自建与跨平台使用。

服务日志输出到标准输出，不记录底牌和恢复令牌；`/health` 提供房间数与连接数。默认最多 50 个房间，每连接每 10 秒最多 40 次请求。无玩家的房间自动回收。房间状态存于单进程内存，首版部署单服务实例，重启后需要重新建桌。

---

## 6. 素材与许可

桌布、皮革、背景纹理、应用图标和短音效由 `scripts/assets.ts` 生成。头像下载自 Pravatar 示例头像服务，并随项目打包；可替换为自己的授权头像。依赖保留其许可证，`poker-ts` 与 `pokersolver` 使用 MIT 许可。发布品牌产品前应替换或核验示例头像的使用权。

---

## 7. 本次交付验证

2026-09-07，在 Apple Silicon Mac 上验证：

- 类型检查和生产构建通过；11 项规则测试（包含 1,000 手随机对局）与 2 项多人联机测试通过。
- Chromium 和 WebKit 共 8 项界面测试通过，包含完整对局、设置、历史记录、390/360 像素手机竖屏及手机横屏。
- Chromium 生产构建断网刷新后可重新发牌，120 帧采样的中位数与第 95 百分位帧间隔均约 16.7 毫秒。此数据仅代表当前测试环境。
- Electron macOS 本地启动及发牌通过；Apple Silicon 与 Intel DMG 已生成，Intel 未实机验证。安装包未正式签名或公证。
- Android 调试 APK 构建通过；本机 Android 模拟器未能完成启动，尚未完成原生运行验证。
- iOS 工程与官方依赖已配置；本机 Xcode 缺少匹配的 iOS 26.5 平台与模拟器运行时，构建被系统组件错误阻断，未生成可分发 iOS 包。
- Windows 和 Linux 提供构建配置及 CI；Windows 本机交叉打包因下载依赖网络错误未完成，二者尚未实机验证。
- WebKit 自动化在切换离线后重载报告内部错误，离线测试对该内核显式跳过，不能据此声称 Safari 离线刷新已验证。
- Docker 部署文件已提供，当前环境未安装 Docker，未运行容器验收。正式签名和商店上架未执行。
