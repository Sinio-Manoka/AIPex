import { Storage } from "~/lib/storage";

// Define providers configuration directly to avoid import issues
const providersConfig = {
  providers: [
    {
      name: "Deepseek",
      url: "https://api.deepseek.com",
      api_key_required: true,
      endpoints: {
        chat: "/chat/completions",
        models: "/models"
      }
    },
    {
      name: "Openai",
      url: "https://api.openai.com/v1",
      api_key_required: true,
      endpoints: {
        chat: "/chat/completions",
        models: "/models"
      }
    }
  ]
};

export interface Provider {
  name: string;
  url: string;
  api_key_required: boolean;
  endpoints: {
    chat: string;
    models: string;
  };
}

export interface ProviderWithKey extends Provider {
  apiKey?: string;
  models?: string[];
}

export interface ProvidersConfig {
  providers: Provider[];
}

// New JSON-based token storage structure
export interface TokenStorage {
  providers: {
    [providerName: string]: {
      apiKey: string;
    };
  };
  defaultProvider?: string;
  defaultModel?: string;
}

class ProviderManager {
  private providers: Provider[] = [];
  private tokenStorage: TokenStorage = { providers: {} };
  private storage: Storage;
  private readonly STORAGE_KEY = "aiTokens";

  constructor() {
    this.storage = new Storage();
  }

  async loadProviders(): Promise<Provider[]> {
    try {
      // Use the imported providers configuration directly
      this.providers = providersConfig.providers;

      // Load token storage from JSON
      await this.loadTokenStorage();

      return this.providers;
    } catch (error) {
      console.error('Failed to load providers:', error);
      return [];
    }
  }

  async loadTokenStorage(): Promise<void> {
    try {
      const stored = await this.storage.get<TokenStorage>(this.STORAGE_KEY);
      if (stored) {
        this.tokenStorage = stored;
      } else {
        // Initialize empty storage if none exists
        this.tokenStorage = { providers: {} };
      }

      // Migrate old individual keys if they exist
      await this.migrateOldKeys();
    } catch (error) {
      console.error('Failed to load token storage:', error);
      this.tokenStorage = { providers: {} };
    }
  }

  async migrateOldKeys(): Promise<void> {
    let hasMigrated = false;

    for (const provider of this.providers) {
      const oldKey = await this.storage.get<string>(`provider_${provider.name}_key`);
      if (oldKey && !this.tokenStorage.providers[provider.name]) {
        this.tokenStorage.providers[provider.name] = {
          apiKey: oldKey
        };
        hasMigrated = true;

        // Remove old key
        await this.storage.remove(`provider_${provider.name}_key`);
      }
    }

    if (hasMigrated) {
      await this.saveTokenStorage();
    }
  }

  async saveTokenStorage(): Promise<void> {
    try {
      await this.storage.set(this.STORAGE_KEY, this.tokenStorage);
    } catch (error) {
      console.error('Failed to save token storage:', error);
      throw error;
    }
  }

  async saveProviderKey(providerName: string, apiKey: string): Promise<void> {
    try {
      // Initialize provider entry if it doesn't exist
      if (!this.tokenStorage.providers[providerName]) {
        this.tokenStorage.providers[providerName] = { apiKey: '' };
      }

      this.tokenStorage.providers[providerName].apiKey = apiKey;
      await this.saveTokenStorage();
    } catch (error) {
      console.error(`Failed to save key for ${providerName}:`, error);
      throw error;
    }
  }

  async deleteProviderKey(providerName: string): Promise<void> {
    try {
      if (this.tokenStorage.providers[providerName]) {
        delete this.tokenStorage.providers[providerName];
        await this.saveTokenStorage();
      }
    } catch (error) {
      console.error(`Failed to delete key for ${providerName}:`, error);
      throw error;
    }
  }

  getProviderKey(providerName: string): string | null {
    return this.tokenStorage.providers[providerName]?.apiKey || null;
  }

  async fetchModels(providerName: string): Promise<string[]> {
    const provider = this.providers.find(p => p.name === providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const apiKey = this.getProviderKey(providerName);
    if (!apiKey && provider.api_key_required) {
      throw new Error(`API key required for ${providerName}`);
    }

    try {
      const modelsUrl = `${provider.url}${provider.endpoints.models}`;
      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data?.map((model: any) => model.id) || [];

      return models;
    } catch (error) {
      console.error(`Failed to fetch models for ${providerName}:`, error);
      throw error;
    }
  }

  getCachedModels(_providerName: string): string[] | null {
    // Models are not cached in token storage anymore - return null to force fresh fetch
    return null;
  }

  getProvidersWithKeys(): ProviderWithKey[] {
    return this.providers.map(provider => ({
      ...provider,
      apiKey: this.getProviderKey(provider.name) || undefined,
      models: this.getCachedModels(provider.name) || undefined,
    }));
  }

  getProviderByName(name: string): Provider | null {
    return this.providers.find(p => p.name === name) || null;
  }

  // New methods for managing default provider/model
  getDefaultProvider(): string | null {
    return this.tokenStorage.defaultProvider || null;
  }

  getDefaultModel(): string | null {
    return this.tokenStorage.defaultModel || null;
  }

  async setDefaultProvider(providerName: string): Promise<void> {
    this.tokenStorage.defaultProvider = providerName;
    await this.saveTokenStorage();
  }

  async setDefaultModel(modelName: string): Promise<void> {
    this.tokenStorage.defaultModel = modelName;
    await this.saveTokenStorage();
  }

  async clearDefaultProvider(): Promise<void> {
    delete this.tokenStorage.defaultProvider;
    delete this.tokenStorage.defaultModel;
    await this.saveTokenStorage();
  }

  clearCache(): void {
    // No caching in token storage anymore - models are fetched fresh each time
  }
}

// Create singleton instance
export const providerManager = new ProviderManager();