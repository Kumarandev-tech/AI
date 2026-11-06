export const modelDefaults = {
  gemini: {
    label: 'Gemini',
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-3.6-flash',
  },
  ollama: {
    label: 'Ollama Cloud',
    model: import.meta.env.VITE_OLLAMA_MODEL || 'gpt-oss:120b',
  },
  groq: {
    label: 'Groq',
    model: import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b',
  },
}

export const providerIds = Object.keys(modelDefaults)
