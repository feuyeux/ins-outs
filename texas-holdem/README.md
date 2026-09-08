# River Club

六人无限注德州扑克。离线 AI 练习 + 自建服务器好友房间。支持 Web、Windows、macOS、Linux、iOS、Android。仅使用虚拟筹码。

## Quick Start

```bash
npm ci
npm run dev        # 网页 http://localhost:5173
npm run server     # 房间服务 0.0.0.0:3001
```

需要 Node.js 22.12+。单人练习不依赖服务器。

## Playing

- 每桌最多 6 人，默认筹码 2,000，盲注 10/20，空位由 AI 补足
- 支持弃牌、过牌、跟注、下注、加注、全下
- 正确处理短码全下、主池与边池、同牌平分
- 行动限时 25 秒，超时自动过牌（无法过牌则弃牌）
- 断线保留座位 60 秒，逾期由 AI 替换
- 手间可补充至 2,000 筹码

**好友牌局**：填写服务器地址，创建房间，把六位房间码发给好友。局域网客户端使用主机实际 IP（如 `http://192.168.0.111:3001`），不能用 `localhost`。

**离线模式**：网页生产构建首次加载后可离线练习。原生客户端随包携带全部素材。

## Self-hosted Deployment

```bash
docker compose up --build -d    # http://localhost:8080
```

公网部署，解析域名并开放 80/443：

```bash
SITE_ADDRESS=poker.example.com HTTP_PORT=80 HTTPS_PORT=443 docker compose up --build -d
```

Caddy 自动申请证书并代理 WebSocket。客户端填写 `https://poker.example.com`。

**环境变量：**

| 变量 | 说明 |
|------|------|
| `SITE_ADDRESS` | 公网域名 |
| `HTTP_PORT` / `HTTPS_PORT` | 端口（默认 80/443） |
| `CORS_ORIGINS` | 限定网页来源，逗号分隔 |

原生客户端的 CORS 来源需包含 `capacitor://localhost`、`https://localhost`、Electron 的 `null`。默认允许所有来源。

服务最多 50 个房间，每连接每 10 秒最多 40 次请求。房间状态在内存中，重启后需重新建桌。`/health` 提供房间数与连接数。

## Development

```bash
npm run typecheck
npm test           # 规则 + 联机测试
npm run build
npx playwright install chromium webkit
npm run test:e2e   # 浏览器 E2E
```

| 模块 | 职责 |
|------|------|
| `shared/` | 规则适配、牌力评估、AI、共享协议 |
| `src/` | React 牌桌与离线 Worker |
| `server/` | Socket.IO 网关、独立房间线程 |
| `desktop/` | Electron 沙箱窗口 |
| `android/` / `ios/` | Capacitor 原生工程 |
| `scripts/` | 素材生成与离线缓存构建 |

规则层使用 `poker-ts` 驱动下注轮次，适配层修正不足额全下的最小加注条件。边池按完整投入独立计算，用 `pokersolver` 比较牌力。客户端只接收自己的底牌与公开信息，服务器按座位隔离去重。

## Platform Builds

### Desktop

```bash
npm run desktop          # 开发模式
npm run desktop:pack     # 打包到 release/
```

macOS 输出 Apple Silicon + Intel DMG；Windows 输出 NSIS 安装器；Linux 输出 AppImage + DEB。

### Android

需要 JDK 21 + Android SDK 36。

```bash
npm run android:debug    # APK: android/app/build/outputs/apk/debug/
```

### iOS

需要 macOS + Xcode。

```bash
npm run ios:simulator    # 模拟器: build/ios/Build/Products/Debug-iphonesimulator/
```

CI 流水线在 `.github/workflows/texas-holdem.yml`，覆盖网页验证、三大桌面系统、Android 调试包和 iOS 模拟器构建。

## Assets

桌布、皮革、纹理、图标和音效由 `scripts/assets.ts` 生成。头像来自 Pravatar，发布前请替换为授权素材。`poker-ts` 与 `pokersolver` 为 MIT 许可。

## License

MIT
