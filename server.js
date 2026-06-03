require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Persistent data directory (Railway Volume or local)
const DATA_DIR = process.env.NODE_ENV === 'production'
    ? '/app/data'
    : path.join(__dirname);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
// Serve uploaded files from persistent data dir
app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));
app.use('/covers', express.static(path.join(DATA_DIR, 'covers')));

/* ===================== MULTER CONFIG ===================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(DATA_DIR, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `showreel_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 209715200
    },
    fileFilter: (req, file, cb) => {
        const videoMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        if (videoMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    }
});

/* ===================== DATABASE SETUP ===================== */
const db = new Database(path.join(DATA_DIR, 'db.sqlite'));
db.pragma('journal_mode = WAL');
console.log('Connected to SQLite database');
initializeDatabase();

function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS showreels (
            id INTEGER PRIMARY KEY,
            filename TEXT,
            originalName TEXT,
            filesize INTEGER,
            filePath TEXT UNIQUE,
            uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            uploadedBy TEXT
        );
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            slug TEXT UNIQUE,
            displayName TEXT,
            coverImage TEXT,
            description TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY,
            categoryId INTEGER,
            title TEXT,
            description TEXT,
            type TEXT,
            fileUrl TEXT,
            thumbnailUrl TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (categoryId) REFERENCES categories(id)
        );
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY,
            photoUrl TEXT,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const categories = [
        { slug: 'animation-shorts', displayName: 'Animation Shorts' },
        { slug: 'real-estate',      displayName: 'Real Estate' },
        { slug: 'ai-ads',           displayName: 'AI Ads' },
        { slug: 'car-reels',        displayName: 'Car Reels' },
        { slug: 'color-grading',    displayName: 'Color Grading' },
        { slug: 'long-form',        displayName: 'Long-Form' },
        { slug: 'fb',               displayName: 'F&B' },
        { slug: 'medical',          displayName: 'Insta Reels' },
        { slug: 'retouch',          displayName: 'Retouch' }
    ];

    const insertCat = db.prepare('INSERT OR IGNORE INTO categories (slug, displayName) VALUES (?, ?)');
    categories.forEach(cat => insertCat.run(cat.slug, cat.displayName));

    const adminExists = db.prepare('SELECT id FROM admin WHERE email = ?').get(process.env.ADMIN_EMAIL);
    if (!adminExists) {
        db.prepare('INSERT INTO admin (email, password) VALUES (?, ?)').run(
            process.env.ADMIN_EMAIL,
            process.env.ADMIN_PASSWORD
        );
        console.log('Admin user created');
    }
}

/* ===================== HELPER FUNCTIONS ===================== */
function verifyAdmin(email, password) {
    const row = db.prepare('SELECT id FROM admin WHERE email = ? AND password = ?').get(email, password);
    return !!row;
}

function getShowreel() {
    return db.prepare('SELECT * FROM showreels ORDER BY uploadDate DESC LIMIT 1').get() || null;
}

/* ===================== API ROUTES ===================== */

