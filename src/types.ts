/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string; // Unique GUID or local random string
  from: string; // Sender User ID
  to: string; // Receiver User ID
  text: string; // Message content
  timestamp: number; // Device timestamp in milliseconds
  status: "queue" | "sent" | "delivered"; // "queue" (offline), "sent" (reception confirmed by local backend), "delivered" (other has fetched it)
  bytesSize: number; // Payload size estimates for data tracker
}

export interface Contact {
  id: string; // Contact's short unique ID (e.g., 8F3K-22A1)
  name: string; // Contact's display name
  addedAt: number; // Timing added
  unreadCount?: number; // Count of unread messages
  lastMessage?: string; // Cache of the last message sent/received
  lastMessageTime?: number; // Timestamp of last message
}

export interface UserProfile {
  id: string; // Unique ID (e.g., 8F3K-22A1)
  name: string; // Customizable name
  isCreated: boolean; // Flag if initialized
}

export type NetworkMode = "real" | "slow" | "offline";

export interface NetworkStats {
  latencyMs: number; // estimated ping round-trip
  mode: NetworkMode; // 'real', 'slow' (adds artificial delay of 3s), 'offline' (mocks disconnected network)
  totalBytesTx: number; // Bytes sent
  totalBytesRx: number; // Bytes received
}
