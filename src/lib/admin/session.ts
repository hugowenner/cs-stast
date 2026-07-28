const encoder = new TextEncoder();

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
}

/**
 * Generates a session token: BASE64(expiration).BASE64(signature)
 */
export async function signSession(expiry: number, secret: string): Promise<string> {
  const key = await getCryptoKey(secret);
  const data = expiry.toString();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  
  // Convert signature to hex string
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Base64URL-like encoding to avoid issues in cookies
  const b64Expiry = btoa(data).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const b64Sig = btoa(signatureHex).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  return `${b64Expiry}.${b64Sig}`;
}

/**
 * Verifies a session token and ensures it is not expired
 */
export async function verifySession(cookieValue: string, secret: string): Promise<boolean> {
  if (!cookieValue) return false;
  
  try {
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return false;
    
    const [b64Expiry, b64Sig] = parts;
    
    // Decode base64
    const padExpiry = b64Expiry.replace(/-/g, "+").replace(/_/g, "/");
    const expiryStr = atob(padExpiry);
    const expiry = parseInt(expiryStr, 10);
    
    if (isNaN(expiry) || expiry < Date.now()) {
      return false; // Expired or invalid
    }
    
    const key = await getCryptoKey(secret);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(expiryStr));
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const expectedB64Sig = btoa(expectedHex).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    
    return b64Sig === expectedB64Sig;
  } catch (e) {
    return false;
  }
}
