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
    if (!options?.debug && typeof window !== 'undefined' && window.ControllerAPI) {
      _api = window.ControllerAPI
    }
    else if (typeof window !== 'undefined' && window.PWAStation) {
      _api = window.PWAStation.createClient({ debug: options?.debug ?? true })
    }
    else {
      const { createDebugClient } = await import('./debug')
      _api = createDebugClient()
    }

    await _api.sqlite.open('default')
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
