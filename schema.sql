
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  category TEXT CHECK(category IN ('항공','육상','해운','글로벌')) NOT NULL,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  summary TEXT,
  source TEXT,
  category TEXT,
  url TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS indicators_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  name TEXT,
  value REAL,
  change_percent REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO keywords (keyword, category) VALUES 
('컨테이너 운임', '해운'),
('SCFI', '해운'),
('항공화물', '항공'),
('홍해 리스크', '글로벌'),
('유가', '글로벌'),
('환율', '글로벌'),
('물류대란', '육상'),
('BDI', '해운'),
('TAC Index', '항공');
