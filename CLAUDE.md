# AIPex - AI-Powered Browser Extension

AIPex is a sophisticated Chrome browser extension built with the Plasmo framework that provides AI-powered browser automation through MCP (Model Context Protocol) integration.

## Quick Start

### Development Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Package for distribution
pnpm package

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

### Project Structure
```
AIPex/
├── src/
│   ├── sidepanel/           # Main UI component
│   ├── background/          # Extension background scripts
│   ├── mcp/                # MCP client and tool definitions
│   ├── mcp-servers/        # Individual MCP tool implementations
│   └── lib/
│       ├── components/     # React components
│       └── services/       # Core services (tool registry, etc.)
├── .cursor/
│   └── rules/              # Development guidelines
└── assets/                 # Extension icons and resources
```

## Architecture Overview

### Core Components
- **Sidepanel**: Main React UI using @assistant-ui/react for AI chat interface
- **Background Script**: Extension lifecycle and browser API management
- **MCP Integration**: Direct in-process MCP client with 130+ browser automation tools
- **Tool Registry**: Singleton pattern for tool management and categorization

### Technology Stack
- **Framework**: Plasmo (Chrome extension framework)
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite with React plugin
- **AI Integration**: MCP (Model Context Protocol)
- **Styling**: Tailwind CSS with dark mode support

## MCP Integration

### Tool Categories
The extension provides 13 categories of browser automation tools:

1. **Tab Management** - Tab switching, creation, and information
2. **Tab Groups** - Tab organization and grouping
3. **Bookmarks** - Bookmark management and search
4. **History** - Browsing history management
5. **Windows** - Browser window control
6. **Page Content** - Content extraction and analysis
7. **Form & Input Management** - Form interaction and automation
8. **Clipboard** - Clipboard operations
9. **Storage** - Extension storage management
10. **Extensions** - Browser extension management
11. **Downloads** - Download management
12. **Sessions** - Session restoration
13. **Context Menus** - Custom context menu items

### Tool Implementation Pattern
```typescript
// Tool definition in src/mcp/index.ts
export type McpToolName =
  | "get_all_tabs"
  | "get_current_tab"
  | "switch_to_tab"
  // ... 130+ tools

// Tool execution via direct in-process calls
export async function callMcpTool(request: McpRequest): Promise<McpResponse> {
  switch (request.tool) {
    case "get_all_tabs":
      const tabs = await getAllTabs()
      return { success: true, data: tabs }
    // ...
  }
}
```

## Development Guidelines

### React Component Development
- Use functional components with hooks
- Follow composition over inheritance
- Implement proper TypeScript interfaces for props
- Use @assistant-ui/react for AI chat interfaces
- Support both light and dark themes

### MCP Tool Development
- Each tool should have a single responsibility
- Implement robust error handling
- Validate all input parameters
- Provide clear, actionable error messages
- Use async/await for all operations

### Code Quality
- Use Prettier for code formatting
- Follow ESLint rules for TypeScript and React
- Run type checking with `tsc --noEmit`
- Use conventional commit messages
- Maintain >80% test coverage

## Key Files and Locations

### Core Architecture
- **Tool Registry**: [src/lib/services/tool-registry.ts](src/lib/services/tool-registry.ts)
- **MCP Client**: [src/mcp/index.ts](src/mcp/index.ts)
- **Main UI**: [src/sidepanel.tsx](src/sidepanel.tsx)
- **Background Script**: [src/background.ts](src/background.ts)

### Configuration
- **Build Config**: [vite.config.ts](vite.config.ts)
- **Styling**: [tailwind.config.js](tailwind.config.js)
- **Package Info**: [package.json](package.json)

### Development Rules
- **React Components**: [.cursor/rules/react-components.mdc](.cursor/rules/react-components.mdc)
- **MCP Integration**: [.cursor/rules/mcp-integration.mdc](.cursor/rules/mcp-integration.mdc)
- **Workflow**: [.cursor/rules/development-workflow.mdc](.cursor/rules/development-workflow.mdc)

## Browser Extension Specifics

### Manifest Configuration
- Uses Plasmo framework for manifest generation
- Requires permissions for browser APIs
- Supports sidepanel, background, and content scripts

### API Usage
- Chrome extension APIs for browser automation
- MCP protocol for AI tool integration
- Local storage for extension data

## Testing and Deployment

### Testing Strategy
- Unit tests for individual functions
- Integration tests for component interactions
- E2E tests for extension functionality
- Browser testing across Chrome, Firefox, Edge

### Build Process
- Development: Hot reload with `pnpm dev`
- Production: Optimized builds with `pnpm build`
- Packaging: Extension packages with `pnpm package`

## Common Development Tasks

### Adding New MCP Tools
1. Define tool in [src/mcp/index.ts](src/mcp/index.ts)
2. Implement tool in [src/mcp-servers/](src/mcp-servers/)
3. Add tool to appropriate category in tool registry
4. Test tool functionality

### UI Component Development
1. Create component in [src/lib/components/](src/lib/components/)
2. Follow React component patterns
3. Use Tailwind CSS for styling
4. Support responsive design and accessibility

### Extension Features
1. Update background script for new functionality
2. Modify sidepanel UI as needed
3. Update manifest permissions if required
4. Test across target browsers

## Troubleshooting

### Common Issues
- **TypeScript errors**: Run `pnpm type-check`
- **Build failures**: Check Vite configuration
- **Extension not loading**: Verify manifest and permissions
- **MCP tools not working**: Check tool registry initialization

### Debugging
- Use browser developer tools for UI debugging
- Check background script console for extension errors
- Verify MCP tool execution in tool registry
- Monitor network requests for API calls

This documentation provides a comprehensive overview of the AIPex codebase architecture and development workflow. Refer to the specific files and development rules for detailed implementation guidance.