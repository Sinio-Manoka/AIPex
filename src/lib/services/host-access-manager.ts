import { Storage } from "~/lib/storage"

export type HostAccessMode = "whitelist" | "blocklist" | "include-all"

export interface HostAccessConfig {
    mode: HostAccessMode
    whitelist: string[]
    blocklist: string[]
}

export class HostAccessManager {
    private static instance: HostAccessManager
    private config: HostAccessConfig
    private storage: Storage

    private constructor() {
        this.storage = new Storage()
        this.config = {
            mode: "include-all",
            whitelist: [],
            blocklist: []
        }
    }

    public static getInstance(): HostAccessManager {
        if (!HostAccessManager.instance) {
            HostAccessManager.instance = new HostAccessManager()
            // Force load configuration from file on first initialization
            HostAccessManager.instance.forceReloadFromFile().catch(e => {
                console.warn("Failed to force reload config on initialization:", e)
            })
        }
        return HostAccessManager.instance
    }

    /**
     * Load configuration from file first, fallback to storage
     */
    private async loadConfig(): Promise<HostAccessConfig> {
        // Try to load from file first (prioritize current file configuration)
        try {
            const response = await fetch(chrome.runtime.getURL('host-access-config.json'))
            const fileConfig = await response.json()
            console.log('🔍 [DEBUG] Loaded config from file:', fileConfig)
            this.config = fileConfig

            // Update storage to match file configuration
            await this.storage.set("hostAccessConfig", fileConfig)

            return this.config
        } catch (e) {
            console.warn("Failed to load host access config from file:", e)
        }

        // Fallback to storage if file loading fails
        try {
            const storedConfig = await this.storage.get("hostAccessConfig")
            if (storedConfig) {
                console.log('🔍 [DEBUG] Fallback: Loaded config from storage:', storedConfig)
                this.config = storedConfig as HostAccessConfig
                return this.config
            }
        } catch (e) {
            console.warn("Failed to load host access config from storage:", e)
        }

        // Keep the default config that was set in constructor
        console.log('🔍 [DEBUG] Using default config:', this.config)
        return this.config
    }

    /**
     * Save configuration to storage
     */
    public async saveConfig(config: HostAccessConfig): Promise<void> {
        this.config = config
        await this.storage.set("hostAccessConfig", config)
    }

    /**
     * Extract hostname from URL
     */
    private extractHostname(url: string): string | null {
        try {
            const urlObj = new URL(url)
            return urlObj.hostname.toLowerCase()
        } catch (e) {
            console.warn("Invalid URL:", url)
            return null
        }
    }

    /**
     * Check if a host is allowed based on current configuration
     */
    public async isHostAllowed(url: string): Promise<{ allowed: boolean; reason?: string }> {
        const config = await this.loadConfig()
        const hostname = this.extractHostname(url)

        console.log('🔍 [DEBUG] Host access check:', { url, hostname, config })

        if (!hostname) {
            return { allowed: false, reason: "Invalid URL" }
        }

        switch (config.mode) {
            case "include-all":
                return { allowed: true }

            case "whitelist":
                const isWhitelisted = config.whitelist.some(allowedHost => {
                    const normalizedAllowed = allowedHost.toLowerCase()

                    // Handle wildcard patterns (*.domain.com)
                    if (normalizedAllowed.startsWith('*.')) {
                        const domain = normalizedAllowed.slice(2) // Remove '*.'
                        const matches = hostname === domain || hostname.endsWith('.' + domain)
                        console.log('🔍 [DEBUG] Whitelist wildcard match:', { allowedHost, normalizedAllowed, domain, hostname, matches })
                        return matches
                    }

                    // Exact match or subdomain match for non-wildcard entries
                    const matches = hostname === normalizedAllowed || hostname.endsWith('.' + normalizedAllowed)
                    console.log('🔍 [DEBUG] Whitelist exact match:', { allowedHost, normalizedAllowed, hostname, matches })
                    return matches
                })
                console.log('🔍 [DEBUG] Whitelist final result:', { hostname, whitelist: config.whitelist, isWhitelisted })
                return {
                    allowed: isWhitelisted,
                    reason: isWhitelisted ? undefined : `Access denied: ${hostname} is not allowed`
                }

            case "blocklist":
                const isBlocked = config.blocklist.some(blockedHost => {
                    const normalizedBlocked = blockedHost.toLowerCase()

                    // Handle wildcard patterns (*.domain.com)
                    if (normalizedBlocked.startsWith('*.')) {
                        const domain = normalizedBlocked.slice(2) // Remove '*.'
                        return hostname === domain || hostname.endsWith('.' + domain)
                    }

                    // Exact match or subdomain match for non-wildcard entries
                    return hostname === normalizedBlocked || hostname.endsWith('.' + normalizedBlocked)
                })
                return {
                    allowed: !isBlocked,
                    reason: isBlocked ? `Access denied: ${hostname} is blocked` : undefined
                }

            default:
                return { allowed: false, reason: "Invalid configuration mode" }
        }
    }

    /**
     * Get current configuration
     */
    public async getConfig(): Promise<HostAccessConfig> {
        return await this.loadConfig()
    }

    /**
     * Update configuration
     */
    public async updateConfig(updates: Partial<HostAccessConfig>): Promise<void> {
        const currentConfig = await this.loadConfig()
        const newConfig = { ...currentConfig, ...updates }
        await this.saveConfig(newConfig)
    }

    /**
     * Force reload configuration from file, ignoring storage
     */
    public async forceReloadFromFile(): Promise<HostAccessConfig> {
        try {
            const response = await fetch(chrome.runtime.getURL('host-access-config.json'))
            const fileConfig = await response.json()
            console.log('🔄 [DEBUG] Force reloaded config from file:', fileConfig)
            this.config = fileConfig

            // Also update storage to match file configuration
            await this.storage.set("hostAccessConfig", fileConfig)

            return this.config
        } catch (e) {
            console.error("Failed to force reload host access config from file:", e)
            return this.config
        }
    }

    /**
     * Clear stored configuration and reload from file
     */
    public async clearStorageAndReload(): Promise<HostAccessConfig> {
        try {
            await this.storage.remove("hostAccessConfig")
            console.log('🗑️ [DEBUG] Cleared host access config from storage')
        } catch (e) {
            console.warn("Failed to clear host access config from storage:", e)
        }

        return await this.forceReloadFromFile()
    }
}

export const hostAccessManager = HostAccessManager.getInstance()