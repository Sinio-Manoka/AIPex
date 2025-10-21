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

class ProviderManager {
  private providers: Provider[] = [];
  private providerKeys: Map<string, string> = new Map();
  private providerModels: Map<string, string[]> = new Map();
  private storage: Storage;

  constructor() {
    this.storage = new Storage();
  }

  async loadProviders(): Promise<Provider[]> {
    try {
      // Use the imported providers configuration directly
      this.providers = providersConfig.providers;

      // Load saved API keys from storage
      await this.loadProviderKeys();

      return this.providers;
    } catch (error) {
      console.error('Failed to load providers:', error);
      return [];
    }
  }

  async loadProviderKeys(): Promise<void> {
    try {
      for (const provider of this.providers) {
        const key = await this.getProviderKeyFromStorage(provider.name);
        if (key) {
          this.providerKeys.set(provider.name, key);
        }
      }
    } catch (error) {
      console.error('Failed to load provider keys:', error);
    }
  }

  async getProviderKeyFromStorage(providerName: string): Promise<string | null> {
    try {
      const key = await this.storage.get<string>(`provider_${providerName}_key`);
      return key || null;
    } catch (error) {
      console.error(`Failed to get key for ${providerName}:`, error);
      return null;
    }
  }

  async saveProviderKey(providerName: string, apiKey: string): Promise<void> {
    try {
      await this.storage.set(`provider_${providerName}_key`, apiKey);
      this.providerKeys.set(providerName, apiKey);
    } catch (error) {
      console.error(`Failed to save key for ${providerName}:`, error);
      throw error;
    }
  }

  async deleteProviderKey(providerName: string): Promise<void> {
    try {
      await this.storage.set(`provider_${providerName}_key`, '');
      this.providerKeys.delete(providerName);
      this.providerModels.delete(providerName);
    } catch (error) {
      console.error(`Failed to delete key for ${providerName}:`, error);
      throw error;
    }
  }

  getProviderKey(providerName: string): string | null {
    return this.providerKeys.get(providerName) || null;
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

      // Cache the models
      this.providerModels.set(providerName, models);

      return models;
    } catch (error) {
      console.error(`Failed to fetch models for ${providerName}:`, error);
      throw error;
    }
  }

  getCachedModels(providerName: string): string[] | null {
    return this.providerModels.get(providerName) || null;
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

  clearCache(): void {
    this.providerModels.clear();
  }
}

// Create singleton instance
export const providerManager = new ProviderManager();