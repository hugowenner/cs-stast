import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import DashboardPage from "./page";
import { prisma } from "@/server/db";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

describe("Dashboard Page - Suporte a Temporadas e Snapshots", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deve carregar e renderizar a temporada ativa (Outubro/2026) sem erros", async () => {
    const pageNode = await DashboardPage({
      searchParams: Promise.resolve({ season: "cmuow54kq223v01rxwlfgd6o9" }),
    });

    expect(pageNode).toBeDefined();
    const html = renderToString(pageNode);
    expect(html).toContain("Outubro/2026");
    expect(html).toContain("Classificação Oficial");
    expect(html).toContain("Posição por rating nas últimas 10 partidas");
    expect(html).toContain(
      "As posições destes cards representam o desempenho recente. A classificação oficial utiliza o Score da temporada."
    );
  });

  it("deve carregar e renderizar a temporada fechada com snapshot legado (Setembro/2026) sem lançar TypeError", async () => {
    const pageNode = await DashboardPage({
      searchParams: Promise.resolve({ season: "season-sep-2026" }),
    });

    expect(pageNode).toBeDefined();
    expect(() => renderToString(pageNode)).not.toThrow();

    const html = renderToString(pageNode);
    expect(html).toContain("Setembro/2026");
    expect(html).toContain("ENCERRADA");
    expect(html).toContain("Destaque por Aproveitamento");
    expect(html).toContain("Posição por rating nas últimas 10 partidas");
    expect(html).toContain(
      "As posições destes cards representam o desempenho recente. A classificação oficial utiliza o Score da temporada."
    );
  });

  it("deve alternar para 'all' (Histórico Geral) sem erros", async () => {
    const pageNode = await DashboardPage({
      searchParams: Promise.resolve({ season: "all" }),
    });

    expect(pageNode).toBeDefined();
    const html = renderToString(pageNode);
    expect(html).toContain("Histórico Geral");
    expect(html).toContain("Posição por rating nas últimas 10 partidas");
    expect(html).toContain(
      "As posições destes cards representam o desempenho recente. A classificação oficial utiliza o Score da temporada."
    );
  });
});
