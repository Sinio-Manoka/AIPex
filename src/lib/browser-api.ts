/**
 * Browser API abstraction layer for cross-browser compatibility
 * Handles differences between Chrome (chrome.*) and Firefox (browser.*) APIs
 */

// Detect browser type
export const isFirefox = typeof window !== 'undefined' && !!(window as any).browser;
export const isChrome = typeof window !== 'undefined' && !!(window as any).chrome && !(window as any).browser;

// Browser API abstraction
export const browserAPI = {
  // Core APIs
  runtime: (globalThis as any).browser?.runtime || (globalThis as any).chrome?.runtime,
  tabs: (globalThis as any).browser?.tabs || (globalThis as any).chrome?.tabs,
  windows: (globalThis as any).browser?.windows || (globalThis as any).chrome?.windows,
  storage: (globalThis as any).browser?.storage || (globalThis as any).chrome?.storage,

  // Extension APIs
  action: (globalThis as any).browser?.action || (globalThis as any).chrome?.action,
  sidebarAction: (globalThis as any).browser?.sidebarAction || (globalThis as any).chrome?.sidebarAction,
  sidePanel: (globalThis as any).browser?.sidePanel || (globalThis as any).chrome?.sidePanel,

  // Browser-specific APIs
  scripting: (globalThis as any).browser?.scripting || (globalThis as any).chrome?.scripting,
  bookmarks: (globalThis as any).browser?.bookmarks || (globalThis as any).chrome?.bookmarks,
  history: (globalThis as any).browser?.history || (globalThis as any).chrome?.history,
  downloads: (globalThis as any).browser?.downloads || (globalThis as any).chrome?.downloads,
  contextMenus: (globalThis as any).browser?.contextMenus || (globalThis as any).chrome?.contextMenus,
  commands: (globalThis as any).browser?.commands || (globalThis as any).chrome?.commands,
  management: (globalThis as any).browser?.management || (globalThis as any).chrome?.management,
  sessions: (globalThis as any).browser?.sessions || (globalThis as any).chrome?.sessions,
  browsingData: (globalThis as any).browser?.browsingData || (globalThis as any).chrome?.browsingData,
  search: (globalThis as any).browser?.search || (globalThis as any).chrome?.search,
  tabGroups: (globalThis as any).browser?.tabGroups || (globalThis as any).chrome?.tabGroups,
  tabCapture: (globalThis as any).browser?.tabCapture || (globalThis as any).chrome?.tabCapture,

  // Utility functions
  getURL: (path: string) => {
    const runtime = browserAPI.runtime;
    return runtime?.getURL ? runtime.getURL(path) : path;
  },

  // Browser-specific panel opening
  openPanel: async (tabId?: number) => {
    if (isFirefox && browserAPI.sidebarAction?.open) {
      // Firefox: use sidebarAction
      return browserAPI.sidebarAction.open();
    } else if (isChrome && browserAPI.sidePanel?.open) {
      // Chrome: use sidePanel
      return browserAPI.sidePanel.open({ tabId });
    } else {
      console.warn('Panel opening not supported in this browser');
    }
  }
};

// Export for convenience
export default browserAPI;