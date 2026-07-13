import type { ControllerAPI, FileEntry, NotificationPayload, SchedulerCreatePayload, SqliteResult } from './types'

type SQLiteModule = typeof import('@journeyapps/wa-sqlite')
type SQLiteFactoryType = typeof import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs')['default']
type SQLiteAPI = ReturnType<SQLiteModule['Factory']>

// CDN fallback for wasm file (last resort when all local resolution fails).
const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm'

/**
 * Fetch the wasm binary as an ArrayBuffer.
 *
 * The problem: wa-sqlite-async.mjs resolves its wasm via
 * `new URL('.', import.meta.url)`. When Vite pre-bundles this package,
 * `import.meta.url` points into `.vite/deps/` where the wasm isn't served,
 * and the SPA fallback returns index.html instead — causing
 * WebAssembly instantiation to fail.
 *
 * Solution: We fetch the wasm binary ourselves and inject it as `wasmBinary`
 * directly into the Emscripten Module. This bypasses wa-sqlite's internal
 * `locateFile` / `fetch` logic entirely, and the URL resolution is done by
 * *this* module's `import.meta.url` (which Vite correctly rewrites).
 *
 * Resolution order:
 * 1. User-supplied `wasmUrl`
 * 2. Derive from this module's `import.meta.url` (works in Vite dev & most bundlers)
 * 3. CDN fallback
 */
async function fetchWasmBinary(wasmUrl?: string): Promise<ArrayBuffer> {
  const urls: string[] = []

  // Strategy 1: user-supplied URL
  if (wasmUrl) {
    urls.push(wasmUrl)
  }

  // Strategy 2: derive from this module's URL (Vite rewrites it correctly)
  urls.push(new URL(
    '@journeyapps/wa-sqlite/dist/wa-sqlite-async.wasm',
    import.meta.url,
  ).href)

  // Strategy 3: CDN
  urls.push(WASM_CDN_URL)

  for (const url of urls) {
    try {
      const resp = await fetch(url)
      if (!resp.ok)
        continue
      const buf = await resp.arrayBuffer()
      const bytes = new Uint8Array(buf)
      // Verify WebAssembly magic number: 0x00 0x61 0x73 0x6D
      if (bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6D) {
        return buf
      }
    }
    catch {
      // try next URL
    }
  }

  throw new Error(
    'Failed to fetch wa-sqlite wasm from all sources. ' +
    'Please pass a valid wasmUrl to createClient() or ensure ' +
    '@journeyapps/wa-sqlite is installed.',
  )
}

/**
 * Debug mode SDK implementation using IndexedDB.
 *
 * - SQLite → wa-sqlite (wasm) backed by IndexedDB VFS, loaded on demand
 * - File storage → IndexedDB
 * - Notifications → browser Notification API
 * - Scheduler → in-memory stub (logs only)
 *
 * This module is lazily loaded by `createClient()` only when debug mode is
 * needed, so production apps never ship the wa-sqlite wasm. SQLite support is
 * also lazy: wa-sqlite is loaded only when sqlite.open/execute/batch is called.
 */
