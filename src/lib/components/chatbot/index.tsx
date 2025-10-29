import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputContextTag,
  PromptInputContextTags,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputContexts,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Icon, getContextIcon } from "~/lib/components/ui/icon";
import { Fragment, useEffect, useRef, useState } from "react";
import { models, SYSTEM_PROMPT } from "./constants";
import { MessageHandler, type MessageHandlerConfig } from "./message-handler";
import type { UIMessage } from "./types";
import { FastCommandButton } from "./fast-command-button";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { useStorage } from "~/lib/storage";
import { getAllTools } from "~/lib/services/tool-registry";
import { useTranslation, useLanguageChanger } from "~/lib/i18n/hooks";
import type { Language } from "~/lib/i18n/types";
import { useTheme, type Theme } from "~/lib/hooks/use-theme";
import { useTabsSync } from "~/lib/hooks/use-tabs-sync";
import { providerManager, type ProviderWithKey } from "~/lib/services/provider-manager";

// InterCommand types
interface InterCommand {
  name: string;
  query: string;
}

interface CommandCategory {
  name: string;
  children: (CommandCategory | InterCommand)[];
}

// Function to render command hierarchy
const renderCommandHierarchy = (
  categories: (CommandCategory | InterCommand)[],
  currentPath: string[],
  onNavigate: (path: string[]) => void,
  onExecuteCommand: (query: string) => void
): React.ReactElement[] => {
  return categories.map((item, index) => {
    if ('children' in item) {
      // It's a category
      return (
        <CommandItem
          key={`${item.name}-${index}`}
          onSelect={() => onNavigate([...currentPath, item.name])}
          className="cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent/50 aria-selected:text-accent-foreground"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Icon name="file" size="xs" />
              <span>{item.name}</span>
            </div>
            <Icon name="chevronRight" size="xs" variant="muted" />
          </div>
        </CommandItem>
      );
    } else {
      // It's a command
      return (
        <CommandItem
          key={`${item.name}-${index}`}
          onSelect={() => onExecuteCommand(item.query)}
          className="cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent/50 aria-selected:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Icon name="send" size="xs" />
            <span>{item.name}</span>
          </div>
        </CommandItem>
      );
    }
  });
};

// Function to get current level items
const getCurrentLevelItems = (commands: CommandCategory[], path: string[]): (CommandCategory | InterCommand)[] => {
  if (path.length === 0) {
    return commands;
  }

  let current: any = commands;
  for (const segment of path) {
    const found = current.find((item: any) => item.name === segment);
    if (found && 'children' in found) {
      current = found.children;
    } else {
      return [];
    }
  }
  return current;
};

// Function to read commands folder structure
const readCommandsStructure = async (): Promise<CommandCategory[]> => {
  try {
    // Use Vite's import.meta.glob to dynamically import all JSON files in commands folder
    const commandModules = import.meta.glob('/commands/**/*.json', { eager: true });

    const buildCommandTree = (modules: Record<string, any>): CommandCategory[] => {
      const tree: CommandCategory[] = [];

      for (const [path, module] of Object.entries(modules)) {
        // Remove '/commands/' prefix and '.json' suffix
        const relativePath = path.replace('/commands/', '').replace('.json', '');
        const pathParts = relativePath.split('/');

        // Navigate/create the tree structure
        let currentLevel: (CommandCategory | InterCommand)[] = tree;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          let existingCategory = currentLevel.find(item => item.name === part && 'children' in item) as CommandCategory;

          if (!existingCategory) {
            existingCategory = { name: part, children: [] };
            currentLevel.push(existingCategory);
          }

          currentLevel = existingCategory.children;
        }

        // Add the commands from this JSON file
        const commands = module.default || module;

        for (const [commandName, commandData] of Object.entries(commands)) {
          if (typeof commandData === 'object' && commandData !== null && 'query' in commandData) {
            currentLevel.push({
              name: commandName,
              query: (commandData as any).query
            } as InterCommand);
          }
        }
      }

      return tree;
    };

    return buildCommandTree(commandModules);
  } catch (error) {
    console.error('Error reading commands structure:', error);
    return [];
  }
};

