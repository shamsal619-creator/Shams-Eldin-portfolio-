require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/* ===================== MULTER CONFIG ===================== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
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
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 209715200 // 200MB
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
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Admin table
        db.run(`
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY,
                email TEXT UNIQUE,
                password TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Showreels table
        db.run(`
            CREATE TABLE IF NOT EXISTS showreels (
                id INTEGER PRIMARY KEY,
                filename TEXT,
                originalName TEXT,
                filesize INTEGER,
                filePath TEXT UNIQUE,
                uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                uploadedBy TEXT
            )
        `);

        // Categories table
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY,
                slug TEXT UNIQUE,
                displayName TEXT,
                coverImage TEXT,
                description TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Projects table
        db.run(`
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
            )
        `);

        // Profile table
        db.run(`
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY,
                photoUrl TEXT,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Initialize default categories
        const categories = [
            { slug: 'animation-shorts', displayName: 'Animation Shorts' },
            { slug: 'real-estate', displayName: 'Real Estate' },
            { slug: 'ai-ads', displayName: 'AI Ads' },
            { slug: 'car-reels', displayName: 'Car Reels' },
            { slug: 'color-grading', displayName: 'Color Grading' },
            { slug: 'long-form', displayName: 'Long-Form' },
            { slug: 'fb', displayName: 'F&B' },
            { slug: 'medical', displayName: 'Insta Reels' },
            { slug: 'retouch', displayName: 'Retouch' }
        ];

        categories.forEach(cat => {
            db.run(
                'INSERT OR IGNORE INTO categories (slug, displayName) VALUES (?, ?)',
                [cat.slug, cat.displayName],
                (err) => {
                    if (err) console.error('Error inserting category:', err);
                }
            );
        });

        // Check if admin exists, if not create default
        db.get('SELECT * FROM admin WHERE email = ?', [process.env.ADMIN_EMAIL], (err, row) => {
            if (!row) {
                db.run('INSERT INTO admin (email, password) VALUES (?, ?)', 
                    [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD],
                    (err) => {
                        if (err) console.error('Error creating admin:', err);
                        else console.log('Admin user created');
                    }
                );
            }
        });
    });
}

/* ===================== HELPER FUNCTIONS ===================== */
function verifyAdmin(email, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM admin WHERE email = ? AND password = ?', 
            [email, password], 
            (err, row) => {
                if (err) reject(err);
                resolve(row ? true : false);
            }
        );
    });
}

function getShowreel() {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM showreels ORDER BY uploadDate DESC LIMIT 1', (err, row) => {
            if (err) reject(err);
            resolve(row || null);
        });
    });
}

/* ===================== API ROUTES ===================== */

