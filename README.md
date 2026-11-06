# Qoruz AI Agents prototype

A React and Vite prototype with five focused creator-marketing agents and three independent cloud model choices: Gemini, Ollama Cloud, and Groq. It uses the existing OpenUI chat shell and keeps conversation history per agent in browser local storage.

## Local setup

1. Use Node.js 22.23.3 (`nvm use`).
2. Copy `.env.example` to `.env.local`.
3. For Gemini, set `VITE_GEMINI_API_KEY` and, if needed, `VITE_GEMINI_MODEL` in `.env.local`. Vite embeds `VITE_` variables into browser code. This is only suitable for a restricted local prototype; never use a production Gemini key this way or commit `.env.local`.
4. For Ollama Cloud, set `OLLAMA_API_KEY` in `.env.local` and choose a cloud model such as `gpt-oss:120b` in the model controls. The Vite dev and preview proxies attach the key on the server side; it is not exposed as a `VITE_` variable.
5. For Groq, set `GROQ_API_KEY` in `.env.local`. The model selector loads active chat models from Groq.
6. Run `npm run dev` and open the Vite URL, normally `http://localhost:5173`.

Gemini uses the installed `@google/genai` browser SDK directly. Ollama Cloud and Groq use their OpenAI-compatible APIs through same-origin Vite proxies. Provider selection is independent of the selected agent and is saved locally. A provider is only considered usable after it returns a real request; configuration and network errors are shown in the chat.

## Agents and data

- **Influencer Discovery:** creator fit guidance and fictional creator cards for demonstrating the UI.
- **Campaign Research:** performance analysis guidance and illustrative sample metrics/charts.
- **Competitor Intelligence:** general competitor research frameworks, without claims of live findings.
- **Campaign Planning:** campaign briefs and timelines. When a budget is supplied, JavaScript calculates an explicitly labeled recommendation split.
- **Content Intelligence:** generated themes and formats, not claimed as published or trending content.

This prototype does not call Qoruz APIs, use a database, or use external search. All sample records and metrics are labeled illustrative. Models must not present them as live Qoruz information. Conversation threads are stored in browser local storage on this device.

## Security boundary

The Gemini key is sent from the browser in this development prototype and is visible to anyone who can inspect the built client. Use a restricted, low-quota development key and rotate it if exposed. `OLLAMA_API_KEY` and `GROQ_API_KEY` stay on the Vite server during development. A production deployment needs a secured backend proxy for the cloud providers; the Vite proxy is not included in a static build.

## Checks

- `npm run lint`
- `npm run build`
