import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getSeasonDatesForDate,
  getSeasonNameForDate,
  rolloverSeason,
  validateSnapshot,
  ensureCurrentSeason,
} from "./season.service";
import { prisma } from "@/server/db";

// Mock do banco de dados
vi.mock("@/server/db", () => {
  const mockSeason = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mockSeasonSnapshot = {
    upsert: vi.fn(),
  };
  const mockConfiguration = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  return {
    prisma: {
      season: mockSeason,
      seasonSnapshot: mockSeasonSnapshot,
      configuration: mockConfiguration,
      $transaction: vi.fn(async (callback) => {
        return callback(prisma);
      }),
    },
  };
});

// Mock dos serviços e builders importados dinamicamente para evitar chamadas reais
vi.mock("@/server/services/dashboard.service", () => ({
  getDashboardSummary: vi.fn(async () => ({ totalMatches: 0 })),
}));
vi.mock("@/server/services/competitive.service", () => ({
  loadCompetitiveDataset: vi.fn(async () => ({})),
  getDashboardCompetitiveBundle: vi.fn(async () => ({})),
}));
vi.mock("@/server/coach/services/coach.service", () => ({
  getCoachReport: vi.fn(async () => ({ summary: "Mocked coach" })),
  invalidateCoachCache: vi.fn(),
}));

describe("Season Dates and Calendar Utilities", () => {
  it("deve calcular corretamente para mês de 31 dias (Janeiro)", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    const name = getSeasonNameForDate(date);
    const { startDate, endDate } = getSeasonDatesForDate(date);

    expect(name).toBe("Janeiro/2026");
    expect(startDate.getUTCDate()).toBe(1);
    expect(startDate.getUTCMonth()).toBe(0); // Jan
    expect(endDate.getUTCDate()).toBe(31);
    expect(endDate.getUTCMonth()).toBe(0);
  });

  it("deve calcular corretamente para mês de 30 dias (Abril)", () => {
    const date = new Date("2026-04-15T12:00:00Z");
    const name = getSeasonNameForDate(date);
    const { startDate, endDate } = getSeasonDatesForDate(date);

    expect(name).toBe("Abril/2026");
    expect(startDate.getUTCDate()).toBe(1);
    expect(startDate.getUTCMonth()).toBe(3); // April
    expect(endDate.getUTCDate()).toBe(30);
    expect(endDate.getUTCMonth()).toBe(3);
  });

  it("deve calcular corretamente para ano não bissexto (Fevereiro de 28 dias)", () => {
    const date = new Date("2026-02-15T12:00:00Z");
    const name = getSeasonNameForDate(date);
    const { startDate, endDate } = getSeasonDatesForDate(date);

    expect(name).toBe("Fevereiro/2026");
    expect(startDate.getUTCDate()).toBe(1);
    expect(startDate.getUTCMonth()).toBe(1); // Feb
    expect(endDate.getUTCDate()).toBe(28);
    expect(endDate.getUTCMonth()).toBe(1);
  });

  it("deve calcular corretamente para ano bissexto (Fevereiro de 29 dias)", () => {
    const date = new Date("2024-02-15T12:00:00Z");
    const name = getSeasonNameForDate(date);
    const { startDate, endDate } = getSeasonDatesForDate(date);

    expect(name).toBe("Fevereiro/2024");
    expect(startDate.getUTCDate()).toBe(1);
    expect(startDate.getUTCMonth()).toBe(1); // Feb
    expect(endDate.getUTCDate()).toBe(29);
    expect(endDate.getUTCMonth()).toBe(1);
  });
});

describe("validateSnapshot", () => {
  it("deve retornar false para payload nulo ou incompleto", () => {
    expect(validateSnapshot(null)).toBe(false);
    expect(validateSnapshot({})).toBe(false);
  });

  it("deve retornar true para payload de snapshot íntegro de versão 1", () => {
    const mockData = {
      version: 1,
      generatedAt: new Date().toISOString(),
      seasonId: "s1",
      seasonName: "Julho/2026",
      dashboard: {
        summary: {},
        competitive: {},
        coach: {},
      },
    };
    expect(validateSnapshot(mockData)).toBe(true);
  });
});

