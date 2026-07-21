export const AIConfig = {
  provider: process.env.DEEPSEEK_PROVIDER || "deepseek",
  model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  timeoutMs: parseInt(process.env.DEEPSEEK_TIMEOUT_MS || "120000", 10),
  cacheTtlMs: parseInt(process.env.DEEPSEEK_CACHE_TTL_MS || "86400000", 10), // 24 horas
  promptVersion: process.env.DEEPSEEK_PROMPT_VERSION || "v1",
  temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || "0.2"),
  maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || "4096", 10),
  maxAttempts: parseInt(process.env.DEEPSEEK_MAX_ATTEMPTS || "3", 10),
};
