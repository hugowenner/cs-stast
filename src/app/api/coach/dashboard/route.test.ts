import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { prisma } from "@/server/db";
import * as seasonService from "@/server/services/season.service";
import * as dashboardBuilder from "@/server/coach/builders/dashboard.builder";
import * as coachService from "@/server/coach/services/coach.service";

// Mock dependencies
vi.mock("@/server/db", () => ({
  prisma: {
    season: {
      findUnique: vi.fn(),
    },
    seasonSnapshot: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/season.service", () => ({
  getActiveSeason: vi.fn(),
}));

vi.mock("@/server/coach/builders/dashboard.builder", () => ({
  loadDashboardCoachPayload: vi.fn(),
  buildDashboardPrompt: vi.fn(),
}));

vi.mock("@/server/coach/services/coach.service", () => ({
  peekCoachReport: vi.fn(),
  getCoachReport: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(null),
}));

describe("/api/coach/dashboard Route Handlers - Season Resolution & Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET: deve resolver a temporada ativa quando nenhuma temporada for informada", async () => {
    const mockActiveSeason = {
      id: "season-active-1",
      name: "Outubro/2026",
      status: "ACTIVE",
    };
    vi.mocked(seasonService.getActiveSeason).mockResolvedValue(mockActiveSeason as any);
    vi.mocked(prisma.seasonSnapshot.findUnique).mockResolvedValue(null);
    vi.mocked(dashboardBuilder.loadDashboardCoachPayload).mockResolvedValue({
      seasonId: "season-active-1",
      seasonLabel: "Outubro/2026",
    } as any);
    vi.mocked(coachService.peekCoachReport).mockReturnValue({
      status: "fresh",
      report: { summary: "Análise ok" } as any,
      generatedAt: "2026-10-29T10:00:00Z",
    });

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("fresh");
    expect(dashboardBuilder.loadDashboardCoachPayload).toHaveBeenCalledWith(
      "season-active-1",
      "Outubro/2026"
    );
    expect(coachService.peekCoachReport).toHaveBeenCalledWith(
      expect.anything(),
      "dashboard:season",
      "season-active-1"
    );
  });

  it("GET: deve resolver a temporada ativa quando season='current'", async () => {
    const mockActiveSeason = {
      id: "season-active-1",
      name: "Outubro/2026",
      status: "ACTIVE",
    };
    vi.mocked(seasonService.getActiveSeason).mockResolvedValue(mockActiveSeason as any);
    vi.mocked(prisma.seasonSnapshot.findUnique).mockResolvedValue(null);
    vi.mocked(dashboardBuilder.loadDashboardCoachPayload).mockResolvedValue({
      seasonId: "season-active-1",
    } as any);
    vi.mocked(coachService.peekCoachReport).mockReturnValue({
      status: "fresh",
      report: null,
      generatedAt: null,
    });

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard?season=current");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(dashboardBuilder.loadDashboardCoachPayload).toHaveBeenCalledWith(
      "season-active-1",
      "Outubro/2026"
    );
  });

  it("GET: deve retornar 404 explícito quando nenhuma temporada ativa existir no sistema", async () => {
    vi.mocked(seasonService.getActiveSeason).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Nenhuma temporada ativa encontrada no sistema");
  });

  it("GET: deve retornar 404 explícito quando o ID da temporada informado não existir (sem fallback silencioso)", async () => {
    vi.mocked(prisma.season.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard?season=id-inexistente");
    const res = await GET(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Temporada com ID 'id-inexistente' não encontrada");
    expect(seasonService.getActiveSeason).not.toHaveBeenCalled();
    expect(dashboardBuilder.loadDashboardCoachPayload).not.toHaveBeenCalled();
  });

  it("GET: deve retornar 400 quando season='all', pois o Coach requer escopo sazonal", async () => {
    const req = new NextRequest("http://localhost:3000/api/coach/dashboard?season=all");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("requer uma temporada específica ou a temporada ativa");
  });

  it("GET: deve retornar dados diretamente do snapshot em O(1) quando a temporada estiver CLOSED", async () => {
    const mockClosedSeason = {
      id: "season-sept-2026",
      name: "Setembro/2026",
      status: "CLOSED",
    };
    vi.mocked(prisma.season.findUnique).mockResolvedValue(mockClosedSeason as any);
    vi.mocked(prisma.seasonSnapshot.findUnique).mockResolvedValue({
      seasonId: "season-sept-2026",
      dashboard: {
        dashboard: {
          coach: { summary: "Relatório arquivado do snapshot" },
        },
        generatedAt: "2026-09-30T23:59:59Z",
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard?season=season-sept-2026");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("fresh");
    expect(json.report.summary).toBe("Relatório arquivado do snapshot");
    // Não deve chamar loadDashboardCoachPayload nem peeker para temporadas fechadas com snapshot
    expect(dashboardBuilder.loadDashboardCoachPayload).not.toHaveBeenCalled();
  });

  it("POST: deve gerar relatório para temporada informada usando a mesma temporada em payload e cache", async () => {
    const mockSeason = {
      id: "season-custom-123",
      name: "Temporada Especial",
      status: "ACTIVE",
    };
    vi.mocked(prisma.season.findUnique).mockResolvedValue(mockSeason as any);
    vi.mocked(prisma.seasonSnapshot.findUnique).mockResolvedValue(null);
    vi.mocked(dashboardBuilder.loadDashboardCoachPayload).mockResolvedValue({
      seasonId: "season-custom-123",
      seasonLabel: "Temporada Especial",
    } as any);
    vi.mocked(coachService.getCoachReport).mockResolvedValue({
      summary: "Relatório gerado com sucesso",
      confidence: 85,
    } as any);

    const req = new NextRequest("http://localhost:3000/api/coach/dashboard?season=season-custom-123", {
      method: "POST",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toBe("Relatório gerado com sucesso");
    expect(dashboardBuilder.loadDashboardCoachPayload).toHaveBeenCalledWith(
      "season-custom-123",
      "Temporada Especial"
    );
    expect(coachService.getCoachReport).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "dashboard:season",
      "season-custom-123"
    );
  });
});