describe("rolloverSeason Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve executar o rollover com sucesso", async () => {
    // Mock de temporada ativa existente (Julho/2026)
    vi.mocked(prisma.season.findFirst as any).mockImplementation(async (args: any) => {
      if (args.where?.status === "ACTIVE") {
        return {
          id: "jul-id",
          name: "Julho/2026",
          startDate: new Date("2026-07-01T00:00:00Z"),
          endDate: new Date("2026-07-31T23:59:59.999Z"),
          status: "ACTIVE",
        } as any;
      }
      return null;
    });

    vi.mocked(prisma.season.findUnique as any).mockImplementation(async (args: any) => {
      if (args.where?.id === "jul-id") {
        return {
          id: "jul-id",
          name: "Julho/2026",
          startDate: new Date("2026-07-01T00:00:00Z"),
          endDate: new Date("2026-07-31T23:59:59.999Z"),
          status: "ACTIVE",
        } as any;
      }
      return null;
    });

    vi.mocked(prisma.seasonSnapshot.upsert as any).mockResolvedValue({} as any);
    vi.mocked(prisma.season.create as any).mockResolvedValue({ id: "aug-id", name: "Agosto/2026", status: "ACTIVE" } as any);
    vi.mocked(prisma.season.update as any).mockResolvedValue({ id: "jul-id", name: "Julho/2026", status: "CLOSED" } as any);

    const result = await rolloverSeason();

    expect(result.status).toBe("success");
    expect(prisma.season.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "jul-id" },
        data: { status: "CLOSED" },
      })
    );
    expect(prisma.season.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Agosto/2026",
          status: "ACTIVE",
        }),
      })
    );
  });

  it("deve ser idempotente (ignorar se a próxima temporada já estiver ativa)", async () => {
    vi.mocked(prisma.season.findFirst as any).mockImplementation(async (args: any) => {
      // Temporada ativa atual é Julho
      if (args.where?.status === "ACTIVE") {
        return {
          id: "jul-id",
          name: "Julho/2026",
          startDate: new Date("2026-07-01T00:00:00Z"),
          endDate: new Date("2026-07-31T23:59:59.999Z"),
          status: "ACTIVE",
        } as any;
      }
      // A próxima temporada já existe como ativa no banco
      if (args.where?.name === "Agosto/2026") {
        return {
          id: "aug-id",
          name: "Agosto/2026",
          status: "ACTIVE",
        } as any;
      }
      return null;
    });

    const result = await rolloverSeason();

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("already_rolled_over");
    expect(prisma.season.update).not.toHaveBeenCalled();
    expect(prisma.season.create).not.toHaveBeenCalled();
  });

  it("deve reverter o modo de manutenção e propagar erro se ocorrer falha na transação", async () => {
    vi.mocked(prisma.season.findFirst as any).mockImplementation(async (args: any) => {
      if (args?.where?.status === "ACTIVE") {
        return {
          id: "jul-id",
          name: "Julho/2026",
          startDate: new Date("2026-07-01T00:00:00Z"),
          endDate: new Date("2026-07-31T23:59:59.999Z"),
          status: "ACTIVE",
        } as any;
      }
      return null;
    });

    vi.mocked(prisma.season.findUnique as any).mockResolvedValue({
      id: "jul-id",
      name: "Julho/2026",
      startDate: new Date("2026-07-01T00:00:00Z"),
      endDate: new Date("2026-07-31T23:59:59.999Z"),
      status: "ACTIVE",
    } as any);

    // Lança erro ao tentar dar update
    vi.mocked(prisma.season.update as any).mockRejectedValue(new Error("Erro de banco"));

    await expect(rolloverSeason()).rejects.toThrow("Erro de banco");
    expect(prisma.configuration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "MAINTENANCE" },
        create: expect.objectContaining({ value: { enabled: false } }),
      })
    );
  });
});

