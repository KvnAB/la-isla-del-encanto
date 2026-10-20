import type { DatabaseSync } from 'node:sqlite';

export interface ScoreRow {
  id: number;
  name: string;
  days: number;
  points: number;
  createdAt: string;
}

export interface NewScore {
  name: string;
  days: number;
  points: number;
}

interface DbRow {
  id: number;
  name: string;
  days: number;
  points: number;
  created_at: string;
}

function toRow(r: DbRow): ScoreRow {
  return { id: r.id, name: r.name, days: r.days, points: r.points, createdAt: r.created_at };
}

export class ScoresRepo {
  constructor(private readonly db: DatabaseSync) {}

  /** Mejores partidas: puntos desc, días desc, más reciente primero. */
  top(limit: number): ScoreRow[] {
    const rows = this.db.prepare('SELECT * FROM scores ORDER BY points DESC, days DESC, id DESC LIMIT ?').all(limit) as unknown as DbRow[];
    return rows.map(toRow);
  }

  insert(s: NewScore): { row: ScoreRow; rank: number } {
    const createdAt = new Date().toISOString();
    const res = this.db.prepare('INSERT INTO scores (name, days, points, created_at) VALUES (?, ?, ?, ?)').run(s.name, s.days, s.points, createdAt);
    const id = Number(res.lastInsertRowid);
    const row = this.db.prepare('SELECT * FROM scores WHERE id = ?').get(id) as unknown as DbRow;
    const before = this.db
      .prepare('SELECT COUNT(*) AS n FROM scores WHERE points > ? OR (points = ? AND days > ?) OR (points = ? AND days = ? AND id > ?)')
      .get(s.points, s.points, s.days, s.points, s.days, id) as unknown as { n: number };
    return { row: toRow(row), rank: Number(before.n) + 1 };
  }
}
