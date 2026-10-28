import { describe, expect, it } from "vitest";
import { cleanMapName } from "./utils";

describe("cleanMapName - Padronização de Nomes de Mapas", () => {
  it("deve padronizar variantes de Cache para 'Cache'", () => {
    expect(cleanMapName("cache")).toBe("Cache");
    expect(cleanMapName("Cache")).toBe("Cache");
    expect(cleanMapName("de_cache")).toBe("Cache");
    expect(cleanMapName("DE_CACHE")).toBe("Cache");
  });

  it("deve padronizar variantes de Inferno para 'Inferno'", () => {
    expect(cleanMapName("inferno")).toBe("Inferno");
    expect(cleanMapName("Inferno")).toBe("Inferno");
    expect(cleanMapName("de_inferno")).toBe("Inferno");
    expect(cleanMapName("DE_INFERNO")).toBe("Inferno");
  });

  it("deve padronizar variantes de Dust2 para 'Dust2'", () => {
    expect(cleanMapName("dust2")).toBe("Dust2");
    expect(cleanMapName("Dust2")).toBe("Dust2");
    expect(cleanMapName("de_dust2")).toBe("Dust2");
    expect(cleanMapName("dust 2")).toBe("Dust2");
    expect(cleanMapName("Dust 2")).toBe("Dust2");
    expect(cleanMapName("de_dust_2")).toBe("Dust2");
  });

  it("deve padronizar variantes de Overpass para 'Overpass'", () => {
    expect(cleanMapName("overpass")).toBe("Overpass");
    expect(cleanMapName("Overpass")).toBe("Overpass");
    expect(cleanMapName("de_overpass")).toBe("Overpass");
  });

  it("deve padronizar demais mapas oficiais conhecidos", () => {
    expect(cleanMapName("de_mirage")).toBe("Mirage");
    expect(cleanMapName("de_nuke")).toBe("Nuke");
    expect(cleanMapName("de_ancient")).toBe("Ancient");
    expect(cleanMapName("de_anubis")).toBe("Anubis");
    expect(cleanMapName("de_vertigo")).toBe("Vertigo");
    expect(cleanMapName("de_train")).toBe("Train");
    expect(cleanMapName("cs_office")).toBe("Office");
    expect(cleanMapName("cs_italy")).toBe("Italy");
    expect(cleanMapName("de_cbble")).toBe("Cobblestone");
    expect(cleanMapName("cobblestone")).toBe("Cobblestone");
  });

  it("deve retornar 'Mapa não informado' para valores nulos, vazios ou inválidos", () => {
    expect(cleanMapName(null)).toBe("Mapa não informado");
    expect(cleanMapName(undefined)).toBe("Mapa não informado");
    expect(cleanMapName("")).toBe("Mapa não informado");
    expect(cleanMapName("   ")).toBe("Mapa não informado");
    expect(cleanMapName("—")).toBe("Mapa não informado");
    expect(cleanMapName("-")).toBe("Mapa não informado");
    expect(cleanMapName("desconhecido")).toBe("Mapa não informado");
  });

  it("deve manter mapas desconhecidos identificáveis sem prefixo de engine", () => {
    expect(cleanMapName("de_thera")).toBe("Thera");
    expect(cleanMapName("de_custom_arena")).toBe("Custom Arena");
  });
});
