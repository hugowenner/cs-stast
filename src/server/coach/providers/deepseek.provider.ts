import { AIConfig } from "@/server/config/ai";
import type { CoachProvider } from "./coach-provider";
import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";

export class DeepseekCoachProvider implements CoachProvider {
  async generate(prompt: string): Promise<CoachReportDTO> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AIConfig.timeoutMs);

        // Chamar endpoint compatível com OpenAI via fetch
        const response = await fetch(`${AIConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AIConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: AIConfig.model,
            messages: [
              {
                role: "system",
                content:
                  "Você é um Coach profissional de CS2. Responda APENAS com o JSON estruturado conforme as instruções, sem tags markdown ou explicações adicionais.",
              },
              { role: "user", content: prompt },
            ],
            temperature: AIConfig.temperature,
            max_tokens: AIConfig.maxTokens,
            stream: false,
            chat_template_kwargs: { thinking: false },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        const cleanJson = this.cleanJsonContent(content);
        const parsed = JSON.parse(cleanJson);

        const processingTimeMs = Date.now() - startTime;

        return {
          summary: parsed.summary || "",
          strengths: parsed.strengths || [],
          weaknesses: parsed.weaknesses || [],
          recommendations: parsed.recommendations || [],
          confidence: parsed.confidence ?? 100,
          generatedAt: new Date().toISOString(),
          provider: AIConfig.provider,
          model: AIConfig.model,
          processingTimeMs,
          usage: {
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0,
            finishReason: data.choices?.[0]?.finish_reason ?? "stop",
          },
        };
      } catch (err) {
        console.error(`Tentativa ${attempts} falhou no Coach DeepSeek:`, err);
        if (attempts >= maxAttempts) {
          throw new Error(`DeepSeek Coach Provider falhou após ${maxAttempts} tentativas: ${(err as Error).message}`);
        }
        // Aguardar 2s antes do retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error("Falha inexplicável no Coach Provider.");
  }

  private cleanJsonContent(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith("```")) {
      const firstLineEnd = clean.indexOf("\n");
      const lastLineStart = clean.lastIndexOf("```");
      if (firstLineEnd !== -1 && lastLineStart > firstLineEnd) {
        clean = clean.substring(firstLineEnd + 1, lastLineStart).trim();
      }
    }
    if (clean.startsWith("json")) {
      clean = clean.substring(4).trim();
    }
    return clean;
  }
}
