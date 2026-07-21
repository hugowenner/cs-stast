import type { CoachReportDTO } from "@/server/dtos/coachReport.dto";

export interface CoachProvider {
  generate(prompt: string): Promise<CoachReportDTO>;
}
