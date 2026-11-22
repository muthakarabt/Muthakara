import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays, afterReview, afterStudy, todayStr, type Grade } from '@/lib/srs';

export const DATABASE_NAME = 'muthakara.db';

export type PageKind = 'image' | 'pdf' | 'text';

export type GameType = 'mix' | 'cloze' | 'type' | 'order' | 'match';

export type Profile = 'university' | 'school' | 'self';

export type Subject = {
  id: number;
  title: string;
  game: GameType;
  created_at: string;
};

export type SubjectSummary = Subject & {
  total: number;
  fresh: number;
  due: number;
};

export type Page = {
  id: number;
  subject_id: number;
  kind: PageKind;
  uri: string;
  label: string;
  position: number;
  /** The passage to memorise (read from the photo or typed). Empty when the card is just a photo/PDF page. */
  text: string;
  keywords: string;
  question: string;
  /** 1 = a question card: `question` is asked and `text` is its answer. */
  qa: number;
  /** 1 = the teacher stressed this part: studied first and reviewed more often. */
  important: number;
  stage: number;
  due: string | null;
  studied_on: string | null;
  last_reviewed: string | null;
  reviews: number;
  lapses: number;
  created_at: string;
};

export type PageWithSubject = Page & { subject_title: string; subject_game: GameType };

export type Language = 'ar' | 'en';

export type Settings = {
  name: string;
  language: Language;
  gender: 'm' | 'f';
  profile: Profile;
  onboarded: boolean;
  dailyMinutes: number;
  answerSeconds: number;
  /** How many times the passage is read aloud before the last look. */
  listenRepeats: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  sound: boolean;
  /** Web: the home screen already suggested adding the calendar reminder. */
  reminderPrompted: boolean;
  /** The user's own free Google AI Studio key for smarter questions (optional, stays on the device). */
  aiKey: string;
};

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  language: 'ar',
  gender: 'm',
  profile: 'university',
  onboarded: false,
  dailyMinutes: 15,
  answerSeconds: 60,
  listenRepeats: 2,
  reminderEnabled: true,
  reminderHour: 19,
  reminderMinute: 0,
  sound: true,
  reminderPrompted: false,
  aiKey: '',
};

const SCHEMA_VERSION = 3;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        uri TEXT NOT NULL,
        label TEXT NOT NULL,
        position INTEGER NOT NULL,
        keywords TEXT NOT NULL DEFAULT '',
        question TEXT NOT NULL DEFAULT '',
        stage INTEGER NOT NULL DEFAULT 0,
        due TEXT,
        studied_on TEXT,
        last_reviewed TEXT,
        reviews INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pages_due ON pages(due);
      CREATE INDEX IF NOT EXISTS pages_subject ON pages(subject_id, position);
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS xp_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS study_log (
        day TEXT PRIMARY KEY,
        seconds INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  if (version < 2) {
    await db.execAsync(`
      ALTER TABLE subjects ADD COLUMN game TEXT NOT NULL DEFAULT 'mix';
      ALTER TABLE pages ADD COLUMN text TEXT NOT NULL DEFAULT '';
    `);
  }
  if (version < 3) {
    await db.execAsync(`
      ALTER TABLE pages ADD COLUMN qa INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE pages ADD COLUMN important INTEGER NOT NULL DEFAULT 0;
    `);
  }
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

// ---------- settings ----------

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(db: SQLiteDatabase, patch: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    );
  }
}

// ---------- subjects ----------

export async function listSubjects(db: SQLiteDatabase, today = todayStr()): Promise<SubjectSummary[]> {
  return db.getAllAsync<SubjectSummary>(
    `SELECT s.*,
       COUNT(p.id) AS total,
       COALESCE(SUM(CASE WHEN p.studied_on IS NULL THEN 1 ELSE 0 END), 0) AS fresh,
       COALESCE(SUM(CASE WHEN p.due IS NOT NULL AND p.due <= ? THEN 1 ELSE 0 END), 0) AS due
     FROM subjects s LEFT JOIN pages p ON p.subject_id = s.id
     GROUP BY s.id ORDER BY s.created_at DESC`,
    today,
  );
}

export async function getSubject(db: SQLiteDatabase, id: number): Promise<Subject | null> {
  return db.getFirstAsync<Subject>('SELECT * FROM subjects WHERE id = ?', id);
}

export async function createSubject(db: SQLiteDatabase, title: string, game: GameType = 'mix'): Promise<number> {
  const res = await db.runAsync(
    'INSERT INTO subjects (title, game, created_at) VALUES (?, ?, ?)',
    title.trim(),
    game,
    new Date().toISOString(),
  );
  return res.lastInsertRowId;
}

export async function renameSubject(db: SQLiteDatabase, id: number, title: string): Promise<void> {
  await db.runAsync('UPDATE subjects SET title = ? WHERE id = ?', title.trim(), id);
}

export async function setSubjectGame(db: SQLiteDatabase, id: number, game: GameType): Promise<void> {
  await db.runAsync('UPDATE subjects SET game = ? WHERE id = ?', game, id);
}

