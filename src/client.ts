import { ensureControllerRuntime, shouldAutoEnableDebug } from './runtime'
import type { ControllerAPI, CreateClientOptions } from './types'

let _api: ControllerAPI | null = null
let _initPromise: Promise<ControllerAPI> | null = null

/**
 * Create (or return existing) ControllerAPI client.
 *
 * Resolution order:
 * 1. `window.ControllerAPI` — auto-injected by PWA Station in production
 * 2. `window.PWAStation.createClient()` — platform runtime with debug support
 * 3. `createDebugClient()` — standalone debug mode (wa-sqlite + IndexedDB),
 *    lazily loaded so production apps never ship the wasm binary.
 *
 * The result is cached; calling this multiple times returns the same promise.
 */
export function createClient(options?: CreateClientOptions): Promise<ControllerAPI> {
  if (_initPromise)
    return _initPromise

  _initPromise = (async () => {
    // Debug mode (explicit option or auto-detected). In debug mode we must NOT
    // inject /__controller__/api.js — resolve directly to the PWAStation
    // global (debug) or the local debug client (wa-sqlite + IndexedDB).
    const debug = options?.debug ?? shouldAutoEnableDebug()

    if (!debug) {
      try {
        await ensureControllerRuntime()
      }
      catch {
        // Not running under the PWA Station controller; fall through to
        // PWAStation global or debug mode below.
      }

      if (typeof window !== 'undefined' && window.ControllerAPI) {
        _api = window.ControllerAPI
        return _api
      }
    }

    // Either debug mode, or no controller runtime was found: use the
    // PWAStation global (if present, in debug mode) or the local debug client.
    if (typeof window !== 'undefined' && window.PWAStation) {
      _api = window.PWAStation.createClient({ debug: options?.debug ?? true })
      return _api
    }

    const { createDebugClient } = await import('./debug')
    _api = createDebugClient(options?.wasmUrl)

    return _api
  })()

  return _initPromise
}

/** Get the initialized ControllerAPI instance (throws if not ready). */
export function getAPI(): ControllerAPI {
  if (!_api)
    throw new Error('PWA Station API not initialized. Call createClient() first.')
  return _api
}

/** Reset the client (mainly for testing). */
export function resetClient(): void {
  _api = null
  _initPromise = null
}
