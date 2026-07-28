import { describe, expect, it, vi } from "vitest";
import { parsePlayerInput } from "./parser";

vi.mock("@/server/services/steam-profile.service", () => ({
  resolveVanityUrl: vi.fn(async (vanity: string) => {
    if (vanity === "myvanityname" || vanity === "existing-vanity") {
      return "76561198034567890";
    }
    return null;
  }),
}));

describe("parsePlayerInput", () => {
  it("should identify and parse direct SteamID64 (17 digits)", async () => {
    const res = await parsePlayerInput("76561198012345678");
    expect(res).toEqual({ steamId: "76561198012345678" });
  });

  it("should identify and parse Steam Profile URL (profiles/ID64)", async () => {
    const res = await parsePlayerInput("https://steamcommunity.com/profiles/76561198012345678/");
    expect(res).toEqual({ steamId: "76561198012345678" });
  });

  it("should identify and parse Steam Profile URL (id/vanity) by resolving vanity name", async () => {
    const res = await parsePlayerInput("https://steamcommunity.com/id/myvanityname/");
    expect(res).toEqual({ steamId: "76561198034567890" });
  });

  it("should return error if Steam Profile vanity URL cannot be resolved", async () => {
    const res = await parsePlayerInput("https://steamcommunity.com/id/nonexistent-vanity");
    expect(res.error).toContain("Não foi possível encontrar um SteamID64");
  });

  it("should identify and parse Gamers Club ID directly", async () => {
    const res = await parsePlayerInput("757573");
    expect(res).toEqual({ gamersClubId: "757573" });
  });

  it("should identify and parse Gamers Club Profile URL", async () => {
    const res = await parsePlayerInput("https://gamersclub.com.br/player/757573");
    expect(res).toEqual({ gamersClubId: "757573" });
  });

  it("should fallback to resolving simple text as Steam vanity nickname", async () => {
    const res = await parsePlayerInput("myvanityname");
    expect(res).toEqual({ steamId: "76561198034567890" });
  });

  it("should return error for empty input", async () => {
    const res = await parsePlayerInput("   ");
    expect(res.error).toContain("Entrada vazia");
  });

  it("should return error for invalid formats", async () => {
    const res = await parsePlayerInput("invalid-format-string!!!");
    expect(res.error).toContain("Formato inválido");
  });
});
