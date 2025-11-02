import { callMcpTool } from "./index.js"
import { hostAccessManager } from "~/lib/services/host-access-manager"

// Simple MCP-style client that provides tool descriptions and handles tool calls
export class BrowserMcpClient {
  // 硬编码基础工具列表，避免循环依赖
  private baseTools = [
    // Tab Management
    {
      name: "get_all_tabs",
      description: "Get all open tabs across all windows with their IDs, titles, and URLs",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_current_tab",
      description: "Get information about the currently active tab",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "switch_to_tab",
      description: "Switch to a specific tab by ID",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to switch to"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "create_new_tab",
      description: "Create a new tab with the specified URL",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to open in the new tab"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "get_tab_info",
      description: "Get detailed information about a specific tab",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "duplicate_tab",
      description: "Duplicate an existing tab",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to duplicate"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "close_tab",
      description: "Close a specific tab",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to close"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "get_current_tab_content",
      description: "Get the visible text content of the current tab",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // Tab Groups
    {
      name: "organize_tabs",
      description: "Use AI to automatically group tabs by topic/purpose",
      action: true,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "ungroup_tabs",
      description: "Remove all tab groups in the current window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    /*
    {
      name: "get_all_tab_groups",
      description: "Get all tab groups across all windows",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "create_tab_group",
      description: "Create a new tab group with specified tabs",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          tabIds: {
            type: "array",
            items: { type: "number" },
            description: "Array of tab IDs to group"
          }
        },
        required: ["tabIds"]
      }
    },
    {
      name: "update_tab_group",
      description: "Update tab group properties",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          groupId: {
            type: "number",
            description: "The ID of the tab group to update"
          },
          title: {
            type: "string",
            description: "New title for the tab group"
          }
        },
        required: ["groupId"]
      }
    },
    */
    // Bookmarks - 注释掉不太重要的工具
    /*
    {
      name: "get_all_bookmarks",
      description: "Get all bookmarks in a flattened list",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_bookmark_folders",
      description: "Get bookmark folder structure",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "create_bookmark",
      description: "Create a new bookmark",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the bookmark"
          },
          url: {
            type: "string",
            description: "URL of the bookmark"
          }
        },
        required: ["title", "url"]
      }
    },
    {
      name: "delete_bookmark",
      description: "Delete a bookmark by ID",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the bookmark to delete"
          }
        },
        required: ["id"]
      }
    },
    {
      name: "search_bookmarks",
      description: "Search bookmarks by title/URL",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          }
        },
        required: ["query"]
      }
    },
    */
    // History - 注释掉不太重要的工具
    /*
    {
      name: "get_recent_history",
      description: "Get recent browsing history",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "Maximum number of results to return"
          }
        },
        required: []
      }
    },
    {
      name: "search_history",
      description: "Search browsing history",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "delete_history_item",
      description: "Delete a specific history item by URL",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the history item to delete"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "clear_history",
      description: "Clear browsing history for specified days",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days of history to clear"
          }
        },
        required: ["days"]
      }
    },
    */
    // Windows - 注释掉不太重要的工具
    /*
    {
      name: "get_all_windows",
      description: "Get all browser windows",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_current_window",
      description: "Get the current focused window",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "switch_to_window",
      description: "Switch focus to a specific window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "ID of the window to switch to"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "create_new_window",
      description: "Create a new browser window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to open in the new window"
          }
        },
        required: []
      }
    },
    {
      name: "close_window",
      description: "Close a specific window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "ID of the window to close"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "minimize_window",
      description: "Minimize a specific window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "ID of the window to minimize"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "maximize_window",
      description: "Maximize a specific window",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "ID of the window to maximize"
          }
        },
        required: ["windowId"]
      }
    },
    */
    // Page Content
    {
      name: "get_page_metadata",
      description: "Get page metadata including title, description, keywords, etc.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "extract_page_text",
      description: "Extract text content from the current page with word count and reading time",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_page_links",
      description: "Get all links from the current page",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // {
    //   name: "get_page_images",
    //   description: "Get all images from the current page",
    //   action: false,
    //   inputSchema: {
    //     type: "object",
    //     properties: {},
    //     required: []
    //   }
    // },
    {
      name: "search_page_text",
      description: "Search for text on the current page",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text to search for"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_interactive_elements",
      description: "Get all interactive elements (links, buttons, inputs) from the current page with optimized performance",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "click_element",
      description: "Click an element on the current page using its CSS selector",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element to click"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "summarize_page",
      description: "Summarize the current page content with key points and reading statistics",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // Form & Input Management
    {
      name: "fill_input",
      description: "Fill an input field with text using CSS selector",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the input field"
          },
          text: {
            type: "string",
            description: "Text to fill in the input field"
          }
        },
        required: ["selector", "text"]
      }
    },
    {
      name: "clear_input",
      description: "Clear the content of an input field using CSS selector",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the input field"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "get_input_value",
      description: "Get the current value of an input field using CSS selector",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the input field"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "submit_form",
      description: "Submit a form using CSS selector",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the form"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "get_form_elements",
      description: "Get all form elements and their input fields on the current page",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "scroll_to_element",
      description: "Scroll to a DOM element and center it in the viewport",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element to scroll to (e.g., '#my-element', '.content', 'h2')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "highlight_element",
      description: "Permanently highlight DOM elements with drop shadow effect and intelligent auto-color detection for maximum contrast",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element to highlight (e.g., '#my-element', '.content', 'h2')"
          },
          color: {
            type: "string",
            description: "Shadow color (e.g., '#00d4ff', '#ff0066', '#00ff88'). If not specified, automatically selects the highest contrast color based on element's background and text colors for optimal visibility"
          },
          duration: {
            type: "number",
            description: "Duration in milliseconds to show highlight. Default: 0 (permanent highlight)"
          },
          intensity: {
            type: "string",
            enum: ["subtle", "normal", "strong"],
            description: "Shadow intensity: 'subtle' (gentle), 'normal' (default), 'strong' (dramatic)"
          },
          persist: {
            type: "boolean",
            description: "Whether to keep the highlight permanently. Default: true (permanent highlight)"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "highlight_text_inline",
      description: "Highlight specific words or phrases within text content using inline styling (bold + red color)",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element(s) containing the text to search (e.g., 'p', '.content', 'article')"
          },
          searchText: {
            type: "string",
            description: "The text or phrase to highlight within the selected elements"
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether the search should be case sensitive. Default: false"
          },
          wholeWords: {
            type: "boolean",
            description: "Whether to match whole words only. Default: false"
          },
          highlightColor: {
            type: "string",
            description: "Color for the highlighted text. Default: '#DC143C' (crimson red)"
          },
          backgroundColor: {
            type: "string",
            description: "Background color for the highlighted text. Default: 'transparent'"
          },
          fontWeight: {
            type: "string",
            description: "Font weight for the highlighted text. Default: 'bold'"
          },
          persist: {
            type: "boolean",
            description: "Whether to keep the highlights permanently. Default: true"
          }
        },
        required: ["selector", "searchText"]
      }
    },

    // Clipboard - 注释掉不太重要的工具
    /*
    {
      name: "copy_to_clipboard",
      description: "Copy text to clipboard",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to copy to clipboard"
          }
        },
        required: ["text"]
      }
    },
    {
      name: "read_from_clipboard",
      description: "Read text from clipboard",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_current_page_url",
      description: "Copy current page URL to clipboard",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_current_page_title",
      description: "Copy current page title to clipboard",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_selected_text",
      description: "Copy selected text from current page",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_page_as_markdown",
      description: "Copy page content as markdown format",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_page_as_text",
      description: "Copy page content as plain text",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    */
    // Storage - 注释掉不太重要的工具
    /*
    {
      name: "get_storage_data",
      description: "Get data from extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Storage key to retrieve"
          }
        },
        required: ["key"]
      }
    },
    {
      name: "set_storage_data",
      description: "Set data in extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Storage key"
          },
          value: {
            type: "string",
            description: "Value to store"
          }
        },
        required: ["key", "value"]
      }
    },
    {
      name: "remove_storage_data",
      description: "Remove data from extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Storage key to remove"
          }
        },
        required: ["key"]
      }
    },
    {
      name: "clear_storage",
      description: "Clear all extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_storage_keys",
      description: "Get all keys from extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_storage_size",
      description: "Get the size of extension storage",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    */
    // Extensions - 注释掉不太重要的工具
    /*
    {
      name: "get_installed_extensions",
      description: "Get all installed browser extensions",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_extension_info",
      description: "Get detailed information about a specific extension",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "ID of the extension"
          }
        },
        required: ["extensionId"]
      }
    },
    {
      name: "enable_extension",
      description: "Enable a disabled extension",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "ID of the extension to enable"
          }
        },
        required: ["extensionId"]
      }
    },
    {
      name: "disable_extension",
      description: "Disable an enabled extension",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "ID of the extension to disable"
          }
        },
        required: ["extensionId"]
      }
    },
    */
    // Downloads - 注释掉不太重要的工具
    /*
    {
      name: "get_downloads",
      description: "Get all downloads and their status",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "cancel_download",
      description: "Cancel an active download",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "ID of the download to cancel"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "clear_downloads",
      description: "Clear download history",
      action: true,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "open_downloads_folder",
      description: "Open the downloads folder",
      action: true,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    */
    {
      name: "download_text_as_markdown",
      description: "Download text content as a markdown file to the user's local filesystem. Generate a descriptive filename and folder structure based on the content type and purpose.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text content to download as markdown"
          },
          filename: {
            type: "string",
            description: "Descriptive filename for the download (without .md extension). Generate this based on the content type, purpose, or topic. Examples: 'meeting-notes-2024-01-15', 'api-documentation', 'project-summary'. If not provided, a timestamped filename will be generated."
          },
          folderPath: {
            type: "string",
            description: "Optional folder path for organizing downloads based on content type or project (e.g., 'Meeting-Notes/2024', 'Documentation/API', 'Reports/Weekly'). Creates nested folder structure for better organization."
          },
          displayResults: {
            type: "boolean",
            description: "Whether to display the download results with file path and organization summary. Default: true"
          }
        },
        required: ["text"]
      }
    },
    {
      name: "download_image",
      description: "Download an image from base64 data to the user's local filesystem. Generate a descriptive filename and folder structure based on the image content.",
      inputSchema: {
        type: "object",
        properties: {
          imageData: {
            type: "string",
            description: "The base64 image data URL (data:image/...)"
          },
          filename: {
            type: "string",
            description: "Descriptive filename for the download (without extension). Generate this based on the image content or purpose. If not provided, a timestamped filename will be generated."
          },
          folderPath: {
            type: "string",
            description: "Optional folder path for organizing downloads (e.g., 'Screenshots/Website-Analysis', 'AI-Generated/Diagrams'). Creates nested folder structure."
          }
        },
        required: ["imageData"]
      }
    },
    {
      name: "download_chat_images",
      description: "Download multiple images from chat messages to the user's local filesystem. Generate descriptive filenames and folder structure based on the images content and conversation context. Display the download results including file paths and organization.",
      inputSchema: {
        type: "object",
        properties: {
          messages: {
            type: "array",
            description: "Array of chat messages containing images",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Message ID"
                },
                parts: {
                  type: "array",
                  description: "Message parts that may contain images",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        description: "Part type (should be 'image' for image parts)"
                      },
                      imageData: {
                        type: "string",
                        description: "Base64 image data URL"
                      },
                      imageTitle: {
                        type: "string",
                        description: "Descriptive title for the image"
                      }
                    }
                  }
                }
              }
            }
          },
          folderPrefix: {
            type: "string",
            description: "Descriptive folder name for organizing downloads based on conversation context (e.g., 'Website-Analysis-2024', 'AI-Diagrams-Session', 'Screenshots-Research'). If not provided, will generate based on conversation content."
          },
          filenamingStrategy: {
            type: "string",
            description: "Strategy for naming files: 'descriptive' (based on content), 'sequential' (numbered), or 'timestamp' (time-based). Default: 'descriptive'",
            enum: ["descriptive", "sequential", "timestamp"]
          },
          displayResults: {
            type: "boolean",
            description: "Whether to display the download results with file paths and organization summary. Default: true"
          }
        },
        required: ["messages"]
      }
    },

    // Sessions - 注释掉不太重要的工具
    /*
    {
      name: "get_sessions",
      description: "Get all saved browser sessions",
      action: false,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "restore_session",
      description: "Restore a previously saved session",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "ID of the session to restore"
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "delete_session",
      description: "Delete a saved session",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "ID of the session to delete"
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "save_current_session",
      description: "Save the current browser session",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the saved session"
          }
        },
        required: ["name"]
      }
    },
    */
    // Context Menus - 注释掉不太重要的工具
    /*
    {
      name: "create_context_menu_item",
      description: "Create a new context menu item",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique ID for the menu item"
          },
          title: {
            type: "string",
            description: "Title of the menu item"
          },
          contexts: {
            type: "array",
            items: { type: "string" },
            description: "Contexts where the menu item should appear"
          },
          documentUrlPatterns: {
            type: "array",
            items: { type: "string" },
            description: "URL patterns where the menu item should appear"
          }
        },
        required: ["id", "title"]
      }
    },
    {
      name: "update_context_menu_item",
      description: "Update an existing context menu item",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the menu item to update"
          },
          updates: {
            type: "object",
            properties: {
              title: { type: "string" },
              contexts: { type: "array", items: { type: "string" } },
              documentUrlPatterns: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["id", "updates"]
      }
    },
    {
      name: "remove_context_menu_item",
      description: "Remove a context menu item",
      action: true,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the menu item to remove"
          }
        },
        required: ["id"]
      }
    },
    {
      name: "remove_all_context_menu_items",
      description: "Remove all context menu items",
      action: true,
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_context_menu_items",
      description: "Get all context menu items (limited by Chrome API)",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    */
    // Screenshot tools
    {
      name: "capture_screenshot",
      description: "Capture screenshot of current visible tab and return as base64 data URL. Summarize your actions or describe the highlighted sections and generate an image name to display.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "capture_tab_screenshot",
      description: "Capture screenshot of a specific tab by ID. Summarize your actions or describe the highlighted sections and generate an image name to display.",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to capture"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "capture_screenshot_to_clipboard",
      description: "Capture screenshot of current tab and save directly to clipboard. Summarize your actions or describe the highlighted sections and generate an image name to display.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // {
    //   name: "read_clipboard_image",
    //   description: "Read image from clipboard and return as base64 data URL for display. Summarize your actions or describe the highlighted sections and generate an image name to display.",
    //   inputSchema: {
    //     type: "object",
    //     properties: {},
    //     required: []
    //   }
    // },
    // {
    //   name: "get_clipboard_image_info",
    //   description: "Check if clipboard contains an image and get basic info without reading full data. Summarize your actions or describe the highlighted sections and generate an image name to display.",
    //   inputSchema: {
    //     type: "object",
    //     properties: {},
    //     required: []
    //   }
    // },
    {
      name: "download_current_chat_images",
      description: "Download all images from current AI chat conversation to local storage. You can specify custom names for each image or use automatic naming strategies.",
      inputSchema: {
        type: "object",
        properties: {
          folderPrefix: {
            type: "string",
            description: "Descriptive folder name for organizing downloads (e.g., 'Website-Analysis-2024', 'AI-Diagrams-Session', 'Screenshots-Research')."
          },
          imageNames: {
            type: "array",
            items: { type: "string" },
            description: "Custom names for each image in order. If provided, will use these names directly (e.g., ['网站首页截图', '用户登录界面', '错误页面'])."
          },
          filenamingStrategy: {
            type: "string",
            description: "Strategy for naming files when imageNames not provided: 'descriptive', 'sequential', or 'timestamp'. Default: 'descriptive'",
            enum: ["descriptive", "sequential", "timestamp"]
          },
          displayResults: {
            type: "boolean",
            description: "Whether to display the download results with file paths and organization summary. Default: true"
          }
        },
        required: []
      }
    },
    // Confluence tools
    {
      name: "confluence_search",
      description: "Search Confluence content using simple terms or CQL.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - can be simple text or a CQL query string."
          },
          limit: {
            type: "integer",
            description: "Maximum number of results (1-50).",
            default: 10,
            minimum: 1,
            maximum: 50
          },
          spaces_filter: {
            type: "string",
            description: "(Optional) Comma-separated list of space keys to filter results by."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "confluence_get_page",
      description: "Get content of a specific Confluence page by its ID, or by its title and space key.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "Confluence page ID. If provided, 'title' and 'space_key' are ignored."
          },
          title: {
            type: "string",
            description: "The exact title of the page. Must be used with 'space_key'."
          },
          space_key: {
            type: "string",
            description: "The key of the space. Must be used with 'title'."
          },
          include_metadata: {
            type: "boolean",
            description: "Whether to include page metadata.",
            default: true
          },
          convert_to_markdown: {
            type: "boolean",
            description: "Convert content to markdown (true) or keep raw HTML (false).",
            default: true
          }
        }
      }
    },
    {
      name: "confluence_get_page_children",
      description: "Get child pages of a specific Confluence page.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          parent_id: {
            type: "string",
            description: "The ID of the parent page whose children you want to retrieve"
          },
          expand: {
            type: "string",
            description: "Fields to expand in the response (e.g., 'version', 'body.storage').",
            default: "version"
          },
          limit: {
            type: "integer",
            description: "Maximum number of child pages to return (1-50)",
            default: 25,
            minimum: 1,
            maximum: 50
          },
          include_content: {
            type: "boolean",
            description: "Whether to include the page content in the response",
            default: false
          },
          convert_to_markdown: {
            type: "boolean",
            description: "Whether to convert page content to markdown (true) or keep it in raw HTML format (false). Only relevant if include_content is true.",
            default: true
          },
          start: {
            type: "integer",
            description: "Starting index for pagination (0-based)",
            default: 0,
            minimum: 0
          }
        },
        required: ["parent_id"]
      }
    },
    {
      name: "confluence_get_comments",
      description: "Get comments for a specific Confluence page.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "Confluence page ID"
          }
        },
        required: ["page_id"]
      }
    },
    {
      name: "confluence_get_labels",
      description: "Get labels for a specific Confluence page.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          page_id: {
            type: "string",
            description: "Confluence page ID"
          }
        },
        required: ["page_id"]
      }
    },
    {
      name: "confluence_search_user",
      description: "Search Confluence users using CQL.",
      action: false,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query - a CQL query string for user search"
          },
          limit: {
            type: "integer",
            description: "Maximum number of results (1-50)",
            default: 10,
            minimum: 1,
            maximum: 50
          }
        },
        required: ["query"]
      }
    }
  ]

  get tools() {
    return this.baseTools
  }

  async listTools() {
    console.log('📋 [DEBUG] MCP Client listing tools:', this.tools.map(t => t.name))
    return { tools: this.tools }
  }

  async callTool(name: string, args: any, _messageId?: string) {
    // Check host access for tools that interact with web pages
    const hostCheckResult = await this.checkHostAccessForTool(name, args)

    console.log('🔍 [DEBUG] Tool call host check:', {
      tool: name,
      args,
      hostCheckResult
    })

    if (!hostCheckResult.allowed) {
      return {
        success: false,
        error: `🚫 Host access denied: ${hostCheckResult.reason}. This host is blocked by the current access configuration.`,
        data: null
      }
    }

    return await callMcpTool({ tool: name as any, args })
  }

  async checkIsActionTool(name: string) {
    return this.tools.find(t => t.name === name)?.action === true
  }

  /**
   * Check if a tool requires host access validation and validate it
   */
  private async checkHostAccessForTool(toolName: string, args: any): Promise<{ allowed: boolean; reason?: string }> {
    // Tools that require host checking - comprehensive list
    const hostCheckingTools = [
      // Tab management tools
      'get_all_tabs',
      'get_current_tab',
      'switch_to_tab',
      'create_new_tab',
      'get_tab_info',
      'duplicate_tab',
      'close_tab',
      'get_tab_content',
      'get_current_tab_content',

      // Page content tools
      'get_page_metadata',
      'extract_page_text',
      'get_page_links',
      'get_page_images',
      'search_page_text',
      'get_page_performance',
      'get_page_accessibility',
      'get_interactive_elements',
      'click_element',
      'summarize_page',

      // Form & input tools
      'fill_input',
      'clear_input',
      'get_input_value',
      'submit_form',
      'get_form_elements',

      // UI interaction tools
      'scroll_to_element',
      'highlight_element',
      'highlight_text_inline',

      // Window management
      'get_all_windows',
      'get_current_window',
      'switch_to_window',
      'create_new_window',

      // Tab group management
      'get_all_tab_groups',
      'create_tab_group',

      // History tools
      'get_recent_history',
      'search_history',

      // Bookmark tools
      'get_all_bookmarks',
      'search_bookmarks',

      // Screenshot tools
      'capture_screenshot',
      'capture_tab_screenshot',

      // Clipboard tools that copy page content
      'copy_current_page_url',
      'copy_current_page_title',
      'copy_selected_text',
      'copy_page_as_markdown',
      'copy_page_as_text',
      'copy_page_links',
      'copy_page_metadata',

      // Download tools that work with page content
      'download_text_as_markdown',
      'download_image',
      'download_chat_images',
      'download_current_chat_images'
    ]

    if (!hostCheckingTools.includes(toolName)) {
      return { allowed: true }
    }

    let urlToCheck: string | null = null

    // Handle different tool types
    if (toolName === 'create_new_tab' || toolName === 'create_new_window') {
      // For tools that create new tabs/windows, check the target URL
      urlToCheck = args.url
    } else if (args.tabId) {
      // For tools that work with existing tabs, get the tab's URL
      try {
        const tab = await chrome.tabs.get(args.tabId)
        urlToCheck = tab.url || null
      } catch (e) {
        return { allowed: false, reason: `Cannot access tab ${args.tabId}: ${e}` }
      }
    } else if (toolName === 'capture_tab_screenshot' && args.tabId) {
      // Special case for tab screenshot with specific tab ID
      try {
        const tab = await chrome.tabs.get(args.tabId)
        urlToCheck = tab.url || null
      } catch (e) {
        return { allowed: false, reason: `Cannot access tab ${args.tabId}: ${e}` }
      }
    } else {
      // For tools that work on the current active tab, get the active tab's URL
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
        urlToCheck = activeTab?.url || null
      } catch (e) {
        return { allowed: false, reason: `Cannot access active tab: ${e}` }
      }
    }

    if (!urlToCheck) {
      return { allowed: false, reason: 'No URL found for host validation' }
    }

    return await hostAccessManager.isHostAllowed(urlToCheck)
  }

  async captureScreenshot() {
    const result = await callMcpTool({ tool: "capture_screenshot" as any, args: {} })
    if (result.success && result.data?.imageData) {
      return result.data.imageData
    }
    console.warn('Failed to capture screenshot:', result)
    return null
  }

  async callToolWithScreenshot(name: string, args: any, messageId?: string) {
    // 如果工具是 action 类型，先执行截图
    const tool = this.tools.find(t => t.name === name)
    let screenshotData = null

    if (tool && tool.action === true) {
      try {
        // 先执行截图并获取结果
        const screenshotResult = await callMcpTool({ tool: "capture_screenshot" as any, args: {} })

        // 如果截图成功，保存截图数据
        if (screenshotResult.success && screenshotResult.data?.imageData) {
          screenshotData = {
            toolName: 'capture_screenshot',
            imageData: screenshotResult.data.imageData,
            timestamp: new Date().toISOString()
          }
          console.log('Screenshot captured before action:', {
            toolName: name,
            imageData: screenshotResult.data.imageData.substring(0, 100) + '...' // 截取前100个字符用于日志
          })
        }
      } catch (error) {
        console.warn("Failed to capture screenshot before action:", error)
      }
    }

    // 执行原始工具调用
    const result = await callMcpTool({ tool: name as any, args })

    // 如果有截图数据，直接发送到 sidepanel，不添加到返回结果中
    if (screenshotData) {
      try {
        // 发送截图数据到 sidepanel，但不通过 tool call 结果
        if (messageId) {
          await chrome.runtime.sendMessage({
            request: "ai-chat-image-data",
            messageId,
            imageData: screenshotData.imageData,
            toolName: screenshotData.toolName,
            title: `Screenshot before ${name} action`
          })
        }
      } catch (error) {
        console.warn('Failed to send screenshot to sidepanel:', error)
      }
    }

    return result
  }

  getToolDescriptions() {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description
    }))
  }
}

export const browserMcpClient = new BrowserMcpClient()
