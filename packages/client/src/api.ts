export interface ScoreEntry {
  id: number;
  name: string;
  days: number;
  points: number;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base de la API. Vacía = mismo origen (el servidor sirve el cliente).
 * Para el futuro empaquetado de escritorio se define VITE_API_BASE con la URL del servidor.
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'Sin conexión con el servidor');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : `Error ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export async function getScores(limit = 20): Promise<ScoreEntry[]> {
  const data = await request<{ scores: ScoreEntry[] }>(`/api/scores?limit=${limit}`, { method: 'GET', headers: { accept: 'application/json' } });
  return data.scores;
}

export async function postScore(s: { name: string; days: number; points: number }): Promise<{ score: ScoreEntry; rank: number }> {
  return request(`/api/scores`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(s),
  });
}
