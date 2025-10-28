import { Storage } from "~/lib/storage"
import { providerManager } from "~/lib/services/provider-manager"

/**
 * Get a value from storage
 */
export async function getStorageValue(key: string): Promise<{ success: boolean; value?: any; error?: string }> {
  try {
    const storage = new Storage()
    const value = await storage.get(key)
    return { success: true, value }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Set a value in storage
 */
export async function setStorageValue(key: string, value: any): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = new Storage()
    await storage.set(key, value)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Remove a value from storage
 */
export async function removeStorageValue(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = new Storage()
    await storage.remove(key)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get all storage keys
 */
export async function getAllStorageKeys(): Promise<{ success: boolean; keys?: string[]; error?: string }> {
  try {
    const storage = new Storage()
    const keys = await storage.getAll()
    return { success: true, keys: Object.keys(keys) }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Clear all storage
 */
export async function clearAllStorage(): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = new Storage()
    await storage.clear()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get extension settings
 */
export async function getExtensionSettings(): Promise<{
  success: boolean
  settings?: {
    aiHost?: string
    aiToken?: string
    aiModel?: string
    theme?: string
    language?: string
    autoOrganize?: boolean
    notifications?: boolean
  }
  error?: string
}> {
  try {
    const storage = new Storage()
    const settings = await storage.getAll()

    return {
      success: true,
      settings: {
        aiHost: settings.aiHost,
        aiToken: settings.aiToken,
        aiModel: settings.aiModel,
        theme: settings.theme,
        language: settings.language,
        autoOrganize: Boolean(settings.autoOrganize === 'true' || settings.autoOrganize),
        notifications: Boolean(settings.notifications === 'true' || settings.notifications)
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Update extension settings
 */
export async function updateExtensionSettings(updates: {
  aiHost?: string
  aiToken?: string
  aiModel?: string
  theme?: string
  language?: string
  autoOrganize?: boolean
  notifications?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = new Storage()

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await storage.set(key, value)
      }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get AI configuration
 * 优先级：存储配置 > 环境变量 > 默认值
 */
export async function getAiConfig(): Promise<{
  success: boolean
  config?: {
    host: string
    model: string
    hasToken: boolean
  }
  error?: string
}> {
  try {
    // Get configuration from ProviderManager
    const defaultProvider = providerManager.getDefaultProvider();
    const provider = defaultProvider ? providerManager.getProviderByName(defaultProvider) : null;
    const aiToken = defaultProvider ? providerManager.getProviderKey(defaultProvider) : null;
    const aiModel = providerManager.getDefaultModel();

    // Fallback to legacy storage for backward compatibility
    const storage = new Storage();
    const legacyHost = (await storage.get("aiHost")) ||
      process.env.AI_HOST ||
      "https://api.openai.com/v1/chat/completions";

    const legacyModel = (await storage.get("aiModel")) ||
      process.env.AI_MODEL ||
      "gpt-3.5-turbo";

    return {
      success: true,
      config: {
        host: provider ? `${provider.url}${provider.endpoints.chat}` : legacyHost,
        model: aiModel || legacyModel,
        hasToken: !!aiToken
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Set AI configuration
 */
export async function setAiConfig(config: {
  host?: string
  token?: string
  model?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // For backward compatibility, still set legacy storage
    const storage = new Storage()

    if (config.host) await storage.set("aiHost", config.host)
    if (config.token) await storage.set("aiToken", config.token)
    if (config.model) await storage.set("aiModel", config.model)

    // Also update provider manager if we have a default provider
    const defaultProvider = providerManager.getDefaultProvider();
    if (defaultProvider) {
      if (config.token) {
        await providerManager.saveProviderKey(defaultProvider, config.token);
      }
      if (config.model) {
        await providerManager.setDefaultModel(config.model);
      }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Remove AI configuration
 */
export async function removeAiConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = new Storage()

    // Remove from legacy storage
    await storage.remove("aiHost")
    await storage.remove("aiToken")
    await storage.remove("aiModel")

    // Also remove from provider manager
    const defaultProvider = providerManager.getDefaultProvider();
    if (defaultProvider) {
      await providerManager.deleteProviderKey(defaultProvider);
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Export storage data
     */
export async function exportStorageData(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const storage = new Storage()
    const allData = await storage.getAll()

    // Remove sensitive data
    const exportData = { ...allData }
    if (exportData.aiToken) {
      exportData.aiToken = "***REDACTED***"
    }

    const data = JSON.stringify(exportData, null, 2)
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Import storage data
 */
export async function importStorageData(jsonData: string): Promise<{ success: boolean; importedKeys?: string[]; error?: string }> {
  try {
    const data = JSON.parse(jsonData)
    const storage = new Storage()
    const importedKeys: string[] = []

    for (const [key, value] of Object.entries(data)) {
      if (value !== "***REDACTED***") { // Skip redacted sensitive data
        await storage.set(key, value)
        importedKeys.push(key)
      }
    }

    return { success: true, importedKeys }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<{
  success: boolean
  stats?: {
    totalKeys: number
    totalSize: number
    largestKey: string
    largestSize: number
  }
  error?: string
}> {
  try {
    const storage = new Storage()
    const allData = await storage.getAll()
    const keys = Object.keys(allData)

    let totalSize = 0
    let largestKey = ""
    let largestSize = 0

    for (const [key, value] of Object.entries(allData)) {
      const size = JSON.stringify(value).length
      totalSize += size

      if (size > largestSize) {
        largestSize = size
        largestKey = key
      }
    }

    return {
      success: true,
      stats: {
        totalKeys: keys.length,
        totalSize,
        largestKey,
        largestSize
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
