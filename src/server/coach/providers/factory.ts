import { DeepseekCoachProvider } from "./deepseek.provider";
import type { CoachProvider } from "./coach-provider";
import { AIConfig } from "@/server/config/ai";

class MockCoachProvider implements CoachProvider {
  async generate(prompt: string) {
    return {
      summary: "Mocked Coach Report (Offline Mode)",
      strengths: ["Força de teste 1", "Força de teste 2"],
      weaknesses: ["Fraqueza de teste 1"],
      recommendations: ["Recomendação de teste 1"],
      confidence: 95,
      generatedAt: new Date().toISOString(),
      provider: "mock",
      model: "mock-model",
      processingTimeMs: 10,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        finishReason: "stop",
      },
    };
  }
}

export function getCoachProvider(): CoachProvider {
  if (process.env.MOCK_COACH === "true") {
    return new MockCoachProvider();
  }

  switch (AIConfig.provider.toLowerCase()) {
    case "deepseek":
      return new DeepseekCoachProvider();
    default:
      return new DeepseekCoachProvider();
  }
}
