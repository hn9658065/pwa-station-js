/**
 * Ensure the PWA Station controller runtime is available in the page.
 *
 * If `window.ControllerAPI` or `window.PWAStation` already exists, resolves
 * immediately. Otherwise, when the page is served under `/apps/<id>/` by the
 * PWA Station controller, injects `/__controller__/api.js` and waits for it
 * to load.
 */
export function ensureControllerRuntime(): Promise<void> {
  return new Promise((resolve, reject) => {
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

    function onLoad() {
      if (window.ControllerAPI || window.PWAStation) {
        resolve()
      }
      else {
        reject(new Error('PWA Station runtime loaded but API not found.'))
      }
    }

    function onError() {
      reject(new Error('Failed to load PWA Station runtime.'))
    }

    if (existing) {
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', onError)
      // In case the script already finished loading before we attached.
      if (window.ControllerAPI || window.PWAStation) {
        resolve()
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
    document.head.appendChild(script)
  })
}
