import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgentInterface, openAIAdapter, openAIMessageFormat, openuiChatLibrary, useThemeModePreference } from '@openuidev/react-ui'
import { useThread, useThreadList } from '@openuidev/react-headless'
import '@openuidev/react-ui/styles/index.css'
import { browserChatStorage } from './chatStorage'
import { modelDefaults, providerIds } from './config/models'
import ModelSwitcher from './components/ModelSwitcher'
import StructuredAssistantMessage from './components/StructuredAssistantMessage'
import { generateAssistantReply } from './services/aiService'
import { fetchUserCampaigns, isAskingForCampaigns } from './services/qoruzService'
import { listGeminiModels } from './services/geminiService'
import { listOllamaModels } from './services/ollamaService'
import { listGroqModels } from './services/groqService'

const providerStorageKey = 'qoruz-ai-provider'
const modelStorageKey = 'qoruz-ai-model-configs'
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
const profileName = import.meta.env.VITE_PROFILE_NAME || 'Your profile'
const profileEmail = import.meta.env.VITE_PROFILE_EMAIL || 'Email not set'
const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'Q'
const assistantInstruction = 'You are Qoruz AI, an influencer intelligence assistant focused on Instagram and YouTube creator discovery, campaign research, content ideas, and planning. Use only data explicitly supplied in the conversation or connected results. Clearly label illustrative examples and recommendations. Never claim access to live Qoruz data unless it is provided.'
const starterPrompts = [
  { displayText: 'Find creators', prompt: 'Find beauty and lifestyle creators in Mumbai on Instagram.' },
  { displayText: 'Campaign insights', prompt: 'Show my active campaigns and performance metrics.' },
  { displayText: 'Compare platforms', prompt: 'Compare creator engagement rates between Instagram and YouTube.' },
  { displayText: 'Plan a campaign', prompt: 'Plan an Instagram & YouTube campaign roadmap with budget split.' },
]

function readModelConfigs() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(modelStorageKey) || '{}')
    return Object.fromEntries(providerIds.map((id) => [id, { ...modelDefaults[id], ...(stored[id] || {}) }]))
  } catch {
    return modelDefaults
  }
}

function toText(content) {
  if (typeof content === 'string') return content
  return Array.isArray(content) ? content.map((part) => part?.text || '').join('\n') : ''
}

