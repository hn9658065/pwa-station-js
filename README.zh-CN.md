# pwa-station

PWA Station SDK — [PWA Station](https://gitee.com/9658065/pwa-station) 平台的浏览器端 SDK，提供 SQLite、文件存储、消息通知和定时任务功能。

**特性：**
- 框架无关核心（无 Vue 依赖）
- Vue 3 组合式函数支持（`pwa-station/vue`）
- 调试模式使用 wa-sqlite + IndexedDB（开发时无需后端）
- 生产模式自动检测平台注入的 API
- 完整的 TypeScript 类型定义

## 安装

```bash
npm install pwa-station
```

### 可选依赖

**调试模式**（不启动 PWA Station 后端进行开发）：

```bash
npm install @journeyapps/wa-sqlite
```

**Vue 3 组合式函数**：

```bash
npm install vue
```

## 快速开始

### 框架无关用法

```ts
import { createClient, getAPI } from 'pwa-station'

await createClient()
const api = getAPI()

// SQLite
await api.sqlite.execute('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)')
await api.sqlite.execute('INSERT INTO notes (body) VALUES (?)', ['Hello World'])
const { rows } = await api.sqlite.execute('SELECT * FROM notes')

// 存储
await api.storage.upload('files/doc.txt', new Blob(['content']))
const blob = await api.storage.download('files/doc.txt')

// 通知
await api.notifications.send({ title: '提示', body: '操作完成', level: 'success' })
```

### Vue 3 组合式函数

```ts
import { usePWAStation } from 'pwa-station/vue'
import { onMounted } from 'vue'

const { api, ready, init } = usePWAStation()

onMounted(async () => {
  await init()
  await api.value?.sqlite.execute('CREATE TABLE IF NOT EXISTS notes (...)')
})
```

## API 参考

### `createClient(options?)`

创建或返回已有的 ControllerAPI 客户端。

**初始化优先级：**
1. `window.ControllerAPI` — 生产环境由 PWA Station 自动注入
2. `window.PWAStation.createClient()` — 平台运行时模式
3. 调试客户端（`wa-sqlite` + IndexedDB）— 未检测到平台时懒加载

**选项：**
```ts
interface CreateClientOptions {
  debug?: boolean  // 强制启用调试模式
}
```

### `getAPI()`

获取已初始化的 ControllerAPI 实例。若未初始化则抛出错误。

```ts
const api = getAPI()
```

### ControllerAPI

```ts
interface ControllerAPI {
  debug: boolean              // 是否处于调试模式
  app: { id: string }         // 当前应用信息
  token: string               // 授权 Token
  sqlite: SqliteModule        // SQLite 操作
  storage: StorageModule      // 文件存储操作
  notifications: NotificationsModule  // 系统通知
  scheduler: SchedulerModule  // 定时任务
}
```

#### SQLite 模块

```ts
// 打开数据库
await api.sqlite.open('mydb')

// 执行 SQL
const { rows, changes } = await api.sqlite.execute('SELECT * FROM notes')

// 批量执行
const results = await api.sqlite.batch(
  ['INSERT INTO notes (body) VALUES (?)', 'INSERT INTO notes (body) VALUES (?)'],
  [['First'], ['Second']]
)
```

#### 存储模块

```ts
// 上传文件
await api.storage.upload('path/to/file.txt', fileBlob)

// 下载文件
const blob = await api.storage.download('path/to/file.txt')

// 列出文件
const entries = await api.storage.list('path/to/dir')

// 删除文件
await api.storage.remove('path/to/file.txt')

// 创建目录
await api.storage.mkdir('path/to/dir')

// 移动/重命名文件
await api.storage.move('path/from.txt', 'path/to.txt')
```

#### 通知模块

```ts
await api.notifications.send({
  title: '任务完成',
  body: '数据已同步',
  level: 'success',  // 'info' | 'success' | 'warning' | 'error'
  link: '/dashboard'
})
```

#### 定时任务模块

```ts
// 创建定时任务
await api.scheduler.create({
  name: 'Daily Sync',
  type: 'notification',
  schedule: {
    type: 'interval',
    interval: 86400  // 秒
  },
  payload: { title: '同步提醒', body: '每日同步时间到' },
  enabled: true
})

// 列出任务
const tasks = await api.scheduler.list()

// 删除任务
await api.scheduler.remove(taskId)
```

## 开发版与生产版

本包提供两个构建版本：

| 入口 | 导入路径 | 是否包含调试模式 | 是否加载 wa-sqlite wasm |
|---|---|---|---|
| `dist/index.mjs` / `dist/index.cjs` | `pwa-station` | ✅ 是 | 仅使用 SQLite 时 |
| `dist/prod.mjs` / `dist/prod.cjs` | `pwa-station/prod` | ❌ 否 | ❌ 永不 |
| `dist/vue-prod.mjs` / `dist/vue-prod.cjs` | `pwa-station/vue-prod` | ❌ 否 | ❌ 永不 |

### Vite 推荐用法

Vite **不会**根据 `--mode production` 自动切换 npm 包的条件导出。生产构建请使用显式子路径：

```ts
// Vite 开发：可用调试回退
import { createClient } from 'pwa-station'

// Vite 生产构建：精简版，不含 wa-sqlite
import { createClient } from 'pwa-station/prod'

// Vue 3 生产构建
import { usePWAStation } from 'pwa-station/vue-prod'
```

### 条件导出

如果你的打包工具支持 Node.js 条件导出（如配置过的 Rollup、Node 本身），也可以使用 `production` 和 `development` 条件。

如果你希望 Vite 自动解析 `production` 条件，可以在 `vite.config.ts` 中配置：

```ts
export default defineConfig({
  resolve: {
    conditions: ['production'], // 开发环境可改为 ['development']
  },
})
```

## 在 Vite 中使用

如果你之前通过本地 link（例如 `link:../../sdk`）引用 SDK，改为 npm 包后建议清理 Vite 配置：

```ts
// vite.config.ts
export default defineConfig({
  // 使用 npm 包后不再需要
  // optimizeDeps: { exclude: ['pwa-station'] },
  // server: { fs: { allow: ['.', '../../sdk'] } },

  // 调试模式下使用 SQLite 时仍然需要
  assetsInclude: ['**/*.wasm'],
})
```

```json
// package.json
{
  "dependencies": {
    "pwa-station": "^0.1.0"
  },
  "devDependencies": {
    "@journeyapps/wa-sqlite": "^1.7.0"
  }
}
```

`@journeyapps/wa-sqlite` 仅在调试模式下使用 SQLite 时才需要；纯生产构建可以省略。

## 调试模式

调试模式使用 IndexedDB 模拟 PWA Station 后端。仅在 `development` 构建中可用，自动启用条件：
- 在 PWA Station 外部运行（无 `window.ControllerAPI`）
- 显式调用 `createClient({ debug: true })`

```ts
import { createClient } from 'pwa-station'

await createClient({ debug: true })
```

### 调试模式中的 SQLite

调试模式中的 SQLite 支持是**可选且懒加载**的。只有调用 `api.sqlite.open/execute/batch` 时才会加载 `wa-sqlite`。

如果**不使用** SQLite，则无需安装 `@journeyapps/wa-sqlite`。

如果使用 SQLite，请将其作为开发依赖安装到你的项目中：

```bash
npm install -D @journeyapps/wa-sqlite
```

`pwa-station` 将 `@journeyapps/wa-sqlite` 声明为**可选的 peer dependency**，因此它不会随 `pwa-station` 自动安装。只有你需要在调试模式下使用 SQLite 时才需要手动添加。由于它仅用于本地调试，安装在 `devDependencies` 中是合适的。

```ts
import { createClient } from 'pwa-station'

await createClient({ debug: true })

// SQLite 开箱即用
await api.sqlite.open('mydb')
await api.sqlite.execute('CREATE TABLE foo (bar TEXT)')
```

SDK 会自动解析 wasm 文件：优先尝试默认的 `import.meta.url` 解析，失败时（如 Vite dev server）自动回退到 CDN。

### 自定义 wasm URL

如果需要覆盖 wasm 加载位置（如内网环境，或通过 Vite 打包到产物中）：

```ts
import { createClient } from 'pwa-station'
import wasmUrl from '@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm?url'

await createClient({ debug: true, wasmUrl })
```

## TypeScript 类型

所有类型均已导出，可用于类型安全：

```ts
import type { ControllerAPI, SqliteResult, FileEntry, NotificationPayload } from 'pwa-station'
```

> 为了让 TypeScript 正确解析 `pwa-station/vue` 等子路径导出，请在 `tsconfig.json` 中使用 `"moduleResolution": "bundler"`（配合 Vite 推荐）或 `"node16"`。老旧的 `"node"` 模式无法识别 `exports` 字段。

## 项目结构

```
pwa-station/
├── src/
│   ├── index.ts          # 框架无关核心（含调试回退）
│   ├── prod.ts           # 仅生产环境核心
│   ├── prod-client.ts    # 生产环境客户端工厂
│   ├── vue.ts            # Vue 3 组合式函数（含调试回退）
│   ├── vue-prod.ts       # 仅生产环境 Vue 组合式函数
│   ├── client.ts         # 客户端工厂
│   ├── runtime.ts        # 控制器运行时加载器
│   ├── debug.ts          # 调试模式实现
│   └── types.ts          # 类型定义
└── dist/                 # 构建输出
    ├── index.mjs/cjs     # 核心包
    ├── prod.mjs/cjs      # 仅生产环境核心包
    ├── vue.mjs/cjs       # Vue 组合式函数包
    ├── vue-prod.mjs/cjs  # 仅生产环境 Vue 组合式函数包
    └── chunks/           # 懒加载调试模块
```

## 许可证

Apache-2.0
