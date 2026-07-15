/**
 * Ensure the PWA Station controller runtime is available in the page.
 *
 * If `window.ControllerAPI` or `window.PWAStation` already exists, resolves
 * immediately. Otherwise, when the page is served under `/apps/<id>/` by the
 * PWA Station controller, injects `/__controller__/api.js` and waits for it
 * to load.
 *
 * Note: callers should skip this entirely in debug mode (see
 * `shouldAutoEnableDebug`) so no `/__controller__/api.js` request is made.
 */
export function ensureControllerRuntime(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PWA Station runtime not available in non-browser environment.'))
      return
    }

    if (window.ControllerAPI || window.PWAStation) {
      resolve()
      return
    }

    // Only auto-inject when served by the PWA Station controller.
    if (!location.pathname.startsWith('/apps/')) {
      reject(new Error('PWA Station runtime not found.'))
      return
    }

    const src = '/__controller__/api.js'
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null

    if (existing) {
      attachScriptListeners(existing, resolve, reject)
      // In case the script already finished loading before we attached.
      if (window.ControllerAPI || window.PWAStation)
        resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    attachScriptListeners(script, resolve, reject)
    document.head.appendChild(script)
  })
}

function attachScriptListeners(
  script: HTMLScriptElement,
  resolve: () => void,
  reject: (reason?: unknown) => void,
): void {
  function onLoad() {
    if (window.ControllerAPI || window.PWAStation)
      resolve()
    else
      reject(new Error('PWA Station runtime loaded but API not found.'))
  }

  function onError() {
    reject(new Error('Failed to load PWA Station runtime.'))
  }

  script.addEventListener('load', onLoad)
  script.addEventListener('error', onError)
}

/**
 * Whether debug mode should be auto-enabled.
 *
 * Mirrors the heuristic used by the platform's global runtime:
 *  - enabled when `?debug=1` is present in the URL
 *  - enabled on `localhost` / `127.0.0.1` (except the controller's default
 *    port `9753`)
 *  - disabled once the controller has injected its token
 *
 * When true, the SDK resolves to the PWAStation global (debug) or the local
 * debug client and must NOT inject `/__controller__/api.js`.
 */
export function shouldAutoEnableDebug(): boolean {
  if (typeof window === 'undefined' || typeof location === 'undefined')
    return false
  if ((window as Record<string, any>).__CONTROLLER_TOKEN__)
    return false
  try {
    if (new URLSearchParams(location.search).get('debug') === '1')
      return true
  }
  catch {}
  if (location.port === '9753')
    return false
  return location.hostname === 'localhost' || location.hostname === '127.0.0.1'
}
