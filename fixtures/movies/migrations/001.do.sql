-- create movies table
CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  genre TEXT NOT NULL,
  duration INTEGER NOT NULL,
  rating REAL NOT NULL
);
