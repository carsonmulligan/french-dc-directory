const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();
const { stripe, PREMIUM_PRICE_ID } = require('./config/stripe');

const app = express();
const port = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT,
    name TEXT,
    email TEXT,
    is_premium BOOLEAN DEFAULT FALSE
  )`);

  // Resources table
  db.run(`CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    name TEXT,
    website TEXT,
    locations TEXT,
    description TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER,
    resource_type TEXT,
    text TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(resource_id) REFERENCES resources(id)
  )`);

  // Add YouTube videos table
  db.run(`CREATE TABLE IF NOT EXISTS youtube_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    video_id TEXT,
    description TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add playlists table
  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Add playlist_videos table
  db.run(`CREATE TABLE IF NOT EXISTS playlist_videos (
    playlist_id INTEGER,
    video_id INTEGER,
    position INTEGER,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id),
    FOREIGN KEY(video_id) REFERENCES youtube_videos(id)
  )`);
});

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your session secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    db.get("SELECT * FROM users WHERE google_id = ?", [profile.id], (err, row) => {
      if (err) return done(err);
      if (!row) {
        db.run("INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)", 
          [profile.id, profile.displayName, profile.emails[0].value],
          function(err) {
            if (err) return done(err);
            return done(null, { id: this.lastID, google_id: profile.id, name: profile.displayName });
          }
        );
      } else {
        return done(null, row);
      }
    });
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    done(err, row);
  });
});

// Routes

// Home page
app.get('/', (req, res) => {
  db.all("SELECT * FROM resources", [], (err, resources) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error fetching resources');
    }
    db.all("SELECT * FROM youtube_videos", [], (err, videos) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error fetching videos');
      }
      res.render('index', { 
        user: req.user, 
        resources: resources,
        videos: videos
      });
    });
  });
});

// Add new resource
app.get('/add-resource', (req, res) => {
  res.render('add-resource', { user: req.user });
});

app.post('/add-resource', (req, res) => {
  const { type, name, website, locations, description } = req.body;
  db.run("INSERT INTO resources (type, name, website, locations, description) VALUES (?, ?, ?, ?, ?)",
    [type, name, website, locations, description],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Error adding resource');
      }
      res.redirect('/');
    }
  );
});

// View resource details
app.get('/resource/:id', (req, res) => {
  const resourceId = req.params.id;
  db.get("SELECT * FROM resources WHERE id = ?", [resourceId], (err, resource) => {
    if (err || !resource) {
      console.error(err);
      return res.status(404).send('Resource not found');
    }
    db.all("SELECT * FROM comments WHERE resource_id = ? ORDER BY created_at DESC", [resourceId], (err, comments) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error fetching comments');
      }
      res.render('resource', { user: req.user, resource, comments });
    });
  });
});

// Upvote resource
app.post('/resource/:id/upvote', (req, res) => {
  const resourceId = req.params.id;
  db.run("UPDATE resources SET upvotes = upvotes + 1 WHERE id = ?", [resourceId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error upvoting resource');
    }
    res.redirect(`/resource/${resourceId}`);
  });
});

// Downvote resource
app.post('/resource/:id/downvote', (req, res) => {
  const resourceId = req.params.id;
  db.run("UPDATE resources SET downvotes = downvotes + 1 WHERE id = ?", [resourceId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error downvoting resource');
    }
    res.redirect(`/resource/${resourceId}`);
  });
});

// Add comment
app.post('/resource/:id/comment', (req, res) => {
  const resourceId = req.params.id;
  const { text } = req.body;
  db.run("INSERT INTO comments (resource_id, resource_type, text) VALUES (?, ?, ?)",
    [resourceId, 'resource', text],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).send('Error adding comment');
      }
      res.redirect(`/resource/${resourceId}`);
    }
  );
});

// Upvote comment
app.post('/comment/:id/upvote', (req, res) => {
  const commentId = req.params.id;
  db.run("UPDATE comments SET upvotes = upvotes + 1 WHERE id = ?", [commentId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error upvoting comment');
    }
    res.redirect('back');
  });
});

// Downvote comment
app.post('/comment/:id/downvote', (req, res) => {
  const commentId = req.params.id;
  db.run("UPDATE comments SET downvotes = downvotes + 1 WHERE id = ?", [commentId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error downvoting comment');
    }
    res.redirect('back');
  });
});

// Authentication routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Get YouTube videos
app.get('/videos', (req, res) => {
  db.all("SELECT * FROM youtube_videos ORDER BY created_at DESC", [], (err, videos) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching videos' });
    }
    res.json(videos);
  });
});

// Create playlist
app.post('/playlist', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Must be logged in' });
  
  const { name, description = '' } = req.body;
  db.run(
    "INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)",
    [req.user.id, name, description],
    (err) => {
      if (err) return res.status(500).json({ error: 'Error creating playlist' });
      res.json({ success: true });
    }
  );
});

// Add video to playlist
app.post('/playlist/add-video', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Must be logged in' });
  
  const { playlistId, videoId } = req.body;
  db.run(
    "INSERT INTO playlist_videos (playlist_id, video_id) VALUES (?, ?)",
    [playlistId, videoId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Error adding video' });
      res.json({ success: true });
    }
  );
});

// Get user's playlists
app.get('/playlists', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Must be logged in' });
  
  db.all(
    "SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, playlists) => {
      if (err) return res.status(500).json({ error: 'Error fetching playlists' });
      res.json(playlists);
    }
  );
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
