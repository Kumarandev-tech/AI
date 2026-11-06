import { GoogleGenAI } from "@google/genai";

export async function listGeminiModels({ apiKey, signal }) {
  if (!apiKey?.trim())
    throw new Error(
      "Add VITE_GEMINI_API_KEY to load models available to your Gemini key.",
    );
  const client = new GoogleGenAI({ apiKey: apiKey.trim() });
  try {
    const pager = await client.models.list({
      config: { pageSize: 100, abortSignal: signal },
    });
    const models = [];
    for await (const model of pager) {
      if (model.supportedActions?.includes("generateContent") && model.name) {
        models.push(model.name.replace(/^models\//, ""));
      }
    }
    return [...new Set(models)].sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    const status = Number(error.status || error.response?.status);
    if (status === 401 || status === 403)
      throw new Error(
        "Gemini rejected the API key. Check VITE_GEMINI_API_KEY.",
      );
    throw new Error(
      error.message ||
        "Could not load Gemini models. Check the API key and network connection.",
    );
  }
}

export async function requestGemini({
  apiKey,
  model,
  systemInstruction,
  messages,
  signal,
}) {
  if (!apiKey?.trim()) {
    throw new Error(
      "Gemini is not configured. Add VITE_GEMINI_API_KEY to .env.local and restart Vite. This key is exposed to the browser and is for local prototyping only.",
    );
  }
  if (!model?.trim())
    throw new Error("Choose a Gemini model before sending a message.");

  const client = new GoogleGenAI({ apiKey: apiKey.trim() });
  const requestTimeout = AbortSignal.timeout(90000);
  const requestAbortSignal = signal
    ? AbortSignal.any([signal, requestTimeout])
    : requestTimeout;
  try {
    const response = await client.models.generateContent({
      model: model.trim(),
      contents: messages.map(({ role, content }) => ({
        role: role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      })),
      config: {
        systemInstruction,
        abortSignal: requestAbortSignal,
      },
    });
    const text = response.text || "";
    if (!text.trim()) {
      return "The model returned an empty response. Please try again.";
    }
    return text;
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    if (error.name === "TimeoutError")
      throw new Error(
        "Gemini did not respond within 90 seconds. Try again or choose Ollama.",
      );
    const status = Number(error.status || error.response?.status);
    if (status === 401 || status === 403)
      throw new Error(
        "Gemini rejected the API key. Check VITE_GEMINI_API_KEY in your local environment.",
      );
    if (status === 404)
      throw new Error(
        `Gemini model “${model.trim()}” was not found. Choose a model available to your API key.`,
      );
    if (status === 429)
      throw new Error(
        "Gemini rate limit or quota reached. Wait or switch to Ollama.",
      );
    throw new Error(
      error.message ||
        "Gemini could not complete the request. Check the model and network connection.",
    );
  }
}
