export type Language = 'en' | 'de'

export interface TranslationResources {
  common: {
    title: string
    settings: string
    newChat: string
    close: string
    save: string
    saving: string
    cancel: string
    send: string
    stop: string
    processing: string
    noActions: string
  }
  settings: {
    title: string
    subtitle: string
    language: string
    theme: string
    aiHost: string
    aiToken: string
    aiModel: string
    hostPlaceholder: string
    tokenPlaceholder: string
    modelPlaceholder: string
    saveSuccess: string
    saveError: string
  }
  theme: {
    light: string
    dark: string
    system: string
  }
  tooltip: {
    newChat: string
    settings: string
    close: string
    stopResponse: string
  }
  ai: {
    thinking: string
    streamingResponse: string
    realtimeExecution: string
    planningAgent: string
    enhancedPlanning: string
  }
  language: {
    en: string
  }
  input: {
    newLine: string
    placeholder1: string
    placeholder2: string
    placeholder3: string
  }
  welcome: {
    title: string
    subtitle: string
  }
  tools: {
    [key: string]: string
  }
  providers: {
    searchPlaceholder: string
    noProvidersFound: string
    manageProvider: string
    modifyApiKey: string
    deleteApiKey: string
    backToProviders: string
    aiProviders: string
    loadingProviders: string
    addNewKey: string
    addApiKeyFor: string
    enterApiKey: string
    back: string
    addKey: string
    modelsFor: string
    loadingModels: string
    noModelsAvailable: string
  }
}

export type TranslationKey =
  | 'common.title'
  | 'common.settings'
  | 'common.newChat'
  | 'common.close'
  | 'common.save'
  | 'common.saving'
  | 'common.cancel'
  | 'common.send'
  | 'common.stop'
  | 'common.processing'
  | 'common.noActions'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.language'
  | 'settings.theme'
  | 'settings.aiHost'
  | 'settings.aiToken'
  | 'settings.aiModel'
  | 'settings.hostPlaceholder'
  | 'settings.tokenPlaceholder'
  | 'settings.modelPlaceholder'
  | 'settings.saveSuccess'
  | 'settings.saveError'
  | 'theme.light'
  | 'theme.dark'
  | 'theme.system'
  | 'tooltip.newChat'
  | 'tooltip.settings'
  | 'tooltip.close'
  | 'tooltip.stopResponse'
  | 'ai.thinking'
  | 'ai.streamingResponse'
  | 'ai.realtimeExecution'
  | 'ai.planningAgent'
  | 'ai.enhancedPlanning'
  | 'language.en'
  | 'language.de'
  | 'input.newLine'
  | 'input.placeholder1'
  | 'input.placeholder2'
  | 'input.placeholder3'
  | 'welcome.title'
  | 'welcome.subtitle'
  | 'providers.searchPlaceholder'
  | 'providers.noProvidersFound'
  | 'providers.manageProvider'
  | 'providers.modifyApiKey'
  | 'providers.deleteApiKey'
  | 'providers.backToProviders'
  | 'providers.aiProviders'
  | 'providers.loadingProviders'
  | 'providers.addNewKey'
  | 'providers.addApiKeyFor'
  | 'providers.enterApiKey'
  | 'providers.back'
  | 'providers.addKey'
  | 'providers.modelsFor'
  | 'providers.loadingModels'
  | 'providers.noModelsAvailable'

export interface I18nContextValue {
  language: Language
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  changeLanguage: (lang: Language) => Promise<void>
  isChangingLanguage: boolean
}