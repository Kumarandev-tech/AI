const storageKey = 'qoruz-ai-chat-history-v1'

const readHistory = () => {
  try {
    const value = localStorage.getItem(storageKey)
    if (!value) return { threads: [], messagesByThread: {} }
    const parsed = JSON.parse(value)
    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      messagesByThread: parsed.messagesByThread && typeof parsed.messagesByThread === 'object'
        ? parsed.messagesByThread
        : {},
    }
  } catch {
    return { threads: [], messagesByThread: {} }
  }
}

const writeHistory = (history) => localStorage.setItem(storageKey, JSON.stringify(history))

export const browserChatStorage = {
  thread: {
    async listThreads() {
      return { threads: readHistory().threads }
    },
    async createThread(firstMessage) {
      const history = readHistory()
      const thread = {
        id: crypto.randomUUID(),
        title: typeof firstMessage.content === 'string' ? firstMessage.content.slice(0, 40) || 'New thread' : 'New thread',
        createdAt: new Date().toISOString(),
      }
      history.threads = [thread, ...history.threads]
      history.messagesByThread[thread.id] = [{ ...firstMessage, id: firstMessage.id || crypto.randomUUID() }]
      writeHistory(history)
      return thread
    },
    async getMessages(threadId) {
      return readHistory().messagesByThread[threadId] || []
    },
    async updateThread(thread) {
      const history = readHistory()
      history.threads = history.threads.map((item) => item.id === thread.id ? thread : item)
      writeHistory(history)
      return thread
    },
    async deleteThread(threadId) {
      const history = readHistory()
      history.threads = history.threads.filter((thread) => thread.id !== threadId)
      delete history.messagesByThread[threadId]
      writeHistory(history)
    },
    saveMessages(threadId, messages) {
      const history = readHistory()
      if (history.threads.some((thread) => thread.id === threadId)) {
        history.messagesByThread[threadId] = messages
        writeHistory(history)
      }
    },
  },
}
