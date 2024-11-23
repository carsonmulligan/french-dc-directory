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
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, google_id TEXT, name TEXT, email TEXT, is_premium BOOLEAN DEFAULT FALSE)");
  db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, resource_id INTEGER, resource_type TEXT, text TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
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

// Data
const languageSchools = [
  {
    id: 1,
    name: "French Academy DC",
    website: "https://www.frenchacademy.us/",
    locations: ["Farragut Square (DC)", "Chevy Chase (DC)", "Alexandria (VA)"],
    description: "Offers classes from A1 to B2+ levels, both in-person and online"
  },
  {
    id: 2,
    name: "International Language Institute of DC (ILI)",
    website: "https://ilidc.com/flp/frenchclass/",
    locations: ["Downtown Washington, DC"],
    description: "10-week terms, beginner to advanced levels"
  },
  {
    id: 3,
    name: "Alliance Française de Washington DC",
    website: "https://francedc.org/adult-learning",
    locations: ["Washington, DC"],
    description: "Offers customized private and semi-private instruction"
  },
  {
    id: 4,
    name: "Global Language Network",
    website: "https://thegln.org/",
    locations: ["Washington, DC"],
    description: "Nonprofit organization offering affordable language programs"
  },
  {
    id: 5,
    name: "French Embassy's FLE (Français Langue Étrangère) Resources",
    website: "https://franceintheus.org/spip.php?article330",
    locations: ["Online"],
    description: "Provides information on French language certifications and diplomas"
  }
];

const communities = [
  {
    id: 1,
    name: "DC Language Exchange",
    website: "https://www.meetup.com/dc-language-exchange/",
    description: "Organizes language exchange events for various languages, including French"
  },
  {
    id: 2,
    name: "French Conversation Meetup Group",
    website: "https://www.meetup.com/french-conversation-meetup-group/",
    description: "Regular meetups for French language practice"
  },
  {
    id: 3,
    name: "Alliance Française de Washington DC Events",
    website: "https://francedc.org/events",
    description: "Cultural events and language practice opportunities"
  },
  {
    id: 4,
    name: "Francophonie Cultural Festival",
    website: "https://www.francophonie-dc.org/",
    description: "Annual festival celebrating French language and Francophone cultures"
  },
  {
    id: 5,
    name: "French-American Chamber of Commerce",
    website: "https://www.faccwdc.org/",
    description: "Networking events and opportunities to practice French in a professional context"
  }
];

const onlineResources = [
  {
    id: 1,
    name: "Italki",
    website: "https://www.italki.com/",
    description: "Platform to find French tutors for one-on-one lessons"
  },
  {
    id: 2,
    name: "Conversation Exchange",
    website: "https://www.conversationexchange.com/",
    description: "Find language exchange partners in the DC area"
  },
  {
    id: 3,
    name: "French Embassy's Cultural Services",
    website: "https://frenchculture.org/",
    description: "Resources for French language and culture in the United States"
  },
  {
    id: 4,
    name: "TV5MONDE",
    website: "https://apprendre.tv5monde.com/",
    description: "Free online French lessons and resources"
  },
  {
    id: 5,
    name: "RFI Savoirs",
    website: "https://savoirs.rfi.fr/",
    description: "French learning resources from Radio France Internationale"
  }
];

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    user: req.user, 
    languageSchools: languageSchools,
    communities: communities,
    onlineResources: onlineResources
  });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  });

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.post('/comment', (req, res) => {
  if (!req.user) {
    return res.status(401).send('You must be logged in to comment');
  }

  const { resource_id, resource_type, text } = req.body;
  db.run("INSERT INTO comments (user_id, resource_id, resource_type, text) VALUES (?, ?, ?, ?)",
    [req.user.id, resource_id, resource_type, text],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saving comment');
      }
      res.redirect('/');
    }
  );
});

app.get('/comments/:resourceType/:resourceId', (req, res) => {
  db.all("SELECT comments.*, users.name as user_name FROM comments JOIN users ON comments.user_id = users.id WHERE resource_id = ? AND resource_type = ? ORDER BY created_at DESC", 
    [req.params.resourceId, req.params.resourceType],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error fetching comments');
      }
      res.json(rows);
    }
  );
});

app.post('/create-checkout-session', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Please login first' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.get('/subscription-success', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
  
  // Update user's subscription status in database
  db.run("UPDATE users SET is_premium = TRUE WHERE email = ?", 
    [session.customer_email],
    (err) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Error updating subscription status');
      }
      res.render('subscription-success');
    }
  );
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

