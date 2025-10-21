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
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ChatStatus } from "ai";
import { Icon, getContextIcon, getSuggestionIcon } from "~/lib/components/ui/icon";
import { Fragment, useEffect, useRef, useState } from "react";
import { models, SYSTEM_PROMPT } from "./constants";
import { MessageHandler, type MessageHandlerConfig } from "./message-handler";
import type { UIMessage } from "./types";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { useStorage } from "~/lib/storage";
import { getAllTools } from "~/lib/services/tool-registry";
import { useTranslation, useLanguageChanger } from "~/lib/i18n/hooks";
import type { Language } from "~/lib/i18n/types";
import { useTheme, type Theme } from "~/lib/hooks/use-theme";
import { useTabsSync } from "~/lib/hooks/use-tabs-sync";
import { hostAccessManager, type HostAccessMode, type HostAccessConfig } from "~/lib/services/host-access-manager";

const formatToolOutput = (output: any) => {
  return `
  \`\`\`${typeof output === "string" ? "text" : "json"}
  ${typeof output === "string" ? output : JSON.stringify(output, null, 2)}
  \`\`\`
  `;
};


// Welcome screen component
const WelcomeScreen = ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => {
  const { t } = useTranslation();

  const suggestions = [
    {
      type: "organizeTabs",
      text: t("welcome.organizeTabs"),
    },
    {
      type: "analyzePage",
      text: t("welcome.analyzePage"),
    },
    {
      type: "research",
      text: t("welcome.research"),
    },
    {
      type: "comparePrice",
      text: t("welcome.comparePrice"),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t("welcome.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("welcome.subtitle")}
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Suggestions className="grid gap-3 sm:gap-4 sm:grid-cols-2 w-full">
          {suggestions.map((suggestion, index) => {
            const iconConfig = getSuggestionIcon(suggestion.type);
            return (
              <Suggestion
                key={index}
                suggestion={suggestion.text}
                onClick={onSuggestionClick}
                variant="outline"
                size="lg"
                className={cn(
                  "w-full h-auto justify-start items-center p-4 sm:p-5 rounded-xl border transition-all duration-200",
                  "hover:shadow-md bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm",
                  "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconConfig.bgColor)}>
                    <Icon name={iconConfig.icon as any} className={cn("w-5 h-5", iconConfig.color)} />
                  </div>
                  <div className="text-xs text-left text-gray-700 dark:text-gray-300 flex-1 line-clamp-2 break-words whitespace-normal">
                    {suggestion.text}
                  </div>
                </div>
              </Suggestion>
            );
          })}
        </Suggestions>
      </div>
    </div>
  );
};

const ChatBot = () => {
  const { t, language } = useTranslation()
  const changeLanguage = useLanguageChanger()
  const { theme, setTheme } = useTheme()
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [messageQueue, setMessageQueue] = useState<UIMessage[]>([]);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  const [aiHost, setAiHost, isLoadingHost] = useStorage("aiHost", import.meta.env.VITE_AI_HOST || "https://api.openai.com/v1/chat/completions");
  const [aiToken, setAiToken, isLoadingToken] = useStorage("aiToken", import.meta.env.VITE_AI_TOKEN);
  const [aiModel, setAiModel, isLoadingModel] = useStorage("aiModel", import.meta.env.VITE_AI_MODEL || "deepseek-chat");
  const [isModelButtonHovered, setIsModelButtonHovered] = useState(false);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Update selected model name when aiModel changes
  useEffect(() => {
    const currentModel = models.find(model => model.value === aiModel);
    if (currentModel) {
      setSelectedModelName(currentModel.name);
    }
  }, [aiModel]);

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

  // Settings dialog state
  const [showSettings, setShowSettings] = useState(false);
  const [tempAiHost, setTempAiHost] = useState("");
  const [tempAiToken, setTempAiToken] = useState("");
  const [tempAiModel, setTempAiModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Host access configuration
  const [hostAccessMode, setHostAccessMode] = useState<HostAccessMode>("include-all");
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [whitelistInput, setWhitelistInput] = useState("");
  const [blocklistInput, setBlocklistInput] = useState("");
  const [activeTab, setActiveTab] = useState("general");

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
    // Wait for all settings to load from storage
    if (isLoadingHost || isLoadingToken || isLoadingModel) {
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
      initialAiToken: aiToken || "",
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
  }, [isLoadingHost, isLoadingToken, isLoadingModel, aiModel, aiHost, aiToken]); // ✅ 包含配置值但使用 ref 防止重复初始化

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
    if (isLoadingHost || isLoadingToken || isLoadingModel || !messageHandlerRef.current) {
      return;
    }

    messageHandlerRef.current.updateConfig({
      initialModel: aiModel || "deepseek-chat",
      initialAiHost: aiHost || "https://api.openai.com/v1/chat/completions",
      initialAiToken: aiToken || "",
    });
  }, [aiModel, aiHost, aiToken, isLoadingHost, isLoadingToken, isLoadingModel]);

  const handleSubmit = (message: PromptInputMessage | string) => {
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

  // Load host access settings initially
  useEffect(() => {
    const loadHostAccessSettings = async () => {
      try {
        const config = await hostAccessManager.getConfig();
        setHostAccessMode(config.mode);
        setWhitelist(config.whitelist);
        setBlocklist(config.blocklist);
      } catch (e) {
        console.error("Failed to load host access settings", e);
      }
    };
    loadHostAccessSettings();
  }, []);

  const handleOpenSettings = () => {
    setTempAiHost(aiHost || "");
    setTempAiToken(aiToken || "");
    setTempAiModel(aiModel || "");
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    // Validate AI Model is not empty
    if (!tempAiModel || !tempAiModel.trim()) {
      console.error("AI Model cannot be empty!");
      return;
    }

    setIsSaving(true);
    try {
      // Save AI settings
      setAiHost(tempAiHost);
      setAiToken(tempAiToken);
      setAiModel(tempAiModel);

      // Save host access settings
      await hostAccessManager.updateConfig({
        mode: hostAccessMode,
        whitelist,
        blocklist
      });

      setShowSettings(false);
      console.log("All settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addToWhitelist = () => {
    if (whitelistInput.trim() && !whitelist.includes(whitelistInput.trim())) {
      setWhitelist([...whitelist, whitelistInput.trim()]);
      setWhitelistInput("");
    }
  };

  const removeFromWhitelist = (host: string) => {
    setWhitelist(whitelist.filter(h => h !== host));
  };

  const addToBlocklist = () => {
    if (blocklistInput.trim() && !blocklist.includes(blocklistInput.trim())) {
      setBlocklist([...blocklist, blocklistInput.trim()]);
      setBlocklistInput("");
    }
  };

  const removeFromBlocklist = (host: string) => {
    setBlocklist(blocklist.filter(h => h !== host));
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenSettings}
          className="gap-2"
        >
          <Icon name="settings" size="sm" variant="muted" />
          {t("common.settings")}
        </Button>
        <div className="text-sm font-medium">{t("common.title")}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          className="gap-2"
        >
          <Icon name="plus" size="sm" variant="muted" />
          {t("common.newChat")}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.filter((message) => message.role !== "system").length === 0 ? (
              <WelcomeScreen onSuggestionClick={handleSubmit} />
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
                              <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
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

      <div className="border-t p-4">
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
                  "relative overflow-hidden transition-all duration-300 ease-out",
                  "text-muted-foreground hover:text-foreground",
                  "bg-transparent hover:bg-accent",
                  "border border-transparent hover:border-border",
                  "min-w-[40px] w-auto",
                  isModelButtonHovered || selectedModelName
                    ? "px-3"
                    : "px-2"
                )}
                onMouseEnter={() => setIsModelButtonHovered(true)}
                onMouseLeave={() => setIsModelButtonHovered(false)}
                onClick={() => setIsCommandOpen(true)}
              >
                <div className="flex items-center gap-2 transition-all duration-300">
                  <Icon name="bot" size="sm" variant="muted" />
                  <span
                    className={cn(
                      "transition-all duration-300 overflow-hidden whitespace-nowrap",
                      isModelButtonHovered || selectedModelName
                        ? "max-w-[120px] opacity-100"
                        : "max-w-0 opacity-0"
                    )}
                  >
                    {selectedModelName || "models"}
                  </span>
                </div>
              </Button>
            </PromptInputTools>
            <Button
              type="submit"
              size="sm"
              disabled={!input && status === "idle"}
              onClick={status === "streaming" ? handleStop : undefined}
              className={cn(
                "transition-all duration-200 rounded-full aspect-square w-8 h-8 p-0 flex items-center justify-center",
                status === "streaming"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              {status === "streaming" ? (
                <Icon name="x" size="sm" className="text-current" />
              ) : (
                <Icon name="chevronUp" size="sm" className="text-current" />
              )}
            </Button>
          </PromptInputToolbar>
        </PromptInput>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("settings.title")}</DialogTitle>
            <DialogDescription>{t("settings.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tab Navigation */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "general"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "security"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Security
              </button>
            </div>

            {/* General Tab Content */}
            {activeTab === "general" && (
              <div className="space-y-4 py-4">
                {/* Language Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("settings.language")}</label>
                  <Select value={language} onValueChange={(value) => changeLanguage(value as Language)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("language.en")}</SelectItem>
                      <SelectItem value="zh">{t("language.zh")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("settings.theme")}</label>
                  <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t("theme.light")}</SelectItem>
                      <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                      <SelectItem value="system">{t("theme.system")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Host */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("settings.aiHost")}</label>
                  <Input
                    value={tempAiHost}
                    onChange={(e) => setTempAiHost(e.target.value)}
                    placeholder={t("settings.hostPlaceholder")}
                  />
                </div>

                {/* AI Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("settings.aiToken")}</label>
                  <Input
                    type="password"
                    value={tempAiToken}
                    onChange={(e) => setTempAiToken(e.target.value)}
                    placeholder={t("settings.tokenPlaceholder")}
                  />
                </div>

                {/* AI Model */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("settings.aiModel")}</label>
                  <Input
                    value={tempAiModel}
                    onChange={(e) => setTempAiModel(e.target.value)}
                    placeholder={t("settings.modelPlaceholder")}
                  />
                </div>
              </div>
            )}

            {/* Security Tab Content */}
            {activeTab === "security" && (
              <div className="space-y-4 py-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Host Access Security</h3>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Host Access Mode</label>
                    <Select value={hostAccessMode} onValueChange={(value) => setHostAccessMode(value as HostAccessMode)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="include-all">Include All Hosts</SelectItem>
                        <SelectItem value="whitelist">Whitelist Mode</SelectItem>
                        <SelectItem value="blocklist">Blocklist Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {hostAccessMode === "include-all" && "AI can access any website"}
                      {hostAccessMode === "whitelist" && "AI can only access whitelisted hosts"}
                      {hostAccessMode === "blocklist" && "AI cannot access blocklisted hosts"}
                    </p>
                  </div>

                  {hostAccessMode === "whitelist" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Whitelist</label>
                      <div className="flex gap-2">
                        <Input
                          value={whitelistInput}
                          onChange={(e) => setWhitelistInput(e.target.value)}
                          placeholder="example.com"
                          onKeyPress={(e) => e.key === 'Enter' && addToWhitelist()}
                        />
                        <Button
                          onClick={addToWhitelist}
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {whitelist.map((host, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
                            <span className="text-sm">{host}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromWhitelist(host)}
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hostAccessMode === "blocklist" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Blocklist</label>
                      <div className="flex gap-2">
                        <Input
                          value={blocklistInput}
                          onChange={(e) => setBlocklistInput(e.target.value)}
                          placeholder="example.com"
                          onKeyPress={(e) => e.key === 'Enter' && addToBlocklist()}
                        />
                        <Button
                          onClick={addToBlocklist}
                          size="sm"
                        >
                          Add
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {blocklist.map((host, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md">
                            <span className="text-sm">{host}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromBlocklist(host)}
                              className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Command Dialog for Model Selection */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Search models..." />
        <CommandList>
          <CommandEmpty>No models found.</CommandEmpty>
          {/* Group models by provider */}
          {Array.from(new Set(models.map(model => model.provider))).map(provider => (
            <CommandGroup key={provider} heading={provider}>
              {models
                .filter(model => model.provider === provider)
                .map(model => (
                  <CommandItem
                    key={model.value}
                    value={model.name}
                    onSelect={() => {
                      setAiModel(model.value);
                      setSelectedModelName(model.name);
                      setIsCommandOpen(false);
                    }}
                    className={cn(
                      "cursor-pointer",
                      aiModel === model.value && "bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      {aiModel === model.value && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted">
                          <Icon name="check" size="xs" variant="muted" />
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
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
