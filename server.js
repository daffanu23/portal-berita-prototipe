// server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const { Pool } = require('pg'); // Menggunakan PostgreSQL
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
    release(); // Lepaskan client kembali ke pool
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

// Middleware untuk otorisasi (hanya admin)
const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak: Hanya admin yang diizinkan.' });
    }
};

// --- Rute Admin Login ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    // Hash admin password yang sudah ada di kode Anda
    const correctAdminHash = '$2b$10$rWORt9sd2/UfeSvZScN4Q.FD74Dlq0K462.ZmDgZcJRRH9xNeMzWm'; // Hash untuk 'admin123'

    if (username === 'admin') {
        try {
            const isMatch = await bcrypt.compare(password, correctAdminHash);
            if (isMatch) {
                const token = jwt.sign({ id: 'admin-id', username: username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
                return res.json({ token, role: 'admin' }); // Sertakan role
            }
        } catch (error) {
            console.error('Error during admin bcrypt compare:', error);
            return res.status(500).json({ message: 'Internal server error during authentication.' });
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
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Username atau email sudah terdaftar.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password_hash, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, hashedPassword, email, 'user'] // Tambahkan role 'user' secara default
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
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [identifier]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Username/Email atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Username/Email atau password salah.' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Login berhasil!', token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });

    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk mendapatkan informasi user yang sedang login (membutuhkan token JWT)
app.get('/api/current_user', authenticateToken, (req, res) => {
    // req.user sudah berisi id, username, dan role dari payload JWT
    // Anda bisa menambahkan email ke payload JWT saat login jika ingin selalu tersedia
    res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        // email: req.user.email // Tambahkan ini jika email dimasukkan ke dalam token saat login
    });
});

// --- NEW ROUTES FOR CATEGORIES ---

// Endpoint untuk mendapatkan semua kategori
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk menambahkan kategori baru (ADMIN ONLY)
app.post('/api/categories', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama kategori wajib diisi.' });
    }
    try {
        const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL unique violation error code
            return res.status(409).json({ message: 'Kategori dengan nama ini sudah ada.' });
        }
        console.error('Error adding category:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk memperbarui kategori (ADMIN ONLY)
app.put('/api/categories/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Nama kategori wajib diisi.' });
    }
    try {
        const result = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL unique violation error code
            return res.status(409).json({ message: 'Kategori dengan nama ini sudah ada.' });
        }
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk menghapus kategori (ADMIN ONLY)
app.delete('/api/categories/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Kategori berhasil dihapus.' });
    } catch (err) {
        if (err.code === '23503') { // PostgreSQL foreign key violation error code
            return res.status(409).json({ message: 'Tidak dapat menghapus kategori karena masih digunakan oleh berita. Harap perbarui berita yang terkait terlebih dahulu.' });
        }
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// --- UPDATED ROUTES FOR NEWS ---

// Endpoint untuk Mengambil Semua Berita atau Berita Berdasarkan Kategori (FILTER BY category_id)
app.get('/api/news', async (req, res) => {
    const categoryId = req.query.category_id; // Ambil category_id dari query parameter

    let sql = `
        SELECT n.id, n.title, n.content, n.image, n.date,
               c.id AS category_id, c.name AS category_name
        FROM news n
        LEFT JOIN categories c ON n.category_id = c.id
    `;
    const params = [];

    if (categoryId && categoryId !== '') { // Jika categoryId diberikan dan tidak kosong
        sql += ` WHERE n.category_id = $1`;
        params.push(categoryId);
    }

    sql += ` ORDER BY n.date DESC`; // Urutkan dari terbaru

    try {
        const result = await pool.query(sql, params);
        res.json(result.rows); // Mengembalikan baris seperti adanya, karena category_id dan category_name sudah ada
    } catch (err) {
        console.error('Error fetching news with categories:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Mengambil Berita Berdasarkan ID (READ ONE) - Menggunakan JOIN ke categories
app.get('/api/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT n.id, n.title, n.content, n.image, n.date,
                   c.id AS category_id, c.name AS category_name
            FROM news n
            LEFT JOIN categories c ON n.category_id = c.id
            WHERE n.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'News not found' });
        }
        res.json(result.rows[0]); // Mengembalikan objek berita langsung
    } catch (err) {
        console.error('Error fetching news by ID with categories:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Menambahkan Berita Baru (CREATE) - Sekarang menerima category_id
app.post('/api/news', authenticateToken, authorizeAdmin, async (req, res) => {
    const { title, category_id, image, content } = req.body; // Mengambil category_id
    if (!title || !category_id || !content) {
        return res.status(400).json({ message: 'Judul, ID kategori, dan konten berita wajib diisi.' });
    }
    try {
        // Pastikan category_id valid
        const categoryExists = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
        if (categoryExists.rows.length === 0) {
            return res.status(400).json({ message: 'ID Kategori tidak valid.' });
        }

        const result = await pool.query(
            'INSERT INTO news (title, category_id, image, content, date) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [title, category_id, image, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Memperbarui Berita (UPDATE) - Sekarang menerima category_id
app.put('/api/news/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, category_id, image, content } = req.body; // Mengambil category_id
    if (!title || !category_id || !content) {
        return res.status(400).json({ message: 'Judul, ID kategori, dan konten berita wajib diisi.' });
    }
    try {
        // Pastikan category_id valid
        const categoryExists = await pool.query('SELECT id FROM categories WHERE id = $1', [category_id]);
        if (categoryExists.rows.length === 0) {
            return res.status(400).json({ message: 'ID Kategori tidak valid.' });
        }

        const result = await pool.query(
            'UPDATE news SET title = $1, category_id = $2, image = $3, content = $4 WHERE id = $5 RETURNING *',
            [title, category_id, image, content, id]
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
app.delete('/api/news/:id', authenticateToken, authorizeAdmin, async (req, res) => {
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