export interface CoachUsageDTO {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  finishReason: string;
}

export interface CoachReportDTO {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number; // Porcentagem: 0-100
  generatedAt: string;
  provider: string;
  model: string;
  processingTimeMs: number;
  usage?: CoachUsageDTO;
}