const formatToolOutput = (output: any) => {
  return `
  \`\`\`${typeof output === "string" ? "text" : "json"}
  ${typeof output === "string" ? output : JSON.stringify(output, null, 2)}
  \`\`\`
  `;
};


// Welcome screen component
const WelcomeScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-8">
      <div className="relative mb-6 sm:mb-8">
        <img
          src="/assets/ish_larg.png"
          alt="AIpex Logo"
          className="w-40 h-40 rounded-xl opacity-100 shadow-2xl"
        />
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-bold text-black dark:text-white mb-2 drop-shadow-sm dark:drop-shadow-none">
          {t("welcome.title")}
        </h3>
        <p className="text-sm text-muted-foreground dark:text-white">
          {t("welcome.subtitle")}
        </p>
      </div>
    </div>
  );
};

const ChatBot = () => {
  const { t, language, isChangingLanguage } = useTranslation()
  const changeLanguage = useLanguageChanger()
  const { theme, setTheme } = useTheme()
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [messageQueue, setMessageQueue] = useState<UIMessage[]>([]);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  const [aiHost, setAiHost, isLoadingHost] = useStorage("aiHost", import.meta.env.VITE_AI_HOST || "https://api.openai.com/v1/chat/completions");
  const [aiModel, setAiModel, isLoadingModel] = useStorage("aiModel", import.meta.env.VITE_AI_MODEL || "deepseek-chat");
  const [isModelButtonHovered, setIsModelButtonHovered] = useState(false);
  const [isThemeButtonHovered, setIsThemeButtonHovered] = useState(false);
  const [isNewChatButtonHovered, setIsNewChatButtonHovered] = useState(false);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFastCommandOpen, setIsFastCommandOpen] = useState(false);
  const [interCommandPath, setInterCommandPath] = useState<string[]>([]);
  const [interCommands, setInterCommands] = useState<CommandCategory[]>([]);

  // Load InterCommands on mount
  useEffect(() => {
    const loadCommands = async () => {
      const commands = await readCommandsStructure();
      setInterCommands(commands);
    };
    loadCommands();
  }, []);

  // Get current token based on selected provider
  const getCurrentToken = (): string => {
    if (selectedProvider) {
      const token = providerManager.getProviderKey(selectedProvider) || "";
      console.log("[getCurrentToken] Using selectedProvider token:", selectedProvider, token ? "present" : "empty");
      return token;
    }
    // Fallback to default provider if no specific provider selected
    const defaultProvider = providerManager.getDefaultProvider();
    if (defaultProvider) {
      const token = providerManager.getProviderKey(defaultProvider) || "";
      console.log("[getCurrentToken] Using defaultProvider token:", defaultProvider, token ? "present" : "empty");
      return token;
    }
    console.log("[getCurrentToken] No provider found, returning empty token");
    return "";
  };

  // Provider management state
  const [providers, setProviders] = useState<ProviderWithKey[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [providerApiKey, setProviderApiKey] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [showProviderOptions, setShowProviderOptions] = useState<string | null>(null);


  // Load providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        await providerManager.loadProviders();
        const providersWithKeys = providerManager.getProvidersWithKeys();
        setProviders(providersWithKeys);
      } catch (error) {
        console.error("Failed to load providers:", error);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    loadProviders();
  }, []);

  // Update selected model name when aiModel changes or providers change
  useEffect(() => {
    const defaultProvider = providerManager.getDefaultProvider();
    const defaultModel = providerManager.getDefaultModel();

    if (defaultProvider && defaultModel) {
      const currentModel = models.find(model => model.value === defaultModel);
      if (currentModel) {
        setSelectedModelName(currentModel.name);
      } else {
        setSelectedModelName(defaultModel); // Fallback to model ID if name not found
      }
    } else {
      setSelectedModelName(""); // Clear model name if no default provider
    }
  }, [aiModel, providers]);

  // Keyboard shortcut for CommandDialog
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const placeholderList = [
    t("input.placeholder1"),
    t("input.placeholder2"),
    t("input.placeholder3")
  ];


  // Track cleanup functions outside of the handler
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);
  const isInitializedRef = useRef(false);

  // Initialize message handler ONCE on mount (wait for settings to load first)
  useEffect(() => {
    // Wait for all settings to load from storage and providers
    if (isLoadingHost || isLoadingModel || isLoadingProviders) {
      return;
    }

    // Only initialize once - use ref to prevent re-initialization even if dependencies change
    if (isInitializedRef.current || messageHandlerRef.current) {
      return;
    }

    const config: MessageHandlerConfig = {
      initialModel: aiModel || "deepseek-chat",
      initialTools: getAllTools().map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
      })),
      initialAiHost: aiHost || "https://api.openai.com/v1/chat/completions",
      initialAiToken: getCurrentToken(),
      initialMessages: [{ role: "system", id: "system", parts: [{ type: "text", text: SYSTEM_PROMPT }] }],
    };

    messageHandlerRef.current = new MessageHandler(config);
    isInitializedRef.current = true;

    const unsubscribeMessages = messageHandlerRef.current.subscribe(
      "messages_updated",
      (newMessages) => {
        setMessages(newMessages);
      }
    );
    const unsubscribeStatus = messageHandlerRef.current.subscribe(
      "status_changed",
      (newStatus) => {
        setStatus(newStatus);
      }
    );
    const unsubscribeQueue = messageHandlerRef.current.subscribe("queue_changed", (newQueue) => {
      setMessageQueue(newQueue);
    });

    // Store cleanup functions
    unsubscribeFunctionsRef.current = [unsubscribeMessages, unsubscribeStatus, unsubscribeQueue];

    // Set initial state from handler
    setMessages(messageHandlerRef.current.getMessages());
    setStatus(messageHandlerRef.current.getStatus());
    setMessageQueue(messageHandlerRef.current.getQueue());
  }, [isLoadingHost, isLoadingModel, isLoadingProviders, aiModel, aiHost, selectedProvider, providers]); // ✅ 包含配置值但使用 ref 防止重复初始化

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      unsubscribeFunctionsRef.current.forEach((fn) => fn());
      unsubscribeFunctionsRef.current = [];
      if (messageHandlerRef.current) {
        messageHandlerRef.current.destroy();
        messageHandlerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  // Update configuration when settings change (after initial load)
  useEffect(() => {
    // Skip if still loading or if handler not yet created
    if (isLoadingHost || isLoadingModel || isLoadingProviders || !messageHandlerRef.current) {
      return;
    }

    messageHandlerRef.current.updateConfig({
      initialModel: aiModel || "deepseek-chat",
      initialAiHost: aiHost || "https://api.openai.com/v1/chat/completions",
      initialAiToken: getCurrentToken(),
    });
  }, [aiModel, aiHost, selectedProvider, providers, isLoadingHost, isLoadingModel, isLoadingProviders]);

  const handleSubmit = (message: PromptInputMessage | string) => {
    console.log("[handleSubmit] Called with:", typeof message === "string" ? message.substring(0, 50) : {
      hasText: !!message.text,
      hasFiles: !!message.files?.length,
      hasContexts: !!message.contexts?.length
    });

    // Handle string input (from welcome suggestions)
    if (typeof message === "string") {
      if (!message.trim()) return;
      messageHandlerRef.current?.sendMessage(message);
      setInput("");
      return;
    }

    // Handle PromptInputMessage
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);
    const hasContexts = Boolean(message.contexts?.length);

    if (!(hasText || hasAttachments || hasContexts)) {
      return;
    }

    // Send message with contexts as separate parameter
    messageHandlerRef.current?.sendMessage(
      message.text || "",
      message.files,
      message.contexts
    );
    setInput("");
  };

  const handleRegenerate = () => {
    messageHandlerRef.current?.regenerate();
  };

  const handleStop = () => {
    messageHandlerRef.current?.stopStream();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleNewChat = () => {
    if (messageHandlerRef.current) {
      messageHandlerRef.current.abort();
      messageHandlerRef.current.resetMessages();
    }
    setMessages([]);
    setInput("");
  };

  // Provider management functions
  const handleProviderSelect = async (providerName: string) => {
    const provider = providers.find(p => p.name === providerName);
    if (!provider) return;

    if (provider.apiKey) {
      // Provider has API key, fetch models
      setSelectedProvider(providerName);
      setIsFetchingModels(true);
      setProviderError(null);

      try {
        const models = await providerManager.fetchModels(providerName);
        setProviderModels(models);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch models";
        if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("authentication")) {
          setProviderError("Invalid API token. Please check your API key and try again.");
        } else {
          setProviderError(errorMessage);
        }
        setProviderModels([]);
      } finally {
        setIsFetchingModels(false);
      }
    } else {
      // No API key, show key input
      setSelectedProvider(providerName);
      setIsAddingKey(true);
      setProviderApiKey("");
      setProviderError(null);
    }
  };

  const handleAddApiKey = async () => {
    if (!selectedProvider || !providerApiKey.trim()) return;

    setIsFetchingModels(true);
    setProviderError(null);

    try {
      // Save API key
      await providerManager.saveProviderKey(selectedProvider, providerApiKey.trim());

      // Refresh providers list
      const updatedProviders = providerManager.getProvidersWithKeys();
      setProviders(updatedProviders);

      // Fetch models with the new key
      const models = await providerManager.fetchModels(selectedProvider);
      setProviderModels(models);
      setIsAddingKey(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add API key";
      if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("authentication")) {
        setProviderError("Invalid API token. Please check your API key and try again.");
      } else {
        setProviderError(errorMessage);
      }
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleDeleteApiKey = async (providerName: string) => {
    try {
      await providerManager.deleteProviderKey(providerName);

      // Clear default provider if it was the deleted one
      const currentDefault = providerManager.getDefaultProvider();
      if (currentDefault === providerName) {
        await providerManager.clearDefaultProvider();
        // Clear the default model as well
        await providerManager.setDefaultModel("");
        // Clear UI state for default provider
        setAiModel("");
        setAiHost("");
        setSelectedModelName("");
      }

      // Refresh providers list (other providers should remain)
      const updatedProviders = providerManager.getProvidersWithKeys();
      setProviders(updatedProviders);

      // Reset state if this was the selected provider
      if (selectedProvider === providerName) {
        setSelectedProvider(null);
        setProviderModels([]);
        setIsAddingKey(false);
        setProviderError(null);
      }

      // Close the command dialog if it was open
      setIsCommandOpen(false);
      setShowProviderOptions(null);
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    console.log("[handleModelSelect] Called with modelId:", modelId, "selectedProvider:", selectedProvider);

    if (!selectedProvider) return;

    // Get the provider config to determine the correct host URL
    const provider = providerManager.getProviderByName(selectedProvider);
    if (!provider) {
      console.error("[handleModelSelect] Provider not found:", selectedProvider);
      return;
    }

    // Set the correct host URL for this provider
    const hostUrl = `${provider.url}${provider.endpoints.chat}`;
    console.log("[handleModelSelect] Setting host URL to:", hostUrl);
    setAiHost(hostUrl);

    // Set the AI model and close the dialog
    setAiModel(modelId);
    const currentModel = models.find(model => model.value === modelId);
    setSelectedModelName(currentModel ? currentModel.name : modelId);
    setIsCommandOpen(false);

    // Set this provider as the default
    await providerManager.setDefaultProvider(selectedProvider);
    await providerManager.setDefaultModel(modelId);

    console.log("[handleModelSelect] Set default provider and model, getting token...");

    // Explicitly update MessageHandler with new token and host
    if (messageHandlerRef.current) {
      const token = getCurrentToken();
      console.log("[handleModelSelect] Updating MessageHandler with token:", token ? "present" : "empty", "length:", token.length, "host:", hostUrl);
      messageHandlerRef.current.updateConfig({
        initialAiToken: token,
        initialAiHost: hostUrl,
      });
    }

    // Reset provider selection state
    setSelectedProvider(null);
    setProviderModels([]);
    setIsAddingKey(false);
    setProviderError(null);
  };

  const handleBackToProviders = () => {
    setSelectedProvider(null);
    setProviderModels([]);
    setIsAddingKey(false);
    setProviderError(null);
  };

  const handleCogwheelClick = (e: React.MouseEvent, providerName: string) => {
    e.stopPropagation();
    setShowProviderOptions(providerName);
  };

  const handleDeleteKey = (providerName: string) => {
    handleDeleteApiKey(providerName);
    setShowProviderOptions(null);
  };

  const handleModifyKey = (providerName: string) => {
    setSelectedProvider(providerName);
    setIsAddingKey(true);
    setProviderApiKey("");
    setShowProviderOptions(null);
  };

  const handleBackFromOptions = () => {
    setShowProviderOptions(null);
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const themes: Theme[] = ['light', 'dark', 'system'];
              const currentIndex = themes.indexOf(theme || 'system');
              const nextIndex = (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex]);
            }}
            onMouseEnter={() => setIsThemeButtonHovered(true)}
            onMouseLeave={() => setIsThemeButtonHovered(false)}
            className="w-9 h-9 p-0 border border-border bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground group"
            title={`Current theme: ${theme || 'system'}`}
          >
            <Icon
              name={(theme || 'system') === 'dark' ? 'moon' : (theme || 'system') === 'light' ? 'sun' : 'monitor'}
              size="sm"
              variant={isThemeButtonHovered ? "default" : "muted"}
              className="transition-transform duration-300 group-hover:rotate-90"
            />
          </Button>

          {/* Language Selector Button */}
          <Select value={language} onValueChange={(value) => changeLanguage(value as Language)}>
            <SelectTrigger className="w-auto h-9 px-2 text-xs border border-border bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("language.en")}</SelectItem>
              <SelectItem value="de">{t("language.de")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          onMouseEnter={() => setIsNewChatButtonHovered(true)}
          onMouseLeave={() => setIsNewChatButtonHovered(false)}
          className="w-8 h-8 border border-border text-muted-foreground hover:text-foreground group"
        >
          <Icon name="refresh" size="sm" variant={isNewChatButtonHovered ? "default" : "muted"} className="transition-transform duration-300 group-hover:rotate-90" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isChangingLanguage ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}>
          <Conversation className="h-full">
            <ConversationContent>
              {messages.filter((message) => message.role !== "system").length === 0 ? (
                <WelcomeScreen />
              ) : (
                messages.filter((message) => message.role !== "system").map((message, messageIndex) => (
                  <div key={message.id}>
                    {message.role === "assistant" &&
                      message.parts.filter((part) => part.type === "source-url").length > 0 && (
                        <Sources>
                          <SourcesTrigger
                            count={message.parts.filter((part) => part.type === "source-url").length}
                          />
                          {message.parts
                            .filter((part) => part.type === "source-url")
                            .map((part, i) => (
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source key={`${message.id}-${i}`} href={(part as any).url} title={(part as any).url} />
                              </SourcesContent>
                            ))}
                        </Sources>
                      )}
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          const isLastMessage = messageIndex === messages.length - 1;
                          return (
                            <Fragment key={`${message.id}-${i}`}>
                              <Message from={message.role as "user" | "assistant" | "system"}>
                                <MessageContent>
                                  <Response>{part.text}</Response>
                                </MessageContent>
                              </Message>
                              {message.role === "assistant" && isLastMessage && (
                                <Actions className="mt-2">
                                  <Action onClick={() => handleRegenerate()} label="Retry">
                                    <Icon name="refresh" size="xs" variant="muted" />
                                  </Action>
                                  <Action onClick={() => handleCopy(part.text)} label="Copy">
                                    <Icon name="copy" size="xs" variant="muted" />
                                  </Action>
                                </Actions>
                              )}
                            </Fragment>
                          );
                        case "file":
                          return (
                            <Message key={`${message.id}-${i}`} from={message.role as "user" | "assistant" | "system"}>
                              <MessageContent>
                                {part.mediaType.startsWith("image/") ? (
                                  <div className="max-w-md">
                                    <img
                                      src={part.url}
                                      alt={part.filename || "Attached image"}
                                      className="rounded-lg border border-gray-200 dark:border-gray-700"
                                    />
                                    {part.filename && (
                                      <p className="text-xs text-muted-foreground mt-1">{part.filename}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <p className="text-sm">
                                      📎 {part.filename || "Attached file"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{part.mediaType}</p>
                                  </div>
                                )}
                              </MessageContent>
                            </Message>
                          );
                        case "tool":
                          return (
                            <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                              <ToolHeader type={`tool-${part.toolName}`} state={part.state} />
                              <ToolContent>
                                <ToolInput input={part.input} />
                                <ToolOutput
                                  output={
                                    part.output ? (
                                      <Response>
                                        {formatToolOutput(part.output)}
                                      </Response>
                                    ) : undefined
                                  }
                                  errorText={part.errorText}
                                />
                              </ToolContent>
                            </Tool>
                          );
                        case "reasoning":
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className="w-full"
                              isStreaming={
                                status === "streaming" &&
                                i === message.parts.length - 1 &&
                                message.id === messages[messages.length - 1]?.id
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        case "context":
                          return (
                            <div
                              key={`${message.id}-${i}`}
                              className={cn(
                                "flex w-full items-end gap-2 py-2",
                                message.role === "user" ? "justify-end" : "flex-row-reverse justify-end"
                              )}
                            >
                              <div className="flex items-center gap-2 max-w-[80%] px-3 py-1.5 text-sm rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors">
                                <span className="text-primary flex-shrink-0">
                                  {getContextIcon(part.contextType)}
                                </span>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-medium text-foreground truncate">
                                    {part.label}
                                  </span>
                                  {part.metadata?.url && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {part.metadata.url}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {part.contextType}
                                </span>
                              </div>
                            </div>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                ))
              )}
              {status === "submitted" && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>
      </div>

      <div className="p-4">
        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            {/* Context Tags */}
            <PromptInputContextTags>
              {(context) => <PromptInputContextTag data={context} />}
            </PromptInputContextTags>

            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>

            <ContextLoader />

            <PromptInputTextarea
              placeholder={t("input.newLine")}
              enableTypingAnimation={true}
              placeholderTexts={placeholderList}
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />

            {/* Queue indicator */}
            {messageQueue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md mt-2">
                <Icon name="clock" size="sm" variant="muted" />
                <span>
                  {messageQueue.length} message{messageQueue.length > 1 ? "s" : ""} queued
                </span>
              </div>
            )}
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "relative overflow-hidden transition-all duration-500 ease-in-out hover:scale-105",
                  "text-muted-foreground hover:text-foreground",
                  "bg-transparent hover:bg-accent hover:shadow-md",
                  "border border-border hover:border-accent-foreground/20",
                  "min-w-[40px] w-auto",
                  isModelButtonHovered || selectedModelName
                    ? "px-2"
                    : "px-2",
                  "group"
                )}
                onMouseEnter={() => setIsModelButtonHovered(true)}
                onMouseLeave={() => setIsModelButtonHovered(false)}
                onClick={() => setIsCommandOpen(true)}
              >
                <div className={cn("flex items-center transition-all duration-500 ease-out", (isModelButtonHovered || selectedModelName) && "gap-2")}>
                  <Icon name="botMessageSquare" size="sm" variant={isModelButtonHovered ? "default" : "muted"} className="transition-all duration-700 ease-in-out group-hover:rotate-[360deg] group-hover:scale-110" />
                  <span
                    className={cn(
                      "transition-all duration-500 ease-out overflow-hidden whitespace-nowrap",
                      isModelButtonHovered || selectedModelName
                        ? "max-w-[120px] opacity-100 translate-x-0"
                        : "max-w-0 opacity-0 -translate-x-2"
                    )}
                  >
                    {selectedModelName || "models"}
                  </span>
                </div>
              </Button>

              {/* Fast Command Button */}
              <FastCommandButton
                onClick={() => setIsFastCommandOpen(true)}
              />
            </PromptInputTools>
            <Button
              type="submit"
              size="sm"
              disabled={!input && status === "idle"}
              onClick={status === "streaming" ? handleStop : undefined}
              className={cn(
                "transition-all duration-200 rounded-full aspect-square w-8 h-8 p-0 flex items-center justify-center group",
                status === "streaming"
                  ? "bg-red-600 hover:bg-red-700 text-white hover:scale-110"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-110"
              )}
            >
              {status === "streaming" ? (
                <Icon name="x" size="sm" className="text-current transition-transform duration-200 group-hover:rotate-90" />
              ) : (
                <Icon name="sendHorizontal" size="sm" className="text-current dark:text-white transition-transform duration-200 group-hover:-rotate-12" strokeWidth={2.5} />
              )}
            </Button>
          </PromptInputToolbar>
        </PromptInput>
      </div>



      {/* Command Dialog for Provider and Model Selection */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder={t("providers.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty className="py-6 text-center text-sm">
            {t("providers.noProvidersFound")}
          </CommandEmpty>

          {/* Show provider options when cogwheel is clicked */}
          {showProviderOptions && (
            <CommandGroup heading={t("providers.manageProvider", { providerName: showProviderOptions })} className="p-1">
              <CommandItem
                onSelect={() => handleModifyKey(showProviderOptions)}
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent/50 aria-selected:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <Icon name="edit" size="xs" />
                  {t("providers.modifyApiKey")}
                </div>
              </CommandItem>
              <CommandItem
                onSelect={() => handleDeleteKey(showProviderOptions)}
                className="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive aria-selected:bg-destructive/10 aria-selected:text-destructive"
              >
                <div className="flex items-center gap-2">
                  <Icon name="trash" size="xs" className="text-destructive" />
                  {t("providers.deleteApiKey")}
                </div>
              </CommandItem>
              <CommandSeparator className="mb-1 mt-1" />
              <CommandItem onSelect={handleBackFromOptions} className="cursor-pointer rounded-sm px-2 py-1 text-sm aria-selected:bg-accent/30 aria-selected:text-accent-foreground">
                <div className="flex items-center gap-2">
                  <Icon name="chevronLeft" size="xs" />
                  {t("providers.backToProviders")}
                </div>
              </CommandItem>
            </CommandGroup>
          )}

          {/* Show provider list when no provider is selected and not showing options */}
          {!selectedProvider && !isAddingKey && !showProviderOptions && (
            <CommandGroup heading={t("providers.aiProviders")} className="p-1">
              {isLoadingProviders ? (
                <CommandItem disabled>
                  <div className="flex items-center gap-2">
                    <Icon name="refresh" size="sm" className="animate-spin" />
                    {t("providers.loadingProviders")}
                  </div>
                </CommandItem>
              ) : (
                providers.map(provider => (
                  <CommandItem
                    key={provider.name}
                    value={provider.name}
                    onSelect={() => handleProviderSelect(provider.name)}
                    className="cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent/50 aria-selected:text-accent-foreground"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{provider.name}</span>
                      <div className="flex items-center gap-2">
                        {!provider.apiKey && provider.api_key_required && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-primary text-primary-foreground"
                          >
                            {t("providers.addNewKey")}
                          </Badge>
                        )}
                        {provider.apiKey && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCogwheelClick(e, provider.name)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive transition-all duration-200 hover:rotate-90"
                          >
                            <Icon name="settings" size="xs" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          )}

          {/* Show API key input when adding key */}
          {isAddingKey && selectedProvider && (
            <CommandGroup heading={t("providers.addApiKeyFor", { providerName: selectedProvider })} className="p-1">
              <div className="px-2 py-1 space-y-2">
                <Input
                  type="password"
                  placeholder={t("providers.enterApiKey")}
                  value={providerApiKey}
                  onChange={(e) => setProviderApiKey(e.target.value)}
                  className="mb-2"
                />
                {providerError && (
                  <Alert variant="destructive" className="mb-2">
                    <AlertDescription>{providerError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToProviders}
                    className="flex-1"
                  >
                    {t("providers.back")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddApiKey}
                    disabled={!providerApiKey.trim() || isFetchingModels}
                    className="flex-1"
                  >
                    {isFetchingModels ? (
                      <Icon name="refresh" size="sm" className="animate-spin" />
                    ) : (
                      t("providers.addKey")
                    )}
                  </Button>
                </div>
              </div>
            </CommandGroup>
          )}

          {/* Show models list when provider is selected and has models */}
          {selectedProvider && !isAddingKey && (
            <CommandGroup heading={t("providers.modelsFor", { providerName: selectedProvider })} className="p-1">
              {providerError && (
                <div className="px-2 py-1">
                  <Alert variant="destructive">
                    <AlertDescription>{providerError}</AlertDescription>
                  </Alert>
                </div>
              )}

              {isFetchingModels ? (
                <CommandItem disabled>
                  <div className="flex items-center gap-2">
                    <Icon name="refresh" size="sm" className="animate-spin" />
                    {t("providers.loadingModels")}
                  </div>
                </CommandItem>
              ) : providerModels.length > 0 ? (
                providerModels.map(model => (
                  <CommandItem
                    key={model}
                    value={model}
                    onSelect={() => handleModelSelect(model)}
                    className={cn(
                      "cursor-pointer rounded-sm px-2 py-1.5 text-sm aria-selected:bg-accent/50 aria-selected:text-accent-foreground",
                      aiModel === model && "bg-accent/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{model}</span>
                      {aiModel === model && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted">
                          <Icon name="check" size="xs" variant="muted" />
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))
              ) : (
                <CommandItem disabled>
                  <div className="text-sm text-muted-foreground">
                    {t("providers.noModelsAvailable")}
                  </div>
                </CommandItem>
              )}

              <CommandSeparator className="mb-1 mt-1" />
              <CommandItem onSelect={handleBackToProviders} className="cursor-pointer rounded-sm px-2 py-1 text-sm aria-selected:bg-accent/30 aria-selected:text-accent-foreground">
                <div className="flex items-center gap-2">
                  <Icon name="chevronLeft" size="xs" />
                  {t("providers.backToProviders")}
                </div>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>

      {/* Fast Command Dialog */}
      <CommandDialog open={isFastCommandOpen} onOpenChange={(open) => {
        setIsFastCommandOpen(open);
        if (!open) {
          setInterCommandPath([]);
        }
      }}>
        <CommandInput placeholder="Search commands..." />
        <CommandList>
          <CommandEmpty>No commands found.</CommandEmpty>

          <CommandGroup heading={interCommandPath.length > 0 ? interCommandPath[interCommandPath.length - 1] : "Commands"}>
            {interCommandPath.length > 0 && (
              <CommandItem
                onSelect={() => setInterCommandPath(interCommandPath.slice(0, -1))}
                className="cursor-pointer rounded-sm px-2 py-1 text-sm aria-selected:bg-accent/30 aria-selected:text-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <Icon name="chevronLeft" size="xs" />
                  <span>Back</span>
                </div>
              </CommandItem>
            )}
            <CommandItem
              onSelect={() => setIsFastCommandOpen(false)}
              className="cursor-pointer rounded-sm px-2 py-1 text-sm aria-selected:bg-accent/30 aria-selected:text-accent-foreground"
            >
              <div className="flex items-center gap-2">
                <Icon name="x" size="xs" />
                <span>Close</span>
              </div>
            </CommandItem>
            <CommandSeparator className="mb-1 mt-1" />
          </CommandGroup>

          <CommandGroup heading="">
            {renderCommandHierarchy(
              getCurrentLevelItems(interCommands, interCommandPath),
              interCommandPath,
              setInterCommandPath,
              (query: string) => {
                setIsFastCommandOpen(false);
                setInterCommandPath([]);
                // Execute the command by sending it as a message
                handleSubmit(query);
              }
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

// Helper component to load available contexts and sync with tab events
function ContextLoader() {
  const contexts = usePromptInputContexts();

  // Use the tabs sync hook to automatically update contexts on tab changes
  useTabsSync({
    onContextsUpdate: (availableContexts) => {
      contexts.setAvailableContexts(availableContexts);
    },
    onContextRemove: (contextId) => {
      contexts.remove(contextId);
    },
    getSelectedContexts: () => {
      return contexts.items;
    },
    debounceDelay: 300, // Wait 300ms before updating to avoid excessive updates
  });

  return null;
}

export default ChatBot;
