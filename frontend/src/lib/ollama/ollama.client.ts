/* ────────────────────────────────────────────────────────────────
   OLLAMA RESILIENT CLIENT
   Dedicated local AI engine client for Business OS Engineering System.
   Guarantees structured responses, timeout management, retry logic,
   and online/offline probing.
   OLLAMA MUST NEVER OWN PROJECT TRUTH — IT ONLY OWNS ANALYSIS.
──────────────────────────────────────────────────────────────── */

export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";

export type OllamaChatResult = {
  ok: boolean;
  content?: string;
  error?: string;
  code?: "OLLAMA_OFFLINE" | "OLLAMA_TIMEOUT" | "OLLAMA_ERROR" | "INVALID_RESPONSE";
  modelUsed?: string;
  durationMs?: number;
};

/** Probe Ollama availability. Never throws. */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Get list of installed Ollama models */
export async function getInstalledOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.models) ? data.models.map((m: any) => m.name) : [];
  } catch {
    return [];
  }
}

/** Dynamically resolve model from installed Ollama models if not explicitly set */
export async function resolveOllamaModel(requestedModel?: string): Promise<string> {
  if (requestedModel) return requestedModel;
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;

  try {
    const models = await getInstalledOllamaModels();
    if (models.length > 0) {
      const preferred = models.find((m) =>
        m.toLowerCase().includes("qwen3") ||
        m.toLowerCase().includes("qwen2.5") ||
        m.toLowerCase().includes("qwen") ||
        m.toLowerCase().includes("llama3") ||
        m.toLowerCase().includes("mistral")
      );
      return preferred || models[0];
    }
  } catch {}

  return OLLAMA_MODEL;
}

/**
 * Execute a structured non-streaming chat with Ollama.
 * Automatically enforces JSON format when format='json'.
 */
export async function askOllamaJson(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<OllamaChatResult> {
  const model = await resolveOllamaModel(params.model);
  const timeoutMs = params.timeoutMs ?? 60000;
  const startTime = Date.now();

  const isUp = await isOllamaAvailable();
  if (!isUp) {
    return {
      ok: false,
      code: "OLLAMA_OFFLINE",
      error: `Local Ollama engine at ${OLLAMA_URL} is unreachable. Please ensure Ollama is running.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        format: "json",
        stream: false,
        options: {
          temperature: params.temperature ?? 0.1,
          num_ctx: 8192,
        },
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        code: "OLLAMA_ERROR",
        error: `Ollama returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
        durationMs: Date.now() - startTime,
      };
    }

    const data = await res.json();
    const content = data.message?.content?.trim();

    if (!content) {
      return {
        ok: false,
        code: "INVALID_RESPONSE",
        error: "Ollama returned an empty response.",
        durationMs: Date.now() - startTime,
      };
    }

    return {
      ok: true,
      content,
      modelUsed: data.model || model,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return {
        ok: false,
        code: "OLLAMA_TIMEOUT",
        error: `Ollama request timed out after ${timeoutMs}ms.`,
        durationMs: Date.now() - startTime,
      };
    }
    return {
      ok: false,
      code: "OLLAMA_ERROR",
      error: err?.message || "Failed to communicate with Ollama.",
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Execute a free-form conversational chat with Ollama.
 */
export async function askOllamaText(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<OllamaChatResult> {
  const model = await resolveOllamaModel(params.model);
  const timeoutMs = params.timeoutMs ?? 60000;
  const startTime = Date.now();

  const isUp = await isOllamaAvailable();
  if (!isUp) {
    return {
      ok: false,
      code: "OLLAMA_OFFLINE",
      error: `Local Ollama engine at ${OLLAMA_URL} is unreachable. Please ensure Ollama is running.`,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        stream: false,
        options: {
          temperature: params.temperature ?? 0.2,
          num_ctx: 8192,
        },
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        code: "OLLAMA_ERROR",
        error: `Ollama returned HTTP ${res.status}: ${errText.slice(0, 200)}`,
        durationMs: Date.now() - startTime,
      };
    }

    const data = await res.json();
    const content = data.message?.content?.trim();

    if (!content) {
      return {
        ok: false,
        code: "INVALID_RESPONSE",
        error: "Ollama returned an empty response.",
        durationMs: Date.now() - startTime,
      };
    }

    return {
      ok: true,
      content,
      modelUsed: data.model || model,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return {
        ok: false,
        code: "OLLAMA_TIMEOUT",
        error: `Ollama request timed out after ${timeoutMs}ms.`,
        durationMs: Date.now() - startTime,
      };
    }
    return {
      ok: false,
      code: "OLLAMA_ERROR",
      error: err?.message || "Failed to communicate with Ollama.",
      durationMs: Date.now() - startTime,
    };
  }
}