// Admin Login
app.post('/api/admin-login', express.json(), async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    try {
        const isValid = await verifyAdmin(email, password);
        if (isValid) {
            res.json({ 
                success: true, 
                message: 'Login successful',
                email: email
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload Showreel
app.post('/api/upload-showreel', upload.single('showreel'), async (req, res) => {
    const { adminEmail } = req.body;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    if (!adminEmail) {
        fs.unlinkSync(req.file.path);
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        // Delete old showreel if exists
        const oldShowreel = await getShowreel();
        if (oldShowreel && fs.existsSync(oldShowreel.filePath)) {
            fs.unlinkSync(oldShowreel.filePath);
        }

        // Delete old database entry
        db.run('DELETE FROM showreels');

        // Insert new showreel
        db.run(
            'INSERT INTO showreels (filename, originalName, filesize, filePath, uploadedBy) VALUES (?, ?, ?, ?, ?)',
            [req.file.filename, req.file.originalname, req.file.size, req.file.path, adminEmail],
            (err) => {
                if (err) {
                    fs.unlinkSync(req.file.path);
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.json({
                    success: true,
                    message: 'Showreel uploaded successfully',
                    file: {
                        filename: req.file.filename,
                        size: req.file.size,
                        sizeInMB: (req.file.size / 1024 / 1024).toFixed(2)
                    }
                });
            }
        );
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Showreel Info
app.get('/api/showreel', async (req, res) => {
    try {
        const showreel = await getShowreel();
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
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Watch Showreel (Stream Video)
app.get('/api/showreel/watch', (req, res) => {
    const quality = req.query.quality || 'auto';
    
    db.get('SELECT * FROM showreels ORDER BY uploadDate DESC LIMIT 1', (err, row) => {
        if (err || !row) {
            return res.status(404).json({ success: false, message: 'No showreel found' });
        }

        let file = row.filePath;
        
        // Quality variants (if they exist)
        if (quality !== 'auto') {
            const dirPath = path.dirname(file);
            const ext = path.extname(file);
            const basename = path.basename(file, ext);
            const qualityFile = path.join(dirPath, `${basename}_${quality}${ext}`);
            
            // Check if quality variant exists, otherwise use original
            if (fs.existsSync(qualityFile)) {
                file = qualityFile;
                console.log(`[Quality] Serving ${quality}: ${qualityFile}`);
            } else {
                console.log(`[Quality] ${quality} not available, serving original`);
            }
        }
        
        // Check if file exists
        if (!fs.existsSync(file)) {
            console.error('File not found:', file);
            return res.status(404).json({ success: false, message: 'File not found on server' });
        }

        try {
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
                    'Content-Length': (end - start + 1),
                    'Content-Type': 'video/mp4'
                });
                fs.createReadStream(file, { start, end }).pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4'
                });
                fs.createReadStream(file).pipe(res);
            }
        } catch (error) {
            console.error('Error streaming video:', error);
            res.status(500).json({ success: false, message: 'Error streaming video: ' + error.message });
        }
    });
});

// Delete Showreel
app.delete('/api/showreel', async (req, res) => {
    const { adminEmail, password } = req.body;

    try {
        const isValid = await verifyAdmin(adminEmail, password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const showreel = await getShowreel();
        if (!showreel) {
            return res.status(404).json({ success: false, message: 'No showreel to delete' });
        }

        if (fs.existsSync(showreel.filePath)) {
            fs.unlinkSync(showreel.filePath);
        }

        db.run('DELETE FROM showreels', (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Showreel deleted successfully' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get Category
app.get('/api/category/:slug', (req, res) => {
    const slug = req.params.slug;

    db.get('SELECT * FROM categories WHERE slug = ?', [slug], (err, category) => {
        if (err || !category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        db.all('SELECT * FROM projects WHERE categoryId = ? ORDER BY createdAt DESC', 
            [category.id], 
            (err, projects) => {
                if (err) {
                    return res.status(500).json({ success: false, message: err.message });
                }

                res.json({
                    success: true,
                    category: {
                        slug: category.slug,
                        displayName: category.displayName,
                        coverImage: category.coverImage
                    },
                    projects: (projects || []).map(p => ({
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        type: p.type,
                        fileUrl: p.fileUrl,
                        thumbnail: p.thumbnailUrl
                    }))
                });
            }
        );
    });
});

// Get Profile
app.get('/api/profile', (req, res) => {
    db.get('SELECT * FROM profile WHERE id = 1', (err, profile) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        res.json({
            success: !!profile && !!profile.photoUrl,
            photoUrl: profile ? profile.photoUrl : null
        });
    });
});

// Upload Profile Photo
const profileUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'uploads', 'profile');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (imageMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

app.post('/api/upload-profile', profileUpload.single('profilePhoto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const imageUrl = `/uploads/profile/${req.file.filename}`;
    
    // Update or insert profile in database
    db.run('INSERT OR REPLACE INTO profile (id, photoUrl, updatedAt) VALUES (1, ?, CURRENT_TIMESTAMP)',
        [imageUrl],
        (err) => {
            if (err) {
                fs.unlinkSync(req.file.path);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                message: 'Profile photo updated successfully',
                imageUrl: imageUrl
            });
        }
    );
});

// Upload Category Cover
const categoryUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, 'covers');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const categorySlug = req.body.categorySlug || 'default';
            cb(null, `${categorySlug}${path.extname(file.originalname)}`);
        }
    }),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (imageMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

app.post('/api/upload-category-cover', categoryUpload.single('coverImage'), (req, res) => {
    const categorySlug = req.body.categorySlug;

    if (!req.file || !categorySlug) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Missing file or category' });
    }

    const coverPath = `/covers/${req.file.filename}`;

    db.run('UPDATE categories SET coverImage = ? WHERE slug = ?',
        [coverPath, categorySlug],
        (err) => {
            if (err) {
                fs.unlinkSync(req.file.path);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                message: 'Category cover updated successfully',
                coverPath: coverPath
            });
        }
    );
});

// Add project (URL-based, Notion-style)
app.post('/api/projects', express.json(), (req, res) => {
    const { categorySlug, type, url, title, description, adminEmail } = req.body;

    if (!categorySlug || !type || !url || !adminEmail) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!['video', 'image'].includes(type)) {
        return res.status(400).json({ success: false, message: 'type must be video or image' });
    }

    db.get('SELECT * FROM categories WHERE slug = ?', [categorySlug], (err, category) => {
        if (err || !category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Extract YouTube thumbnail automatically
        let thumbnailUrl = url;
        if (type === 'video') {
            const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\s?/]+)/);
            if (yt) thumbnailUrl = `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;
        }

        const projectTitle = title || (type === 'video' ? 'Video Project' : 'Image Project');

        db.run(
            'INSERT INTO projects (categoryId, title, description, type, fileUrl, thumbnailUrl) VALUES (?, ?, ?, ?, ?, ?)',
            [category.id, projectTitle, description || '', type, url, thumbnailUrl],
            function(err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({
                    success: true,
                    project: {
                        id: this.lastID,
                        title: projectTitle,
                        description: description || '',
                        type,
                        fileUrl: url,
                        thumbnail: thumbnailUrl
                    }
                });
            }
        );
    });
});

// Delete project
app.delete('/api/projects/:id', express.json(), (req, res) => {
    const { adminEmail } = req.body;
    if (!adminEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });

    db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true });
    });
});

// Static file serving
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/* ===================== ERROR HANDLING ===================== */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File size exceeds 200MB limit' 
            });
        }
    } else if (err) {
        return res.status(500).json({ 
            success: false, 
            message: err.message 
        });
    }
    next();
});

/* ===================== START SERVER ===================== */
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   Shams Portfolio Server Running       ║
    ║   http://localhost:${PORT}              ║
    ║   Database: db.sqlite                  ║
    ║   Uploads: /uploads                    ║
    ╚════════════════════════════════════════╝
    `);
});

process.on('SIGINT', () => {
    console.log('Closing database...');
    db.close();
    process.exit(0);
});
