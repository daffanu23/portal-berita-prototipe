const express = require('express');
const { Pool } = require('pg');
const cors = require('cors'); // Untuk mengatasi CORS
const app = express();
const port = 3000; // Port untuk backend kita

// Middleware
app.use(express.json()); // Untuk memparsing body request JSON
app.use(cors()); // Mengizinkan semua origin untuk akses (untuk development)

// Konfigurasi koneksi database PostgreSQL
const pool = new Pool({
    user: 'user_berita', // Sesuaikan dengan POSTGRES_USER di docker-compose.yml
    host: 'localhost',   // Host adalah 'localhost' karena kita akan mengakses dari host (komputer Anda) ke Docker
    database: 'portal_berita', // Sesuaikan dengan POSTGRES_DB di docker-compose.yml
    password: 'admin123', // Sesuaikan dengan POSTGRES_PASSWORD di docker-compose.yml
    port: 5432, // Port PostgreSQL yang di-expose di docker-compose.yml
});

// Uji koneksi database (opsional tapi disarankan)
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('Connected to PostgreSQL at:', result.rows[0].now);
    });
});

// --- Definisi API Endpoints ---

// 1. Endpoint untuk mendapatkan semua berita
app.get('/api/news', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY date DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching news:', err);
        res.status(500).send('Server Error');
    }
});

// 2. Endpoint untuk mendapatkan detail berita berdasarkan ID
app.get('/api/news/:id', async (req, res) => {
    const newsId = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM news WHERE id = $1', [newsId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Berita tidak ditemukan');
        }
    } catch (err) {
        console.error('Error fetching news by ID:', err);
        res.status(500).send('Server Error');
    }
});

// 3. Endpoint untuk menambahkan berita baru (Admin - Nanti akan kita proteksi)
app.post('/api/news', async (req, res) => {
    const { title, category, image, content, date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO news (title, category, image, content, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, category, image, content, date || new Date().toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding news:', err);
        res.status(500).send('Server Error');
    }
});

// 4. Endpoint untuk memperbarui berita (Admin - Nanti akan kita proteksi)
app.put('/api/news/:id', async (req, res) => {
    const newsId = parseInt(req.params.id);
    const { title, category, image, content, date } = req.body;
    try {
        const result = await pool.query(
            'UPDATE news SET title = $1, category = $2, image = $3, content = $4, date = $5 WHERE id = $6 RETURNING *',
            [title, category, image, content, date || new Date().toISOString(), newsId]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('Berita tidak ditemukan');
        }
    } catch (err) {
        console.error('Error updating news:', err);
        res.status(500).send('Server Error');
    }
});

// 5. Endpoint untuk menghapus berita (Admin - Nanti akan kita proteksi)
app.delete('/api/news/:id', async (req, res) => {
    const newsId = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [newsId]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: 'Berita berhasil dihapus', id: result.rows[0].id });
        } else {
            res.status(404).send('Berita tidak ditemukan');
        }
    } catch (err) {
        console.error('Error deleting news:', err);
        res.status(500).send('Server Error');
    }
});

// Jalankan server Express
app.listen(port, () => {
    console.log(`Server backend berjalan di http://localhost:${port}`);
});