export function createDebugClient(wasmUrl?: string): ControllerAPI {
  const IDB_NAME = 'pwa-station-debug'
  const IDB_STORE = 'files'
  const DB_NAME = 'pwa-station-debug.db'

  let sqliteModule: SQLiteModule | null = null
  let sqlite3: SQLiteAPI | null = null
  let db: number | null = null
  let initDbPromise: Promise<number> | null = null

  async function initDB(): Promise<number> {
    if (db)
      return db
    if (initDbPromise)
      return initDbPromise

    initDbPromise = (async (): Promise<number> => {
      try {
        // Load the wasm binary ourselves — avoids wa-sqlite's internal
        // `import.meta.url` resolution which breaks in Vite pre-bundling.
        const [wasmBinary, SQLite, { default: SQLiteESMFactory }, IDBBatchAtomicVFSMod] = await Promise.all([
          fetchWasmBinary(wasmUrl),
          import('@journeyapps/wa-sqlite'),
          import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs'),
          import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js'),
        ])
        sqliteModule = SQLite

        // Inject wasmBinary directly into Emscripten Module — bypasses
        // locateFile / fetch so `import.meta.url` is never used for wasm.
        const module = await (SQLiteESMFactory as SQLiteFactoryType)({
          wasmBinary: new Uint8Array(wasmBinary),
        })

        sqlite3 = SQLite.Factory(module)
        const IDBBatchAtomicVFS = (IDBBatchAtomicVFSMod as any).IDBBatchAtomicVFS
        const vfs = await IDBBatchAtomicVFS.create('pwa-station-debug', module, { idbName: 'pwa-station-debug-db' })
        sqlite3.vfs_register(vfs, true)
        db = await sqlite3.open_v2(DB_NAME)
        return db!
      }
      catch (err) {
        throw new Error(
          `Failed to load @journeyapps/wa-sqlite. ` +
          `If you use SQLite in debug mode, install the package and pass wasmUrl if your bundler requires it. ` +
          `Original error: ${err}`,
        )
      }
    })()

    return initDbPromise
  }

  async function runSQL(sql: string, params?: any[]): Promise<SqliteResult> {
    const database = await initDB()
    if (!sqlite3)
      throw new Error('SQLite not initialized')

    const result: SqliteResult = { rows: null, changes: 0 }
    let statementIndex = 0

    for await (const stmt of sqlite3.statements(database, sql)) {
      if (statementIndex === 0 && params?.length)
        sqlite3.bind_collection(stmt, params)

      const columns = sqlite3.column_names(stmt)
      const isSelect = columns.length > 0

      if (isSelect) {
        const rows: Record<string, any>[] = []
        while (await sqlite3.step(stmt) === sqliteModule!.SQLITE_ROW) {
          const row: Record<string, any> = {}
          for (let i = 0; i < columns.length; i++)
            row[columns[i]] = sqlite3.column(stmt, i)
          rows.push(row)
        }
        result.rows = rows
        result.changes = 0
      }
      else {
        await sqlite3.step(stmt)
        result.changes = sqlite3.changes(database)
      }

      statementIndex++
    }

    return result
  }

  function openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const idb = req.result
        if (!idb.objectStoreNames.contains(IDB_STORE))
          idb.createObjectStore(IDB_STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  // eslint-disable-next-line no-console
  console.log('[PWAStation] 调试模式已启用 - SQLite 使用 wa-sqlite + IndexedDB，文件存储使用 IndexedDB')

  return {
    debug: true,
    app: { id: 'pwa-station-debug' },
    token: 'debug-token',
    sqlite: {
      async open(_db?: string) {
        await initDB()
        return { db: _db || 'default', path: DB_NAME }
      },
      async execute(sql: string, params?: any[], _db?: string) {
        return runSQL(sql, params)
      },
      async batch(sqls: string[], params?: any[][], _db?: string) {
        const results: SqliteResult[] = []
        for (let i = 0; i < sqls.length; i++) {
          const p = params?.length === sqls.length ? params[i] : params?.length === 1 ? params[0] : []
          results.push(await runSQL(sqls[i], p))
        }
        return results
      },
    },
    storage: {
      async upload(path: string, file: Blob | File) {
        const idb = await openIDB()
        return new Promise((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite')
          tx.objectStore(IDB_STORE).put(file, path)
          tx.oncomplete = () => resolve({ path, size: file.size })
          tx.onerror = () => reject(tx.error)
        })
      },
      async download(path: string) {
        const idb = await openIDB()
        return new Promise<Blob>((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly')
          const req = tx.objectStore(IDB_STORE).get(path)
          req.onsuccess = () => resolve(req.result || new Blob())
          req.onerror = () => reject(req.error)
        })
      },
      async list(_path?: string, _recursive?: boolean) {
        const idb = await openIDB()
        return new Promise<FileEntry[]>((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readonly')
          const req = tx.objectStore(IDB_STORE).getAllKeys()
          req.onsuccess = () => {
            const keys = (req.result as string[]).map(k => ({
              name: k.split('/').pop() || k,
              path: k,
              size: 0,
              is_dir: false,
              mtime: Date.now(),
            }))
            resolve(keys)
          }
          req.onerror = () => reject(req.error)
        })
      },
      async remove(path: string) {
        const idb = await openIDB()
        return new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(IDB_STORE, 'readwrite')
          tx.objectStore(IDB_STORE).delete(path)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      },
      async mkdir(_path: string) {
        return { path: _path }
      },
      async move(from: string, to: string) {
        const blob = await this.download(from)
        await this.upload(to, blob)
        await this.remove(from)
        return { from, to }
      },
    },
    notifications: {
      async send(payload: NotificationPayload) {
        // eslint-disable-next-line no-console
        console.log('[Debug Notification]', payload)
        if ('Notification' in window && Notification.permission === 'granted') {
          // eslint-disable-next-line no-new
          new Notification(payload.title, { body: payload.body })
        }
      },
    },
    scheduler: {
      async create(_task: SchedulerCreatePayload) {
        // eslint-disable-next-line no-console
        console.log('[Debug Scheduler] create', _task)
        return { id: Date.now() }
      },
      async list() {
        return []
      },
      async update() {},
      async remove() {},
      async runNow() {},
    },
  }
}
