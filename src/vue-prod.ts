/**
 * PWA Station SDK - Vue composable (production-only).
 *
 * This entry does NOT include debug fallback code. It only resolves the
 * ControllerAPI from `window.ControllerAPI` or `window.PWAStation.createClient()`.
 */
import { ref, type Ref } from 'vue'
import type { ControllerAPI } from './types'
import { createClient } from './prod-client'

export function usePWAStation(): {
  api: Ref<ControllerAPI | null>
  ready: Ref<boolean>
  init: () => Promise<void>
} {
  const api = ref<ControllerAPI | null>(null)
  const ready = ref(false)

  async function init() {
    const client = await createClient()
    api.value = client
    ready.value = true
  }

  return { api, ready, init }
}

export { getAPI } from './prod-client'
export type { ControllerAPI, CreateClientOptions } from './types'
