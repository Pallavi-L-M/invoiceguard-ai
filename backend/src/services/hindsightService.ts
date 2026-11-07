// ── Hindsight memory service ──
// Official integration with @vectorize-io/hindsight-client

import { HindsightClient } from '@vectorize-io/hindsight-client';
import { HindsightResponse } from '../types/index.js';

const BANK_ID = process.env.HINDSIGHT_BANK_ID || 'invoiceguard';
const BASE_URL = process.env.HINDSIGHT_API_URL || 'http://localhost:8888';

let client: HindsightClient | null = null;

function getClient(): HindsightClient {
  if (!client) {
    client = new HindsightClient({
      baseUrl: BASE_URL,
    });
  }
  return client;
}

/**
 * Retain an invoice experience, investigation outcome, or exception into Hindsight
 */
export async function retainMemory(
  content: string,
  metadata?: Record<string, unknown>
): Promise<HindsightResponse> {
  try {
    const hindsight = getClient();
    const result = await hindsight.retain({
      bankId: BANK_ID,
      content,
      ...(metadata ? { metadata } : {}),
    });

    return {
      available: true,
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Hindsight error';
    console.warn(`[Hindsight] Retain memory failed (API URL: ${BASE_URL}):`, msg);
    return {
      available: false,
      error: `Hindsight service unavailable at ${BASE_URL}. (${msg}). Memory retention could not be completed.`,
    };
  }
}

/**
 * Recall past experiences, resolutions, or vendor exceptions from Hindsight
 */
export async function recallMemories(query: string): Promise<HindsightResponse> {
  try {
    const hindsight = getClient();
    const result = await hindsight.recall({
      bankId: BANK_ID,
      query,
    });

    return {
      available: true,
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Hindsight error';
    console.warn(`[Hindsight] Recall memories failed (API URL: ${BASE_URL}):`, msg);
    return {
      available: false,
      error: `Hindsight service unavailable at ${BASE_URL}. (${msg}). Memory retrieval could not be completed.`,
    };
  }
}

/**
 * Reflect across multiple memories to generate a synthesized recommendation
 */
export async function reflectOnMemories(query: string): Promise<HindsightResponse> {
  try {
    const hindsight = getClient() as any;
    if (typeof hindsight.reflect === 'function') {
      const result = await hindsight.reflect({
        bankId: BANK_ID,
        query,
      });
      return {
        available: true,
        data: result,
      };
    }
    // Fallback to recall if reflect method is not on the client version
    const fallbackRecall = await recallMemories(query);
    return fallbackRecall;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Hindsight error';
    console.warn(`[Hindsight] Reflect failed (API URL: ${BASE_URL}):`, msg);
    return {
      available: false,
      error: `Hindsight service unavailable at ${BASE_URL}. (${msg}). Synthesis could not be completed.`,
    };
  }
}

/**
 * Check if the Hindsight API is reachable
 */
export async function checkHealth(): Promise<HindsightResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeoutId);

    if (res && res.ok) {
      return { available: true };
    }
    return {
      available: false,
      error: `Hindsight server at ${BASE_URL} returned status ${res ? res.status : 'offline'}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    return {
      available: false,
      error: `Hindsight server at ${BASE_URL} unreachable: ${msg}`,
    };
  }
}
