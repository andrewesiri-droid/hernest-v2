// ─── HerNest Local Database (Dexie/IndexedDB) ────────────────────
import Dexie, { type Table } from "dexie";

// ── Types ──────────────────────────────────────────────────────────
export interface LocalDoc {
  id: string;
  collection: string;
  data: Record<string, unknown>;
  syncStatus: "synced" | "pending" | "conflict" | "error";
  lastModified: number;
  userId: string;
}

export interface SyncQueueItem {
  id?: number;
  operation: "create" | "update" | "delete";
  collection: string;
  documentId: string;
  data?: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "processing" | "completed" | "failed";
  retryCount: number;
  nextRetry?: number;
  error?: string;
}

export interface CachedBriefing {
  date: string; // YYYY-MM-DD — primary key
  data: Record<string, unknown>;
  generatedAt: number;
  stale: boolean;
}

export interface ChatSession {
  sessionId: string;
  messages: Array<{ role: string; content: string; timestamp: number }>;
  lastMessageAt: number;
  userId: string;
}

// ── Database ───────────────────────────────────────────────────────
class HerNestDB extends Dexie {
  docs!: Table<LocalDoc>;
  syncQueue!: Table<SyncQueueItem>;
  briefings!: Table<CachedBriefing>;
  chatSessions!: Table<ChatSession>;

  constructor() {
    super("HerNestV2");
    this.version(1).stores({
      docs: "id, collection, syncStatus, lastModified, userId",
      syncQueue: "++id, status, timestamp, nextRetry",
      briefings: "date, generatedAt, stale",
      chatSessions: "sessionId, lastMessageAt, userId",
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  async upsertDoc(doc: LocalDoc): Promise<void> {
    await this.docs.put(doc);
  }

  async getDoc(id: string): Promise<LocalDoc | undefined> {
    return this.docs.get(id);
  }

  async getPendingSync(): Promise<SyncQueueItem[]> {
    const now = Date.now();
    return this.syncQueue
      .where("status")
      .equals("pending")
      .filter((item) => !item.nextRetry || item.nextRetry <= now)
      .limit(50)
      .toArray();
  }

  async queueSync(item: Omit<SyncQueueItem, "id" | "status" | "retryCount">): Promise<void> {
    await this.syncQueue.add({
      ...item,
      status: "pending",
      retryCount: 0,
    });
  }

  async getTodayBriefing(): Promise<CachedBriefing | undefined> {
    const today = new Date().toISOString().split("T")[0];
    return this.briefings.get(today);
  }

  async cacheBriefing(data: Record<string, unknown>): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    await this.briefings.put({
      date: today,
      data,
      generatedAt: Date.now(),
      stale: false,
    });
  }
}

export const db = new HerNestDB();
