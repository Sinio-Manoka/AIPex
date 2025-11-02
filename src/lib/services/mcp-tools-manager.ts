import { Storage } from "~/lib/storage";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

export interface McpToolConfig {
  name: string;
  host: string;
  headers: Record<string, string>;
  enabled: boolean;
  description?: string;
}

export interface McpToolsConfig {
  mcpTools: McpToolConfig[];
  defaultTimeout: number;
  retryAttempts: number;
}

export interface McpToolCredentials {
  [toolName: string]: {
    headers: Record<string, string>;
  };
}

class McpToolsManager {
  private config: McpToolsConfig;
  private credentials: McpToolCredentials = {};
  private storage: Storage;
  private readonly CREDENTIALS_STORAGE_KEY = "mcpToolsCredentials";

  constructor() {
    this.storage = new Storage();
    this.config = {
      mcpTools: [],
      defaultTimeout: 30000,
      retryAttempts: 3
    };
  }

  async loadConfig(): Promise<McpToolsConfig> {
    try {
      // Load from JSON file first (static config)
      const staticConfig = await this.loadStaticConfig();

      // Load dynamic credentials from storage
      await this.loadCredentials();

      // Merge static config with stored credentials
      this.config = {
        ...staticConfig,
        mcpTools: staticConfig.mcpTools.map(tool => ({
          ...tool,
          headers: {
            ...tool.headers,
            ...this.credentials[tool.name]?.headers
          }
        }))
      };

      return this.config;
    } catch (error) {
      console.error('Failed to load MCP tools config:', error);
      return this.config;
    }
  }

  private async loadStaticConfig(): Promise<McpToolsConfig> {
    try {
      // Import the JSON config file
      const configModule = await import("../../../mcp-tools-config.json");
      return configModule.default as McpToolsConfig;
    } catch (error) {
      console.error('Failed to load static MCP config:', error);
      return {
        mcpTools: [],
        defaultTimeout: 30000,
        retryAttempts: 3
      };
    }
  }

  private async loadCredentials(): Promise<void> {
    try {
      const stored = await this.storage.get<McpToolCredentials>(this.CREDENTIALS_STORAGE_KEY);
      if (stored) {
        this.credentials = stored;
      }
    } catch (error) {
      console.error('Failed to load MCP credentials:', error);
      this.credentials = {};
    }
  }

  async saveCredentials(): Promise<void> {
    try {
      await this.storage.set(this.CREDENTIALS_STORAGE_KEY, this.credentials);
    } catch (error) {
      console.error('Failed to save MCP credentials:', error);
      throw error;
    }
  }

  async updateToolCredentials(toolName: string, headers: Record<string, string>): Promise<void> {
    try {
      if (!this.credentials[toolName]) {
        this.credentials[toolName] = { headers: {} };
      }

      this.credentials[toolName].headers = { ...this.credentials[toolName].headers, ...headers };
      await this.saveCredentials();

      // Reload config to apply changes
      await this.loadConfig();
    } catch (error) {
      console.error(`Failed to update credentials for ${toolName}:`, error);
      throw error;
    }
  }

  getToolConfig(toolName: string): McpToolConfig | null {
    return this.config.mcpTools.find(tool => tool.name === toolName) || null;
  }

  getEnabledTools(): McpToolConfig[] {
    return this.config.mcpTools.filter(tool => tool.enabled);
  }

  getAllTools(): McpToolConfig[] {
    return this.config.mcpTools;
  }

  async makeMcpRequest(toolName: string, method: string, params: any = {}): Promise<any> {
    const toolConfig = this.getToolConfig(toolName);
    if (!toolConfig) {
      throw new Error(`MCP tool ${toolName} not found`);
    }

    if (!toolConfig.enabled) {
      throw new Error(`MCP tool ${toolName} is disabled`);
    }

    let transport: StreamableHTTPClientTransport | null = null;
    let client: Client | null = null;

    try {
      // Create transport with custom headers
      transport = new StreamableHTTPClientTransport(new URL(toolConfig.host), {
        requestInit: {
          headers: toolConfig.headers
        }
      });

      // Create MCP client
      client = new Client({
        name: "AIPex-Extension",
        version: "1.0.0"
      });

      // Connect client to transport
      await client.connect(transport);

      // Use the appropriate MCP client method based on the method parameter
      if (method === 'tools/call') {
        // Extract tool name and arguments from params
        const { name, arguments: args = {} } = params;
        const result = await client.callTool({ name, arguments: args });
        return result;
      } else if (method === 'tools/list') {
        const result = await client.listTools(params);
        return result;
      } else {
        // For other methods, use the generic request method
        const result = await client.request({ method, params });
        return result;
      }
    } catch (error) {
      console.error(`MCP request to ${toolName} failed:`, error);
      throw error;
    } finally {
      // Clean up connections
      try {
        if (client) {
          await client.close();
        }
        if (transport) {
          await transport.close();
        }
      } catch (cleanupError) {
        console.warn('Error during MCP connection cleanup:', cleanupError);
      }
    }
  }

  // Utility method to replace placeholders in headers
  replaceHeaderPlaceholders(headers: Record<string, string>, replacements: Record<string, string>): Record<string, string> {
    const processedHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      let processedValue = value;
      for (const [placeholder, replacement] of Object.entries(replacements)) {
        processedValue = processedValue.replace(`{${placeholder}}`, replacement);
      }
      processedHeaders[key] = processedValue;
    }

    return processedHeaders;
  }

  async setToolEnabled(toolName: string, enabled: boolean): Promise<void> {
    const toolIndex = this.config.mcpTools.findIndex(tool => tool.name === toolName);
    if (toolIndex !== -1) {
      this.config.mcpTools[toolIndex].enabled = enabled;
      // Note: This only affects runtime - static config would need to be updated separately
    }
  }
}

// Create singleton instance
export const mcpToolsManager = new McpToolsManager();