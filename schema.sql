CREATE TABLE timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade INTEGER NOT NULL,          -- 学年（1〜4）
    date TEXT NOT NULL,              -- 日付（YYYY-MM-DD）
    day_of_week INTEGER NOT NULL,    -- 曜日（1=月〜5=金）
    period INTEGER NOT NULL,         -- 時限（1〜4）
    subject TEXT NOT NULL,           -- 科目名
    classroom TEXT NOT NULL,         -- 教室名
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(grade, date, period)      -- 同一学年・日付・時限の重複防止
);

CREATE INDEX idx_timetable_lookup ON timetable(grade, date);
CREATE INDEX idx_timetable_week ON timetable(grade, day_of_week);
