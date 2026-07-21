import { DeepseekCoachProvider } from "./deepseek.provider";
import type { CoachProvider } from "./coach-provider";
import { AIConfig } from "@/server/config/ai";

export function getCoachProvider(): CoachProvider {
  switch (AIConfig.provider.toLowerCase()) {
    case "deepseek":
      return new DeepseekCoachProvider();
    default:
      return new DeepseekCoachProvider();
  }
}
