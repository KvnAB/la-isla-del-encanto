import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getScores, postScore } from '../src/api';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('api', () => {
  it('getScores pide GET /api/scores?limit=20 y devuelve la lista', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { scores: [{ id: 1, name: 'Ana', days: 2, points: 10, createdAt: 'x' }] }));
    const scores = await getScores();
    expect(fetchMock).toHaveBeenCalledWith('/api/scores?limit=20', expect.objectContaining({ method: 'GET' }));
    expect(scores).toHaveLength(1);
    expect(scores[0].name).toBe('Ana');
  });

  it('getScores respeta el límite', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { scores: [] }));
    await getScores(5);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scores?limit=5');
  });

  it('respuesta 500 rechaza con ApiError y status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'Error interno' }));
    await expect(getScores()).rejects.toBeInstanceOf(ApiError);
    await expect(getScores()).rejects.toMatchObject({ status: 500 });
  });

  it('red caída rechaza con ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getScores()).rejects.toBeInstanceOf(ApiError);
  });

  it('postScore envía JSON y devuelve score y rank', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { score: { id: 3, name: 'Ana', days: 1, points: 50, createdAt: 'x' }, rank: 2 }));
    const res = await postScore({ name: 'Ana', days: 1, points: 50 });
    expect(res.rank).toBe(2);
    expect(res.score.id).toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/scores');
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana', days: 1, points: 50 });
  });

  it('postScore con 400 rechaza con el mensaje del servidor', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'El nombre es obligatorio' }));
    await expect(postScore({ name: '', days: 0, points: 0 })).rejects.toMatchObject({ message: 'El nombre es obligatorio', status: 400 });
  });
});
