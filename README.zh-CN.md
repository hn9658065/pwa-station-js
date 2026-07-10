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

onMounted(() => {
  init().then(() => {
    api.value?.sqlite.execute('CREATE TABLE IF NOT EXISTS notes (...)')
  })
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

## 调试模式

调试模式使用 `wa-sqlite`（WebAssembly）和 IndexedDB 模拟 PWA Station 后端。自动启用条件：
- 在 PWA Station 外部运行（无 `window.ControllerAPI`）
- 显式调用 `createClient({ debug: true })`

### 启用调试模式

```ts
import { createClient } from 'pwa-station'

// 显式启用
await createClient({ debug: true })
```

**注意：** 调试模式需要安装 `@journeyapps/wa-sqlite`。

## TypeScript 类型

所有类型均已导出，可用于类型安全：

```ts
import type { ControllerAPI, SqliteResult, FileEntry, NotificationPayload } from 'pwa-station'
```

## 项目结构

```
pwa-station/
├── src/
│   ├── index.ts          # 框架无关核心
│   ├── vue.ts            # Vue 3 组合式函数
│   ├── client.ts         # 客户端工厂
│   ├── debug.ts          # 调试模式实现
│   └── types.ts          # 类型定义
└── dist/                 # 构建输出
    ├── index.mjs/cjs     # 核心包
    ├── vue.mjs/cjs       # Vue 组合式函数
    └── chunks/           # 懒加载调试模块
```

## 许可证

Apache-2.0