export async function deleteSubject(db: SQLiteDatabase, id: number): Promise<string[]> {
  const uris = await db.getAllAsync<{ uri: string }>(
    'SELECT DISTINCT uri FROM pages WHERE subject_id = ?',
    id,
  );
  await db.runAsync('DELETE FROM pages WHERE subject_id = ?', id);
  await db.runAsync('DELETE FROM subjects WHERE id = ?', id);
  return uris.map((u) => u.uri);
}

// ---------- pages ----------

export type NewPage = {
  kind: PageKind;
  uri: string;
  label: string;
  text?: string;
  /** For question cards. */
  question?: string;
  qa?: boolean;
  important?: boolean;
};

export async function addPages(db: SQLiteDatabase, subjectId: number, pages: NewPage[]): Promise<void> {
  if (pages.length === 0) return;
  const row = await db.getFirstAsync<{ max: number | null }>(
    'SELECT MAX(position) AS max FROM pages WHERE subject_id = ?',
    subjectId,
  );
  let position = (row?.max ?? 0) + 1;
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const p of pages) {
      await db.runAsync(
        'INSERT INTO pages (subject_id, kind, uri, label, position, text, question, qa, important, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        subjectId,
        p.kind,
        p.uri,
        p.label,
        position++,
        p.text ?? '',
        p.question ?? '',
        p.qa ? 1 : 0,
        p.important ? 1 : 0,
        now,
      );
    }
  });
}

export async function listPages(db: SQLiteDatabase, subjectId: number): Promise<Page[]> {
  return db.getAllAsync<Page>('SELECT * FROM pages WHERE subject_id = ? ORDER BY position', subjectId);
}

export async function countPages(db: SQLiteDatabase, subjectId: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM pages WHERE subject_id = ?',
    subjectId,
  );
  return row?.n ?? 0;
}

export async function getPage(db: SQLiteDatabase, id: number): Promise<PageWithSubject | null> {
  return db.getFirstAsync<PageWithSubject>(
    `SELECT p.*, s.title AS subject_title, s.game AS subject_game FROM pages p JOIN subjects s ON s.id = p.subject_id WHERE p.id = ?`,
    id,
  );
}

export async function updatePageNotes(
  db: SQLiteDatabase,
  id: number,
  notes: { keywords: string; question: string; label?: string; text?: string },
): Promise<void> {
  if (notes.text !== undefined) {
    await db.runAsync('UPDATE pages SET text = ? WHERE id = ?', notes.text, id);
  }
  if (notes.label !== undefined) {
    await db.runAsync(
      'UPDATE pages SET keywords = ?, question = ?, label = ? WHERE id = ?',
      notes.keywords,
      notes.question,
      notes.label,
      id,
    );
  } else {
    await db.runAsync('UPDATE pages SET keywords = ?, question = ? WHERE id = ?', notes.keywords, notes.question, id);
  }
}

/** Deletes the page; returns its file uri if no other page still uses that file. */
export async function deletePage(db: SQLiteDatabase, id: number): Promise<string | null> {
  const page = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM pages WHERE id = ?', id);
  if (!page) return null;
  await db.runAsync('DELETE FROM pages WHERE id = ?', id);
  const others = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE uri = ?', page.uri);
  return (others?.n ?? 0) === 0 ? page.uri : null;
}

export async function setPageImportant(db: SQLiteDatabase, id: number, important: boolean): Promise<void> {
  await db.runAsync('UPDATE pages SET important = ? WHERE id = ?', important ? 1 : 0, id);
}

export async function resetPage(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync(
    'UPDATE pages SET stage = 0, due = NULL, studied_on = NULL, last_reviewed = NULL, reviews = 0, lapses = 0 WHERE id = ?',
    id,
  );
}

// ---------- study & review ----------

export async function studiedTodayCount(db: SQLiteDatabase, today = todayStr()): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE studied_on = ?', today);
  return row?.n ?? 0;
}

/** New (never studied) pages in study order, optionally for one subject. */
export async function nextNewPages(
  db: SQLiteDatabase,
  limit: number,
  subjectId?: number,
): Promise<PageWithSubject[]> {
  if (limit <= 0) return [];
  const where = subjectId ? 'AND p.subject_id = ?' : '';
  const params: (number | string)[] = subjectId ? [subjectId, limit] : [limit];
  return db.getAllAsync<PageWithSubject>(
    `SELECT p.*, s.title AS subject_title, s.game AS subject_game FROM pages p JOIN subjects s ON s.id = p.subject_id
     WHERE p.studied_on IS NULL ${where}
     ORDER BY s.created_at, p.important DESC, p.position LIMIT ?`,
    ...params,
  );
}

export async function countNewPages(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE studied_on IS NULL');
  return row?.n ?? 0;
}

export async function duePages(db: SQLiteDatabase, today = todayStr(), subjectId?: number): Promise<PageWithSubject[]> {
  const where = subjectId ? 'AND p.subject_id = ?' : '';
  const params: (number | string)[] = subjectId ? [today, subjectId] : [today];
  return db.getAllAsync<PageWithSubject>(
    `SELECT p.*, s.title AS subject_title, s.game AS subject_game FROM pages p JOIN subjects s ON s.id = p.subject_id
     WHERE p.due IS NOT NULL AND p.due <= ? ${where}
     ORDER BY p.due, p.important DESC, s.created_at, p.position`,
    ...params,
  );
}

