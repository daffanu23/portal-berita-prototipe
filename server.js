// server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Untuk JWT
const bcrypt = require('bcryptjs'); // Untuk hashing password

const app = express();
const port = 3000;

// Middleware
app.use(express.json()); // Untuk memparsing body request JSON
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], // Izinkan CORS dari frontend Anda (Live Server)
    credentials: true // Penting untuk cookie, meskipun kita akan pakai token JWT untuk user
}));

// Konfigurasi koneksi database PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER || 'daffa',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'portal_berita',
    password: process.env.DB_PASSWORD || 'admin123', // GANTI DENGAN PASSWORD ASLI DAFFA jika berbeda
    port: process.env.DB_PORT || 5432,
});

// Uji koneksi database
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL at:', new Date().toLocaleString());
    release();
});

// Secret Key untuk JWT - HARUS ADA DI FILE .env
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_fallback_please_set_in_env_for_security'; // GANTI INI DENGAN FALLBACK YANG KUAT!
if (process.env.NODE_ENV !== 'production' && !process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET not set in .env. Using fallback. This is not secure for production!');
}

// Middleware untuk memeriksa apakah token valid (digunakan untuk admin dan user)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Unauthorized: Token tidak ada

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.sendStatus(403); // Forbidden: Token tidak valid atau expired
        }
        req.user = user; // Menambahkan payload token ke request (id, username, role)
        next();
    });
};

// --- Rute Admin Login ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin') {
        // HASH ADMIN123 INI HARUS SESUAI DENGAN YANG ANDA GENERATE.
        // Contoh hash untuk 'admin123': '$2a$10$w4r2h.N/Q5L/M1y3u.V5S.p5R.z5X5Y5Z5a5b5c5d5e5f5g5h5i5j5k5l5m5n5o5p5q5r5s5t5u1234567890abcdefghij'
        const correctAdminHash = '$2b$10$rWORt9sd2/UfeSvZScN4Q.FD74Dlq0K462.ZmDgZcJRRH9xNeMzWm'; // <<< GANTI DENGAN HASH ADMIN123 YANG SUDAH ANDA GENERATE

        // Bandingkan password yang dimasukkan dengan hash yang tersimpan
        const isMatch = await bcrypt.compare(password, correctAdminHash);
        if (isMatch) {
            // Buat token JWT untuk admin
            const token = jwt.sign({ id: 'admin-id', username: username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            return res.json({ token });
        }
    }
    res.status(401).json({ message: 'Invalid credentials' });
});


// --- Rute Pendaftaran dan Login Pengguna Akhir ---

// Endpoint Pendaftaran Pengguna Baru (CREATE User)
app.post('/api/users/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'Username, password, dan email wajib diisi.' });
    }

    try {
        // Cek apakah username atau email sudah ada
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Username atau email sudah terdaftar.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan user ke database
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, hashedPassword, email]
        );
        res.status(201).json({ message: 'Pendaftaran berhasil!', user: result.rows[0] });

    } catch (err) {
        console.error('Error during user registration:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint Login Pengguna (Login User)
app.post('/api/users/login', async (req, res) => {
    const { identifier, password } = req.body; // 'identifier' bisa berupa username atau email

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username/Email dan password wajib diisi.' });
    }

    try {
        // Cari user berdasarkan username ATAU email
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [identifier]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Username/Email atau password salah.' });
        }

        // Bandingkan password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Username/Email atau password salah.' });
        }

        // Buat token JWT untuk user
        const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Login berhasil!', token, user: { id: user.id, username: user.username, email: user.email } });

    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk mendapatkan informasi user yang sedang login (membutuhkan token JWT)
app.get('/api/current_user', authenticateToken, (req, res) => {
    // req.user akan terisi dari middleware authenticateToken
    if (req.user && req.user.role === 'user') {
        res.json({
            id: req.user.id,
            username: req.user.username,
            email: req.user.email // Menyertakan email jika ada di payload token
        });
    } else {
        // Ini juga bisa berarti token admin yang dikirim ke endpoint user, atau token tidak valid
        res.status(401).json({ message: 'Unauthorized or not a regular user.' });
    }
});


// --- Rute API Berita (News) ---

// Endpoint untuk Mengambil Semua Berita (READ ALL)
app.get('/api/news', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Mengambil Berita Berdasarkan ID (READ ONE)
app.get('/api/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching news by ID:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Mengambil Berita Berdasarkan Kategori (READ by Category)
app.get('/api/news/category/:categoryName', async (req, res) => {
    const { categoryName } = req.params;
    try {
        const result = await pool.query('SELECT * FROM news WHERE category ILIKE $1 ORDER BY date DESC', [categoryName]); // ILIKE untuk case-insensitive
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching news by category:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// --- Rute Admin (Membutuhkan Autentikasi JWT) ---

// Endpoint untuk Menambahkan Berita Baru (CREATE)
app.post('/api/news', authenticateToken, async (req, res) => {
    // Hanya admin yang bisa menambah berita
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const { title, category, image, content } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ message: 'Judul, kategori, dan konten berita wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO news (title, category, image, content, date) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [title, category, image, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Memperbarui Berita (UPDATE)
app.put('/api/news/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const { id } = req.params;
    const { title, category, image, content } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ message: 'Judul, kategori, dan konten berita wajib diisi.' });
    }
    try {
        const result = await pool.query(
            'UPDATE news SET title = $1, category = $2, image = $3, content = $4 WHERE id = $5 RETURNING *',
            [title, category, image, content, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Menghapus Berita (DELETE)
app.delete('/api/news/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.status(200).json({ message: 'News deleted successfully' });
    } catch (err) {
        console.error('Error deleting news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Mulai server
app.listen(port, () => {
    console.log(`Server backend berjalan di http://localhost:${port}`);
});