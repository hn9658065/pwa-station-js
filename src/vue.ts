/**
 * PWA Station SDK - Vue composable.
 *
 * @example
 * ```ts
 * import { usePWAStation } from 'pwa-station/vue'
 *
 * const { api, ready, init } = usePWAStation()
 * onMounted(() => init())
 * ```
 */
import { ref, type Ref } from 'vue'
import type { ControllerAPI } from './types'
import { createClient } from './client'

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

export { getAPI } from './client'
export type { ControllerAPI, CreateClientOptions } from './types'
