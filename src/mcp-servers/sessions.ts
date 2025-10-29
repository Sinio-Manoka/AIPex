/**
 * Get all sessions
 */
export async function getAllSessions(): Promise<{
  success: boolean
  sessions?: Array<{
    sessionId: string
    tab: {
      id: number
      windowId: number
      title: string
      url: string
    }
    lastModified: number
  }>
  error?: string
}> {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed()

    const sessionData = sessions
      .filter((session: any) => session.tab)
      .map((session: any) => ({
        sessionId: session.sessionId,
        tab: {
          id: session.tab.id || 0,
          windowId: session.tab.windowId || 0,
          title: session.tab.title || '',
          url: session.tab.url || ''
        },
        lastModified: session.lastModified || 0
      }))

    return { success: true, sessions: sessionData }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<{
  success: boolean
  session?: {
    sessionId: string
    tab: {
      id: number
      windowId: number
      title: string
      url: string
    }
    lastModified: number
  }
  error?: string
}> {
  try {
    const session = await chrome.sessions.restore(sessionId) as any

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        tab: session.tab ? {
          id: session.tab.id || 0,
          windowId: session.tab.windowId || 0,
          title: session.tab.title || "",
          url: session.tab.url || ""
        } : {
          id: 0,
          windowId: 0,
          title: "",
          url: ""
        },
        lastModified: session.lastModified || 0
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Restore session
 */
export async function restoreSession(sessionId: string): Promise<{
  success: boolean
  session?: {
    sessionId: string
    tab: {
      id: number
      windowId: number
      title: string
      url: string
    }
  }
  error?: string
}> {
  try {
    const session = await chrome.sessions.restore(sessionId) as any

    return {
      success: true,
      session: {
        sessionId: session.sessionId,
        tab: session.tab ? {
          id: session.tab.id || 0,
          windowId: session.tab.windowId || 0,
          title: session.tab.title || "",
          url: session.tab.url || ""
        } : {
          id: 0,
          windowId: 0,
          title: "",
          url: ""
        },
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get current device
 */
export async function getCurrentDevice(): Promise<{
  success: boolean
  device?: {
    id: string
    name: string
    type: string
    os: string
  }
  error?: string
}> {
  try {
    const devices = await chrome.sessions.getDevices()
    const device = devices[0] as any // Get the first device

    return {
      success: true,
      device: {
        id: device.id,
        name: device.name,
        type: device.type,
        os: device.os
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get all devices
 */
export async function getAllDevices(): Promise<{
  success: boolean
  devices?: Array<{
    id: string
    name: string
    type: string
    os: string
  }>
  error?: string
}> {
  try {
    const devices = await chrome.sessions.getDevices()

    return {
      success: true,
      devices: devices.map((device: any) => ({
        id: device.id,
        name: device.name,
        type: device.type,
        os: device.os
      }))
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