describe("ensureCurrentSeason Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar a temporada correspondente à data informada se ela existir e não expirou", async () => {
    const targetDate = new Date("2026-08-15T12:00:00Z");
    const mockActive = {
      id: "active-id",
      name: "Agosto/2026",
      startDate: new Date("2026-08-01T00:00:00Z"),
      endDate: new Date("2026-08-31T23:59:59.999Z"),
      status: "ACTIVE",
    };

    vi.mocked(prisma.season.findFirst as any).mockResolvedValue(mockActive);

    const result = await ensureCurrentSeason(targetDate);

    expect(result).toEqual(mockActive);
    expect(prisma.season.findFirst).toHaveBeenCalledWith({
      where: {
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });
    // Não deve criar ou dar update em nada
    expect(prisma.season.create).not.toHaveBeenCalled();
    expect(prisma.season.update).not.toHaveBeenCalled();
  });

  it("deve disparar rolloverSeason se a temporada contendo a data for ACTIVE mas a data atual do sistema já expirou", async () => {
    const targetDate = new Date("2026-07-20T12:00:00Z");
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 hora atrás

    const mockActive = {
      id: "expired-id",
      name: "Julho/2026",
      startDate: new Date("2026-07-01T00:00:00Z"),
      endDate: pastDate,
      status: "ACTIVE",
    };

    const mockNextActive = {
      id: "next-id",
      name: "Agosto/2026",
      startDate: new Date("2026-08-01T00:00:00Z"),
      endDate: new Date("2026-08-31T23:59:59.999Z"),
      status: "ACTIVE",
    };

    vi.mocked(prisma.season.findFirst as any).mockImplementation(async (args: any) => {
      // Primeira chamada: busca pela data
      if (args.where?.startDate) {
        return mockActive;
      }
      // Durante o rollover, ele busca a ativa atual
      if (args.where?.status === "ACTIVE") {
        return mockActive;
      }
      return null;
    });

    vi.mocked(prisma.season.findUnique as any).mockResolvedValue(mockActive);
    vi.mocked(prisma.seasonSnapshot.upsert as any).mockResolvedValue({} as any);
    vi.mocked(prisma.season.update as any).mockResolvedValue({ ...mockActive, status: "CLOSED" } as any);
    vi.mocked(prisma.season.create as any).mockResolvedValue(mockNextActive as any);

    const result = await ensureCurrentSeason(targetDate);

    expect(result).toEqual(mockNextActive);
    expect(prisma.season.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "expired-id" },
        data: { status: "CLOSED" },
      })
    );
  });

  it("deve criar uma nova temporada ACTIVE para o mês atual se nenhuma temporada existir", async () => {
    const targetDate = new Date(); // hoje
    vi.mocked(prisma.season.findFirst as any).mockResolvedValue(null);

    const mockNewSeason = {
      id: "new-id",
      name: getSeasonNameForDate(targetDate),
      status: "ACTIVE",
    };
    vi.mocked(prisma.season.create as any).mockResolvedValue(mockNewSeason as any);

    const result = await ensureCurrentSeason(targetDate);

    expect(result).toEqual(mockNewSeason);
    expect(prisma.season.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: getSeasonNameForDate(targetDate),
          status: "ACTIVE",
        }),
      })
    );
  });

  it("deve criar uma nova temporada CLOSED para uma data no passado se nenhuma temporada existir", async () => {
    const targetDate = new Date("2026-03-15T12:00:00Z"); // passado distante
    vi.mocked(prisma.season.findFirst as any).mockResolvedValue(null);

    const mockNewSeason = {
      id: "past-id",
      name: "Março/2026",
      status: "CLOSED",
    };
    vi.mocked(prisma.season.create as any).mockResolvedValue(mockNewSeason as any);

    const result = await ensureCurrentSeason(targetDate);

    expect(result).toEqual(mockNewSeason);
    expect(prisma.season.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Março/2026",
          status: "CLOSED",
        }),
      })
    );
  });
});