export async function markStudied(db: SQLiteDatabase, id: number, today = todayStr()): Promise<void> {
  const s = afterStudy(today);
  await db.runAsync('UPDATE pages SET studied_on = ?, stage = ?, due = ? WHERE id = ?', today, s.stage, s.due, id);
}

export async function recordReview(db: SQLiteDatabase, page: Page, grade: Grade, today = todayStr()): Promise<void> {
  const s = afterReview(page.stage, grade, today, page.important === 1);
  await db.runAsync(
    `UPDATE pages SET stage = ?, due = ?, last_reviewed = ?, reviews = reviews + 1,
       lapses = lapses + ? WHERE id = ?`,
    s.stage,
    s.due,
    today,
    grade === 'again' ? 1 : 0,
    page.id,
  );
}

export async function upcomingReviews(
  db: SQLiteDatabase,
  today = todayStr(),
  days = 7,
): Promise<{ due: string; n: number }[]> {
  return db.getAllAsync<{ due: string; n: number }>(
    `SELECT due, COUNT(*) AS n FROM pages WHERE due > ? GROUP BY due ORDER BY due LIMIT ?`,
    today,
    days,
  );
}

// ---------- study time ----------

export async function addStudySeconds(db: SQLiteDatabase, seconds: number, today = todayStr()): Promise<void> {
  if (seconds <= 0) return;
  await db.runAsync(
    'INSERT INTO study_log (day, seconds) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET seconds = seconds + excluded.seconds',
    today,
    Math.round(seconds),
  );
}

export async function studySecondsToday(db: SQLiteDatabase, today = todayStr()): Promise<number> {
  const row = await db.getFirstAsync<{ seconds: number }>('SELECT seconds FROM study_log WHERE day = ?', today);
  return row?.seconds ?? 0;
}

/** Consecutive days (ending today or yesterday) with any study time. */
export async function streak(db: SQLiteDatabase, today = todayStr()): Promise<number> {
  const rows = await db.getAllAsync<{ day: string }>(
    'SELECT day FROM study_log WHERE seconds > 0 AND day <= ? ORDER BY day DESC LIMIT 400',
    today,
  );
  const days = new Set(rows.map((r) => r.day));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ---------- points & stats ----------

export type XpReason = 'study' | 'review' | 'game' | 'game_perfect';

export async function addXp(db: SQLiteDatabase, amount: number, reason: XpReason, today = todayStr()): Promise<void> {
  if (amount <= 0) return;
  await db.runAsync('INSERT INTO xp_log (day, amount, reason) VALUES (?, ?, ?)', today, amount, reason);
}

export type Stats = {
  xp: number;
  xpToday: number;
  studied: number;
  reviews: number;
  mastered: number;
  games: number;
  perfectGames: number;
  streak: number;
};

export async function getStats(db: SQLiteDatabase, today = todayStr()): Promise<Stats> {
  const xp = await db.getFirstAsync<{ total: number | null; today: number | null; games: number; perfect: number }>(
    `SELECT SUM(amount) AS total,
       SUM(CASE WHEN day = ? THEN amount ELSE 0 END) AS today,
       SUM(CASE WHEN reason IN ('game', 'game_perfect') THEN 1 ELSE 0 END) AS games,
       SUM(CASE WHEN reason = 'game_perfect' THEN 1 ELSE 0 END) AS perfect
     FROM xp_log`,
    today,
  );
  const pages = await db.getFirstAsync<{ studied: number | null; reviews: number | null; mastered: number | null }>(
    `SELECT SUM(CASE WHEN studied_on IS NOT NULL THEN 1 ELSE 0 END) AS studied,
       SUM(reviews) AS reviews,
       SUM(CASE WHEN stage >= 3 THEN 1 ELSE 0 END) AS mastered
     FROM pages`,
  );
  return {
    xp: xp?.total ?? 0,
    xpToday: xp?.today ?? 0,
    games: xp?.games ?? 0,
    perfectGames: xp?.perfect ?? 0,
    studied: pages?.studied ?? 0,
    reviews: pages?.reviews ?? 0,
    mastered: pages?.mastered ?? 0,
    streak: await streak(db, today),
  };
}

/**
 * Cards that have words to play with (their passage or the user's notes).
 * Studied cards come first, but any card can be played: there is no minimum.
 */
export async function gamePool(db: SQLiteDatabase, subjectId?: number): Promise<PageWithSubject[]> {
  const where = subjectId ? 'AND p.subject_id = ?' : '';
  const params: number[] = subjectId ? [subjectId] : [];
  return db.getAllAsync<PageWithSubject>(
    `SELECT p.*, s.title AS subject_title, s.game AS subject_game FROM pages p JOIN subjects s ON s.id = p.subject_id
     WHERE (TRIM(p.text) <> '' OR TRIM(p.keywords) <> '') ${where}
     ORDER BY (p.studied_on IS NULL), RANDOM() LIMIT 60`,
    ...params,
  );
}