function chatResponse(content, model) {
  const id = `chatcmpl-${crypto.randomUUID()}`
  const created = Math.floor(Date.now() / 1000)
  const frames = [
    { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', content }, finish_reason: null }] },
    { id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
  ].map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join('') + 'data: [DONE]\n\n'
  return new Response(frames, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' } })
}

function chatError(error) {
  const message = error instanceof Error ? error.message : 'The selected AI model could not complete the request.'
  return new Response(JSON.stringify({ error: message }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' },
  })
}

function PersistCurrentThread() {
  const threadId = useThreadList((state) => state.selectedThreadId)
  const messages = useThread((state) => state.messages)
  useEffect(() => {
    if (threadId && messages.length) browserChatStorage.thread.saveMessages(threadId, messages)
  }, [threadId, messages])
  return null
}

function App() {
  const [provider, setProvider] = useState(() => {
    const saved = window.localStorage.getItem(providerStorageKey)
    return providerIds.includes(saved) ? saved : 'gemini'
  })
  const [modelConfigs, setModelConfigs] = useState(readModelConfigs)
  const [modelLists, setModelLists] = useState({ gemini: [], ollama: [], groq: [] })
  const [modelListState, setModelListState] = useState({ status: 'idle', error: '' })
  const [modelListRefresh, setModelListRefresh] = useState(0)
  const inFlight = useRef(false)
  const { mode, setPreference } = useThemeModePreference()

  useEffect(() => {
    const controller = new AbortController()
    setModelListState({ status: 'loading', error: '' })
    const loadModels = provider === 'gemini'
      ? listGeminiModels({ apiKey: geminiApiKey, signal: controller.signal })
      : provider === 'ollama'
        ? listOllamaModels({ signal: controller.signal })
        : listGroqModels({ signal: controller.signal })
    loadModels.then((models) => {
      setModelLists((current) => ({ ...current, [provider]: models }))
      setModelListState({ status: 'loaded', error: '' })
      if (provider === 'ollama' && models.length && !models.includes(modelConfigs.ollama.model)) {
        const availableDefault = models.includes(modelDefaults.ollama.model) ? modelDefaults.ollama.model : models[0]
        setModelConfigs((current) => {
          const next = { ...current, ollama: { ...current.ollama, model: availableDefault } }
          window.localStorage.setItem(modelStorageKey, JSON.stringify(next))
          return next
        })
      }
      if (provider === 'groq' && models.length && !models.includes(modelConfigs.groq.model)) {
        const availableDefault = models.includes(modelDefaults.groq.model) ? modelDefaults.groq.model : models[0]
        setModelConfigs((current) => {
          const next = { ...current, groq: { ...current.groq, model: availableDefault } }
          window.localStorage.setItem(modelStorageKey, JSON.stringify(next))
          return next
        })
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setModelListState({ status: 'error', error: error.message || 'Could not load models.' })
    })
    return () => controller.abort()
  }, [provider, modelListRefresh])

  const handleProviderChange = useCallback((nextProvider) => {
    if (!providerIds.includes(nextProvider)) return
    window.localStorage.setItem(providerStorageKey, nextProvider)
    setProvider(nextProvider)
  }, [])
  const handleModelConfigChange = useCallback((providerId, field, value) => {
    setModelConfigs((current) => {
      const next = { ...current, [providerId]: { ...current[providerId], [field]: value } }
      window.localStorage.setItem(modelStorageKey, JSON.stringify(next))
      return next
    })
  }, [])

  const llm = useMemo(() => ({
    streamProtocol: openAIAdapter(),
    send: async ({ threadId, messages, signal }) => {
      if (inFlight.current) return chatError(new Error('A response is already in progress. Wait for it to finish or cancel it before retrying.'))
      inFlight.current = true
      try {
        const apiMessages = openAIMessageFormat.toApi(messages)
        const history = apiMessages
          .filter(({ role }) => role === 'user' || role === 'assistant')
          .slice(-24)
          .map(({ role, content }) => ({ role, content: toText(content).slice(0, 12000) }))
        const latestPrompt = [...history].reverse().find((message) => message.role === 'user')?.content || ''
        let contextualHistory = history

        if (isAskingForCampaigns(latestPrompt)) {
          const campaignResult = await fetchUserCampaigns({ signal })
          if (campaignResult.success && campaignResult.campaigns?.length > 0) {
            contextualHistory = [
              ...history.slice(0, -1),
              {
                role: 'user',
                content: `${latestPrompt}\n\n[Verified Qoruz API Campaigns Data]:\n${JSON.stringify(campaignResult.campaigns, null, 2)}\nPresent these campaigns clearly using OpenUI components (CardHeader, Table, Steps, etc.).`,
              },
            ]
          } else if (campaignResult.success && (!campaignResult.campaigns || campaignResult.campaigns.length === 0)) {
            contextualHistory = [
              ...history.slice(0, -1),
              {
                role: 'user',
                content: `${latestPrompt}\n\n[Qoruz API Status]: Query was successful, but 0 active campaigns were found for your account. Inform the user that no active campaigns currently exist in their Qoruz account.`,
              },
            ]
          } else {
            contextualHistory = [
              ...history.slice(0, -1),
              {
                role: 'user',
                content: `${latestPrompt}\n\n[Qoruz API Status]: Could not retrieve live campaigns: ${campaignResult.error}. Inform the user clearly that live campaign data requires configuring VITE_QORUZ_API_KEY in the .env file. Do not invent fake campaigns or metrics.`,
              },
            ]
          }
        }

        const rawText = await generateAssistantReply({
          provider,
          modelConfig: modelConfigs[provider],
          apiKey: geminiApiKey,
          systemInstruction: assistantInstruction,
          messages: contextualHistory,
          signal,
        })
        return chatResponse(rawText, modelConfigs[provider].model || provider)
      } catch (error) {
        if (signal?.aborted) throw error
        return chatError(error)
      } finally {
        inFlight.current = false
      }
    },
  }), [modelConfigs, provider])

  const starters = starterPrompts
  const workspaceSwitchers = <div className="qoruz-workspace-switchers">
    <ModelSwitcher provider={provider} modelConfigs={modelConfigs} modelOptions={modelLists[provider]} modelListState={modelListState} onRefreshModels={() => setModelListRefresh((count) => count + 1)} onProviderChange={handleProviderChange} onModelConfigChange={handleModelConfigChange} />
  </div>

  return (
    <AgentInterface llm={llm} storage={browserChatStorage} componentLibrary={openuiChatLibrary} agentName="Qoruz AI" logoUrl="https://terareach.s3.ap-southeast-1.amazonaws.com/qoruz/Logo3.png" theme={{ mode }} components={{ AssistantMessage: StructuredAssistantMessage }} starters={starters} starterVariant="card" scrollVariant="always">
      <AgentInterface.Sidebar>
        <AgentInterface.SidebarHeader agentName={<span className="qoruz-sidebar-title">Qoruz AI</span>} className="qoruz-sidebar-header" />
        <AgentInterface.SidebarContent>
          <PersistCurrentThread />
          <AgentInterface.NewChatButton />
          <AgentInterface.SidebarSeparator />
          <AgentInterface.ThreadList />
        </AgentInterface.SidebarContent>
        <AgentInterface.SidebarFooter>
          <div className="qoruz-sidebar-account">
            <div className="qoruz-sidebar-profile">
              <div className="qoruz-sidebar-profile__avatar" aria-hidden="true">{profileInitials}</div>
              <div className="qoruz-sidebar-profile__details">
                <span className="qoruz-sidebar-profile__name">{profileName}</span>
                <span className="qoruz-sidebar-profile__email">{profileEmail}</span>
              </div>
            </div>
            <AgentInterface.ThemeModeToggle className="qoruz-sidebar-theme-toggle" mode={mode} onModeChange={setPreference} />
          </div>
        </AgentInterface.SidebarFooter>
      </AgentInterface.Sidebar>
      <AgentInterface.MobileHeader actions={workspaceSwitchers} />
      <AgentInterface.ThreadHeader start={workspaceSwitchers} />
      <AgentInterface.Welcome title="Make creator marketing work smarter." description="Find the right creators, plan campaigns, and turn performance data into your next move." starters={starters} starterVariant="card" />
    </AgentInterface>
  )
}

export default App
