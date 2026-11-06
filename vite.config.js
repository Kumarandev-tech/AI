import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ollamaCloudProxy = {
    target: 'https://ollama.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/ollama/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest) => {
        if (env.OLLAMA_API_KEY) proxyRequest.setHeader('Authorization', `Bearer ${env.OLLAMA_API_KEY}`)
      })
    },
  }
  const groqCloudProxy = {
    target: 'https://api.groq.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/groq/, '/openai'),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest) => {
        if (env.GROQ_API_KEY) proxyRequest.setHeader('Authorization', `Bearer ${env.GROQ_API_KEY}`)
      })
    },
  }

  return {
    plugins: [react()],
    server: { proxy: { '/ollama': ollamaCloudProxy, '/groq': groqCloudProxy } },
    preview: { proxy: { '/ollama': ollamaCloudProxy, '/groq': groqCloudProxy } },
  }
})