// Admin Login
app.post('/api/admin-login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password required' });

    try {
        const isValid = verifyAdmin(email, password);
        if (isValid) {
            res.json({ success: true, message: 'Login successful', email });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Upload Showreel
app.post('/api/upload-showreel', upload.single('showreel'), (req, res) => {
    const { adminEmail } = req.body;
    if (!req.file)
        return res.status(400).json({ success: false, message: 'No file provided' });
    if (!adminEmail) {
        fs.unlinkSync(req.file.path);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const old = getShowreel();
        if (old && fs.existsSync(old.filePath)) fs.unlinkSync(old.filePath);
        db.prepare('DELETE FROM showreels').run();
        db.prepare('INSERT INTO showreels (filename, originalName, filesize, filePath, uploadedBy) VALUES (?, ?, ?, ?, ?)')
          .run(req.file.filename, req.file.originalname, req.file.size, req.file.path, adminEmail);
        res.json({
            success: true,
            message: 'Showreel uploaded successfully',
            file: { filename: req.file.filename, size: req.file.size, sizeInMB: (req.file.size / 1024 / 1024).toFixed(2) }
        });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Showreel Info
app.get('/api/showreel', (req, res) => {
    try {
        const showreel = getShowreel();
        if (showreel) {
            res.json({
                success: true,
                file: {
                    filename: showreel.filename,
                    originalName: showreel.originalName,
                    size: showreel.filesize,
                    sizeInMB: (showreel.filesize / 1024 / 1024).toFixed(2),
                    uploadDate: showreel.uploadDate
                }
            });
        } else {
            res.json({ success: false, message: 'No showreel uploaded yet' });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Watch Showreel (Stream Video)
app.get('/api/showreel/watch', (req, res) => {
    const quality = req.query.quality || 'auto';
    const row = db.prepare('SELECT * FROM showreels ORDER BY uploadDate DESC LIMIT 1').get();
    if (!row) return res.status(404).json({ success: false, message: 'No showreel found' });

    let file = row.filePath;
    if (quality !== 'auto') {
        const dirPath = path.dirname(file);
        const ext = path.extname(file);
        const basename = path.basename(file, ext);
        const qualityFile = path.join(dirPath, `${basename}_${quality}${ext}`);
        if (fs.existsSync(qualityFile)) file = qualityFile;
    }

    if (!fs.existsSync(file))
        return res.status(404).json({ success: false, message: 'File not found on server' });

    const stat = fs.statSync(file);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'video/mp4'
        });
        fs.createReadStream(file, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4' });
        fs.createReadStream(file).pipe(res);
    }
});

// Delete Showreel
app.delete('/api/showreel', (req, res) => {
    const { adminEmail, password } = req.body;
    try {
        if (!verifyAdmin(adminEmail, password))
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        const showreel = getShowreel();
        if (!showreel) return res.status(404).json({ success: false, message: 'No showreel to delete' });
        if (fs.existsSync(showreel.filePath)) fs.unlinkSync(showreel.filePath);
        db.prepare('DELETE FROM showreels').run();
        res.json({ success: true, message: 'Showreel deleted successfully' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Category
app.get('/api/category/:slug', (req, res) => {
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const projects = db.prepare('SELECT * FROM projects WHERE categoryId = ? ORDER BY createdAt DESC').all(category.id);
    res.json({
        success: true,
        category: { slug: category.slug, displayName: category.displayName, coverImage: category.coverImage },
        projects: projects.map(p => ({
            id: p.id, title: p.title, description: p.description,
            type: p.type, fileUrl: p.fileUrl, thumbnail: p.thumbnailUrl
        }))
    });
});

// Get Profile
app.get('/api/profile', (req, res) => {
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    res.json({ success: !!profile && !!profile.photoUrl, photoUrl: profile ? profile.photoUrl : null });
});

// Upload Profile Photo
const profileUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(DATA_DIR, 'uploads', 'profile');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        cb(null, imageMimes.includes(file.mimetype));
    }
});

app.post('/api/upload-profile', profileUpload.single('profilePhoto'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const imageUrl = `/uploads/profile/${req.file.filename}`;
    try {
        db.prepare('INSERT OR REPLACE INTO profile (id, photoUrl, updatedAt) VALUES (1, ?, CURRENT_TIMESTAMP)').run(imageUrl);
        res.json({ success: true, message: 'Profile photo updated successfully', imageUrl });
    } catch (e) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Upload Category Cover
const categoryUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(DATA_DIR, 'covers');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${req.body.categorySlug || 'default'}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        cb(null, imageMimes.includes(file.mimetype));
    }
});

app.post('/api/upload-category-cover', categoryUpload.single('coverImage'), (req, res) => {
    const categorySlug = req.body.categorySlug;
    if (!req.file || !categorySlug) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Missing file or category' });
    }
    const coverPath = `/covers/${req.file.filename}`;
    try {
        db.prepare('UPDATE categories SET coverImage = ? WHERE slug = ?').run(coverPath, categorySlug);
        res.json({ success: true, message: 'Category cover updated successfully', coverPath });
    } catch (e) {
        fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Add project
app.post('/api/projects', async (req, res) => {
    const { categorySlug, type, url, title, description, adminEmail } = req.body;
    if (!categorySlug || !type || !url || !adminEmail)
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    if (!['video', 'image'].includes(type))
        return res.status(400).json({ success: false, message: 'type must be video or image' });

    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(categorySlug);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    let thumbnailUrl = url;

    if (type === 'video') {
        // YouTube
        const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\s?/]+)/);
        if (yt) {
            thumbnailUrl = `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;
        }
        // Vimeo — fetch thumbnail from oEmbed API
        const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vm) {
            try {
                const vimeoRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
                if (vimeoRes.ok) {
                    const vimeoData = await vimeoRes.json();
                    if (vimeoData.thumbnail_url) thumbnailUrl = vimeoData.thumbnail_url;
                }
            } catch (e) {
                console.error('Vimeo thumbnail fetch failed:', e.message);
                thumbnailUrl = url; // fallback
            }
        }
    }

    const projectTitle = title || (type === 'video' ? 'Video Project' : 'Image Project');
    const result = db.prepare(
        'INSERT INTO projects (categoryId, title, description, type, fileUrl, thumbnailUrl) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(category.id, projectTitle, description || '', type, url, thumbnailUrl);

    res.json({
        success: true,
        project: { id: result.lastInsertRowid, title: projectTitle, description: description || '', type, fileUrl: url, thumbnail: thumbnailUrl }
    });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    const { adminEmail } = req.body;
    if (!adminEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true });
});

// Static file serving
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ===================== ERROR HANDLING ===================== */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return res.status(400).json({ success: false, message: 'File size exceeds limit' });
    if (err)
        return res.status(500).json({ success: false, message: err.message });
    next();
});

/* ===================== START SERVER ===================== */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});
