import type { ControllerAPI, CreateClientOptions } from './types'

let _api: ControllerAPI | null = null
let _initPromise: Promise<ControllerAPI> | null = null

/**
 * Production-only client. Resolves from `window.ControllerAPI` or
 * `window.PWAStation.createClient()`. Does NOT fall back to debug mode,
 * so the wa-sqlite wasm is never loaded.
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
      throw new Error(
        'PWA Station runtime not found. ' +
        'This is the production build of pwa-station. ' +
        'Use the development build or install the full package to enable debug mode.',
      )
    }

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
