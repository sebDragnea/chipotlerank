const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database setup
const db = new DatabaseSync(path.join(__dirname, '..', 'chipotlerank.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_filename TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    vote_type TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(post_id, voter_id)
  );
`);

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// GET /api/posts?sort=top|best|new
app.get('/api/posts', (req, res) => {
  const sort = req.query.sort || 'top';
  const voterId = req.headers['x-voter-id'] || '';

  let posts;
  try {
    const rows = db.prepare(`
      SELECT
        p.*,
        v.vote_type as user_vote
      FROM posts p
      LEFT JOIN votes v ON p.id = v.post_id AND v.voter_id = ?
    `).all(voterId);

    if (sort === 'top') {
      // Sort by net score (upvotes - downvotes)
      posts = rows.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    } else if (sort === 'best') {
      // Sort by % positive (upvotes / total votes), posts with no votes go last
      posts = rows.sort((a, b) => {
        const totalA = a.upvotes + a.downvotes;
        const totalB = b.upvotes + b.downvotes;
        const ratioA = totalA === 0 ? -1 : a.upvotes / totalA;
        const ratioB = totalB === 0 ? -1 : b.upvotes / totalB;
        return ratioB - ratioA;
      });
    } else {
      // Sort by newest
      posts = rows.sort((a, b) => b.created_at - a.created_at);
    }

    res.json(posts.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image_filename: p.image_filename,
      created_at: p.created_at,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      user_vote: p.user_vote || null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts — multipart form upload
app.post('/api/posts', upload.single('image'), (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and image are required' });
    }

    const id = uuidv4();
    const created_at = Date.now();

    db.prepare(`
      INSERT INTO posts (id, title, description, image_filename, created_at, upvotes, downvotes)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `).run(id, title, description || '', req.file.filename, created_at);

    res.status(201).json({ id, title, description, image_filename: req.file.filename, created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// POST /api/posts/:id/vote
app.post('/api/posts/:id/vote', (req, res) => {
  const { id: postId } = req.params;
  const { vote } = req.body;
  const voterId = req.headers['x-voter-id'];

  if (!voterId) {
    return res.status(400).json({ error: 'X-Voter-Id header is required' });
  }
  if (!['up', 'down'].includes(vote)) {
    return res.status(400).json({ error: 'vote must be "up" or "down"' });
  }

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  try {
    const existing = db.prepare(
      'SELECT * FROM votes WHERE post_id = ? AND voter_id = ?'
    ).get(postId, voterId);

    if (existing) {
      if (existing.vote_type === vote) {
        // Same vote → toggle off (remove vote)
        db.prepare('DELETE FROM votes WHERE post_id = ? AND voter_id = ?').run(postId, voterId);
        if (vote === 'up') {
          db.prepare('UPDATE posts SET upvotes = upvotes - 1 WHERE id = ?').run(postId);
        } else {
          db.prepare('UPDATE posts SET downvotes = downvotes - 1 WHERE id = ?').run(postId);
        }
      } else {
        // Different vote → change vote
        db.prepare(
          'UPDATE votes SET vote_type = ?, created_at = ? WHERE post_id = ? AND voter_id = ?'
        ).run(vote, Date.now(), postId, voterId);

        if (vote === 'up') {
          // was down, now up
          db.prepare(
            'UPDATE posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = ?'
          ).run(postId);
        } else {
          // was up, now down
          db.prepare(
            'UPDATE posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = ?'
          ).run(postId);
        }
      }
    } else {
      // No existing vote → insert
      db.prepare(
        'INSERT INTO votes (id, post_id, voter_id, vote_type, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(uuidv4(), postId, voterId, vote, Date.now());

      if (vote === 'up') {
        db.prepare('UPDATE posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
      } else {
        db.prepare('UPDATE posts SET downvotes = downvotes + 1 WHERE id = ?').run(postId);
      }
    }

    const updated = db.prepare('SELECT * FROM votes WHERE post_id = ? AND voter_id = ?').get(postId, voterId);
    const updatedPost = db.prepare('SELECT upvotes, downvotes FROM posts WHERE id = ?').get(postId);

    res.json({
      upvotes: updatedPost.upvotes,
      downvotes: updatedPost.downvotes,
      user_vote: updated ? updated.vote_type : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ChipotleRank backend running on http://localhost:${PORT}`);
});
