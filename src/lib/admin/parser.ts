import { resolveVanityUrl } from "@/server/services/steam-profile.service";

/**
 * Parses user input from the Add Player form.
 * Supports:
 * - Steam ID64 (17 digits)
 * - Steam Profile URL (e.g. https://steamcommunity.com/profiles/76561198034567890/)
 * - Steam Vanity URL (e.g. https://steamcommunity.com/id/myvanityname/)
 * - Gamers Club ID (numeric string)
 * - Gamers Club Profile URL (e.g. https://gamersclub.com.br/player/12345)
 */
export async function parsePlayerInput(input: string): Promise<{
  steamId?: string;
  gamersClubId?: string;
  error?: string;
}> {
  const cleanInput = input.trim();
  
  if (!cleanInput) {
    return { error: "Entrada vazia. Forneça um ID ou link do Steam ou Gamers Club." };
  }

  // 1. Steam Profile URL (profiles/ID64)
  if (cleanInput.includes("steamcommunity.com/profiles/")) {
    const match = cleanInput.match(/\/profiles\/(\d{17})/);
    if (match && match[1]) {
      return { steamId: match[1] };
    }
    return { error: "URL de perfis do Steam inválida. O ID de 17 dígitos não foi encontrado." };
  }

  // 2. Steam Profile URL (id/vanity)
  if (cleanInput.includes("steamcommunity.com/id/")) {
    const match = cleanInput.match(/\/id\/([^/]+)/);
    if (match && match[1]) {
      // Remove trailing slash if present
      const vanity = match[1].replace(/\/$/, "");
      try {
        const resolved = await resolveVanityUrl(vanity);
        if (resolved) {
          return { steamId: resolved };
        }
        return { error: `Não foi possível encontrar um SteamID64 vinculado ao apelido '${vanity}'.` };
      } catch (err) {
        return { error: "Erro de comunicação ao resolver apelido personalizado do Steam." };
      }
    }
    return { error: "URL de apelido personalizado do Steam inválida." };
  }

  // 3. Gamers Club Profile URL
  if (cleanInput.includes("gamersclub.com.br/player/") || cleanInput.includes("gamersclub.gg/player/")) {
    const match = cleanInput.match(/\/player\/(\d+)/);
    if (match && match[1]) {
      return { gamersClubId: match[1] };
    }
    return { error: "URL do perfil da Gamers Club inválida. O ID numérico não foi encontrado." };
  }

  // 4. Numeric SteamID64 directly (17 digits)
  if (/^\d{17}$/.test(cleanInput)) {
    return { steamId: cleanInput };
  }

  // 5. Numeric Gamers Club ID directly (up to 10 digits)
  if (/^\d{3,10}$/.test(cleanInput)) {
    return { gamersClubId: cleanInput };
  }

  // 6. Treat simple text as Steam vanity name
  if (/^[a-zA-Z0-9_-]+$/.test(cleanInput)) {
    try {
      const resolved = await resolveVanityUrl(cleanInput);
      if (resolved) {
        return { steamId: resolved };
      }
    } catch {
      // ignore, fall through to error
    }
  }

  return {
    error:
      "Formato inválido. Forneça um SteamID64 (17 dígitos), ID Gamers Club ou links de perfis oficiais correspondentes.",
  };
}
