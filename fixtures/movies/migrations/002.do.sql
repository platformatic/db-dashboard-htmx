-- create quotes table
CREATE TABLE quotes (
  id INTEGER PRIMARY KEY,
  movie_id INTEGER NOT NULL,
  quote TEXT NOT NULL,
  FOREIGN KEY (movie_id) REFERENCES movies (id)
);
