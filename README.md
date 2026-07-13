# pwa-station

PWA Station SDK — browser SDK for the [PWA Station](https://gitee.com/9658065/pwa-station) platform, providing SQLite, file storage, notifications, and scheduler capabilities.

**Features:**
- Framework-agnostic core (no Vue dependency)
- Vue 3 composable support (`pwa-station/vue`)
- Debug mode with wa-sqlite + IndexedDB (no backend required for development)
- Production mode auto-detects platform-injected API
- Full TypeScript type definitions

## Installation

```bash
npm install pwa-station
```

### Optional Dependencies

For **debug mode** (development without PWA Station backend):

```bash
npm install @journeyapps/wa-sqlite
```

For **Vue 3 composable**:

```bash
npm install vue
```

## Quick Start

### Framework-agnostic Usage

```ts
import { createClient, getAPI } from 'pwa-station'

await createClient()
const api = getAPI()

// SQLite
await api.sqlite.execute('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT)')
await api.sqlite.execute('INSERT INTO notes (body) VALUES (?)', ['Hello World'])
const { rows } = await api.sqlite.execute('SELECT * FROM notes')

// Storage
await api.storage.upload('files/doc.txt', new Blob(['content']))
const blob = await api.storage.download('files/doc.txt')

// Notifications
await api.notifications.send({ title: '提示', body: '操作完成', level: 'success' })
```

### Vue 3 Composable

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

## API Reference

### `createClient(options?)`

Create or return the existing ControllerAPI client.

**Resolution order:**
1. `window.ControllerAPI` — auto-injected by PWA Station in production
2. `window.PWAStation.createClient()` — platform runtime
3. Debug client (`wa-sqlite` + IndexedDB) — lazily loaded when no platform detected

**Options:**
```ts
interface CreateClientOptions {
  debug?: boolean  // Force debug mode
}
```

### `getAPI()`

Get the initialized ControllerAPI instance. Throws if not initialized.

```ts
const api = getAPI()
```

### ControllerAPI

```ts
interface ControllerAPI {
  debug: boolean              // Whether in debug mode
  app: { id: string }         // Current app info
  token: string               // Authorization token
  sqlite: SqliteModule        // SQLite operations
  storage: StorageModule      // File storage operations
  notifications: NotificationsModule  // System notifications
  scheduler: SchedulerModule  // Scheduled tasks
}
```

#### SQLite Module

```ts
// Open database
await api.sqlite.open('mydb')

// Execute SQL
const { rows, changes } = await api.sqlite.execute('SELECT * FROM notes')

// Batch execute
const results = await api.sqlite.batch(
  ['INSERT INTO notes (body) VALUES (?)', 'INSERT INTO notes (body) VALUES (?)'],
  [['First'], ['Second']]
)
```

#### Storage Module

```ts
// Upload file
await api.storage.upload('path/to/file.txt', fileBlob)

// Download file
const blob = await api.storage.download('path/to/file.txt')

// List files
const entries = await api.storage.list('path/to/dir')

// Remove file
await api.storage.remove('path/to/file.txt')

// Create directory
await api.storage.mkdir('path/to/dir')

// Move/rename file
await api.storage.move('path/from.txt', 'path/to.txt')
```

#### Notifications Module

```ts
await api.notifications.send({
  title: 'Task Completed',
  body: 'Data synchronized',
  level: 'success',  // 'info' | 'success' | 'warning' | 'error'
  link: '/dashboard'
})
```

#### Scheduler Module

```ts
// Create interval task
await api.scheduler.create({
  name: 'Daily Sync',
  type: 'notification',
  schedule: {
    type: 'interval',
    interval: 86400  // seconds
  },
  payload: { title: 'Sync Reminder', body: 'Daily sync time' },
  enabled: true
})

// List tasks
const tasks = await api.scheduler.list()

// Remove task
await api.scheduler.remove(taskId)
```

## Debug Mode

Debug mode uses IndexedDB to simulate the PWA Station backend. It is automatically enabled when:
- Running outside PWA Station (no `window.ControllerAPI`)
- `createClient({ debug: true })` is called explicitly

```ts
import { createClient } from 'pwa-station'

await createClient({ debug: true })
```

### SQLite in Debug Mode

SQLite support in debug mode is **optional and lazy**. `wa-sqlite` is loaded only when you call `api.sqlite.open/execute/batch`.

If you do **not** use SQLite, you do not need to install `@journeyapps/wa-sqlite`.

If you use SQLite, install it as a dev dependency in your project:

```bash
npm install -D @journeyapps/wa-sqlite
```

`pwa-station` declares `@journeyapps/wa-sqlite` as an **optional peer dependency**. It is not installed automatically, so you must add it explicitly when you need SQLite in debug mode. Since it is only used for local debugging, `devDependencies` is the right place for it.

```ts
import { createClient } from 'pwa-station'

await createClient({ debug: true })

// SQLite works out of the box
await api.sqlite.open('mydb')
await api.sqlite.execute('CREATE TABLE foo (bar TEXT)')
```

The SDK automatically resolves the wasm file: it first tries the default `import.meta.url` resolution, and falls back to a CDN if that fails (e.g. in Vite dev server).

### Custom wasm URL

If you need to override the wasm location (e.g. air-gapped environment, or to bundle it with Vite):

```ts
import { createClient } from 'pwa-station'
import wasmUrl from '@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm?url'

await createClient({ debug: true, wasmUrl })
```

## TypeScript Types

All types are exported and can be used for type safety:

```ts
import type { ControllerAPI, SqliteResult, FileEntry, NotificationPayload } from 'pwa-station'
```

## Project Structure

```
pwa-station/
├── src/
│   ├── index.ts          # Framework-agnostic core
│   ├── vue.ts            # Vue 3 composable
│   ├── client.ts         # Client factory
│   ├── debug.ts          # Debug mode implementation
│   └── types.ts          # Type definitions
└── dist/                 # Build output
    ├── index.mjs/cjs     # Core bundle
    ├── vue.mjs/cjs       # Vue composable
    └── chunks/           # Lazy-loaded debug module
```

## License

Apache-2.0
