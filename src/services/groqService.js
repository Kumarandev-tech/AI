function requestSignal(signal, timeoutMs) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function groqError(response, model) {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    return new Error(
      "Groq rejected the API key. Check GROQ_API_KEY in .env and restart Vite.",
    );
  }
  if (response.status === 404)
    return new Error(
      `Groq model “${model}” was not found or is not available to this account.`,
    );
  if (response.status === 429)
    return new Error(
      "Groq rate limit or quota reached. Wait or choose another provider.",
    );
  return new Error(
    payload.error?.message || `Groq returned HTTP ${response.status}.`,
  );
}

export async function listGroqModels({ signal } = {}) {
  let response;
  try {
    response = await fetch("/groq/v1/models", {
      headers: { Accept: "application/json" },
      signal: requestSignal(signal, 15000),
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    if (error.name === "TimeoutError")
      throw new Error(
        "Groq model list timed out. Check your network connection.",
      );
    throw new Error(
      "Could not reach Groq. Check your network connection and GROQ_API_KEY.",
    );
  }
  if (!response.ok) throw await groqError(response, "");
  const payload = await response.json();
  return [
    ...new Set(
      (Array.isArray(payload.data) ? payload.data : [])
        .filter(
          (model) =>
            model.active !== false &&
            !/(whisper|speech|tts|orpheus)/i.test(model.id || ""),
        )
        .map((model) => model.id)
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export async function requestGroq({
  model,
  systemInstruction,
  messages,
  signal,
}) {
  const configuredModel = model?.trim();
  if (!configuredModel)
    throw new Error("Choose a Groq model before sending a message.");

  let response;
  try {
    response = await fetch("/groq/v1/chat/completions", {
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
    });
  } catch (error) {
    if (signal?.aborted) throw signal.reason || error;
    if (error.name === "TimeoutError")
      throw new Error(
        "Groq did not respond within 90 seconds. Try again later.",
      );
    throw new Error(
      "Could not connect to Groq. Check your network connection and GROQ_API_KEY.",
    );
  }

  if (!response.ok) throw await groqError(response, configuredModel);
  const payload = await response.json();
  if (typeof payload.choices?.[0]?.message?.content !== "string")
    throw new Error("Groq returned an empty chat response.");
  return payload.choices[0].message.content;
}
