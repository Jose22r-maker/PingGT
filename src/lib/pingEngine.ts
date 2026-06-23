/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Generate a memorable capitalized short ID avoiding confusing letters (I, O, L, 0, 1)
export function generateShortId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}

// Estimate payload size in Bytes for data monitoring
export function estimateBytes(obj: any): number {
  try {
    const str = JSON.stringify(obj);
    // Rough calculation of bytes based on UTF-8 string length
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code < 0xd800 || code >= 0xe000) bytes += 3;
      else {
        i++;
        bytes += 4;
      }
    }
    return bytes;
  } catch {
    return 0;
  }
}

// Low bandwidth savings data context: standard app vs PingGT
export const STANDAR_APP_ESTIMATE_PER_MSG = 15360; // 15 KB standard chat app message (heavy frames, telemetry, tracking)
export const PINGGT_ESTIMATE_PER_MSG = 180; // 180 Bytes for light payload

export function calculateSavings(pingCount: number, messageCount: number): {
  standardKb: number;
  pingGtkb: number;
  savedPercent: number;
} {
  // Standard chat app overhead: approx 50 KB initial + 15 KB per message + high bg telemetry
  // PingGT: 0.18 KB per message + 0.4 KB per poll
  const standardBytes = 150000 + (messageCount * STANDAR_APP_ESTIMATE_PER_MSG) + (pingCount * 12000);
  const pingGtBytes = 800 + (messageCount * PINGGT_ESTIMATE_PER_MSG) + (pingCount * 150);

  const standardKb = Math.round(standardBytes / 102.4) / 10;
  const pingGtkb = Math.round(pingGtBytes / 102.4) / 10;
  const savedPercent = standardBytes > 0 
    ? Math.round(((standardBytes - pingGtBytes) / standardBytes) * 1000) / 10 
    : 98;

  return {
    standardKb,
    pingGtkb,
    savedPercent
  };
}

// Parse QR JSON securely
export interface QRPayload {
  id: string;
  name: string;
  t?: number; // timestamp
}

export function parseQRCodeJson(text: string): QRPayload | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && typeof parsed.id === "string") {
      return {
        id: String(parsed.id).toUpperCase().trim(),
        name: String(parsed.name || "Contacto QR").slice(0, 32).trim(),
        t: Number(parsed.t) || undefined
      };
    }
    return null;
  } catch {
    // Check if it is a raw ID format directly
    const directMatch = text.trim().match(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/i);
    if (directMatch) {
      return {
        id: text.trim().toUpperCase(),
        name: `Usuario ${text.trim().substring(0, 4)}`
      };
    }
    return null;
  }
}
