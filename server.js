const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Import jsonwebtoken

const app = express();
const port = 3000;

// Middleware
app.use(express.json()); // Untuk memparsing body request JSON
app.use(cors()); // Mengizinkan semua origin untuk akses (untuk development)

// Konfigurasi koneksi database PostgreSQL
const pool = new Pool({
    user: 'daffa',          // Pastikan ini 'daffa'
    host: 'localhost',
    database: 'portal_berita', // Pastikan ini 'portal_berita'
    password: 'admin123', // GANTI DENGAN PASSWORD ASLI USER DAFFA
    port: 5432,
});

// SECRET KEY untuk JWT (Ganti dengan string yang lebih kompleks di produksi!)
const JWT_SECRET = '3fc5ac86ee413f6c04815760a945d16e59959050e8989cd14cc61aaafe9750ee0cecde4adec65f714802ea1dd92599c43a387dba79f82717d4d8a0bf45789dd3'; // GANTI DENGAN STRING ACAK DAN KUAT

// Middleware autentikasi
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Ambil token dari header 'Bearer TOKEN'

    if (token == null) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token tidak valid atau kadaluarsa
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user; // Simpan data user dari token di request
        next(); // Lanjutkan ke rute berikutnya
    });
}

// Uji koneksi database (opsional tapi disarankan)
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL at:', new Date().toISOString());
    client.release();
});

// Endpoint untuk Login Admin
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // TODO: Di aplikasi nyata, Anda akan memvalidasi username dan password dari database
    // Untuk saat ini, kita gunakan kredensial hardcoded sederhana
    if (username === 'admin' && password === 'admin123') { // GANTI DENGAN KREDENSIAL ASLI
        // Jika kredensial valid, buat token JWT
        const user = { username: 'admin', role: 'admin' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' }); // Token berlaku 1 jam
        res.json({ message: 'Login successful', token: token });
    } else {
        res.status(401).json({ error: 'Invalid username or password.' });
    }
});


// Endpoint untuk Mengambil Semua Berita (READ - bisa diakses tanpa autentikasi)
app.get('/api/news', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Endpoint untuk Mengambil Berita Berdasarkan ID (READ - bisa diakses tanpa autentikasi)
app.get('/api/news/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching news by ID:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// --- Rute Admin (Membutuhkan Autentikasi) ---
// Gunakan middleware authenticateToken untuk melindungi rute di bawah ini
app.post('/api/news', authenticateToken, async (req, res) => {
    const { title, category, image, content } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ error: 'Title, category, and content are required.' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO news (title, category, image, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, category, image || null, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.put('/api/news/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, category, image, content } = req.body;
    if (!title || !category || !content) {
        return res.status(400).json({ error: 'Title, category, and content are required.' });
    }
    try {
        const result = await pool.query(
            'UPDATE news SET title = $1, category = $2, image = $3, content = $4, date = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
            [title, category, image || null, content, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.delete('/api/news/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.status(200).json({ message: 'News deleted successfully.', id: result.rows[0].id });
    } catch (err) {
        console.error('Error deleting news:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server backend berjalan di http://localhost:${port}`);
});