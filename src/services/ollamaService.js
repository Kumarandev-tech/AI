function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function listOllamaModels({ signal } = {}) {
  let response;
  try {
    response = await fetch("/ollama/v1/models", {
      headers: { Accept: "application/json" },
      signal: requestSignal(signal, 15000),
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    if (error.name === "TimeoutError")
      throw new Error(
        "Ollama Cloud model list timed out. Check your network connection.",
      );
    throw new Error(
      "Could not reach Ollama Cloud. Check your network connection and OLLAMA_API_KEY.",
    );
  }
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Ollama Cloud rejected the API key. Check OLLAMA_API_KEY in .env and restart Vite."
        : `Ollama Cloud returned HTTP ${response.status} while loading models.`,
    );
  const payload = await response.json();
  return [
    ...new Set(
      (Array.isArray(payload.data) ? payload.data : [])
        .map((model) => model.id)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export async function requestOllama({
  model,
  systemInstruction,
  messages,
  signal,
}) {
  const configuredModel = model?.trim();
  if (!configuredModel)
    throw new Error("Choose an Ollama Cloud model before sending a message.");

  let response;
  try {
    response = await fetch(
      import.meta.env.VITE_OLLAMA_API_URL || "/ollama/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: configuredModel,
          messages: [
            { role: "system", content: systemInstruction },
            ...messages.map(({ role, content }) => ({ role, content })),
          ],
          stream: false,
        }),
        signal: requestSignal(signal, 90000),
      },
    );
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    if (error.name === "TimeoutError")
      throw new Error(
        "Ollama Cloud did not respond within 90 seconds. Try again later.",
      );
    throw new Error(
      "Could not connect to Ollama Cloud. Check your network connection and OLLAMA_API_KEY.",
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `Ollama Cloud returned HTTP ${response.status}.`;
    throw new Error(
      response.status === 404
        ? `Ollama Cloud model “${configuredModel}” was not found or is unavailable to this account.`
        : response.status === 401 || response.status === 403
          ? "Ollama Cloud rejected the API key. Check OLLAMA_API_KEY in .env and restart Vite."
          : message,
    );
  }

  const payload = await response.json();
  if (typeof payload.choices?.[0]?.message?.content !== "string")
    throw new Error("Ollama Cloud returned an empty chat response.");
  return payload.choices[0].message.content;
}
