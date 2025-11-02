// Example usage of MCP Tools Manager
// This shows how to configure and use MCP tools

import { mcpToolsManager } from "~/lib/services/mcp-tools-manager";

// Initialize MCP tools configuration
export async function initializeMcpTools() {
  try {
    // Load the configuration from the JSON file and merge with stored credentials
    const config = await mcpToolsManager.loadConfig();
    console.log('MCP Tools loaded:', config.mcpTools.map(tool => tool.name));

    return config;
  } catch (error) {
    console.error('Failed to initialize MCP tools:', error);
    throw error;
  }
}

// Example: Update Confluence credentials
export async function updateConfluenceCredentials(encodedCredentials: string, cloudId: string) {
  try {
    // Update the credentials in storage
    await mcpToolsManager.updateToolCredentials('confluence', {
      'Authorization': `Basic ${encodedCredentials}`,
      'X-Atlassian-Cloud-Id': cloudId
    });

    console.log('Confluence credentials updated successfully');
  } catch (error) {
    console.error('Failed to update Confluence credentials:', error);
    throw error;
  }
}

// Example: Make a Confluence API call
export async function testConfluenceConnection() {
  try {
    // This would make a test call to verify the connection
    const result = await mcpToolsManager.makeMcpRequest('confluence', 'confluence_search', {
      query: 'test',
      limit: 1
    });

    console.log('Confluence connection test result:', result);
    return result;
  } catch (error) {
    console.error('Confluence connection test failed:', error);
    throw error;
  }
}

// Example: Get all enabled MCP tools
export function getEnabledMcpTools() {
  return mcpToolsManager.getEnabledTools();
}

// Example: Check if a specific tool is configured
export function isToolConfigured(toolName: string) {
  const tool = mcpToolsManager.getToolConfig(toolName);
  return tool && tool.enabled;
}