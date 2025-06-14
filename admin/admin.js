document.addEventListener('DOMContentLoaded', function() {
    // Elemen-elemen DOM yang akan sering digunakan
    const loginForm = document.getElementById('loginForm');
    const newsForm = document.getElementById('newsForm');
    const newsTableBody = document.querySelector('#newsTable tbody');
    const submitButton = document.getElementById('submitButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const formMessage = document.getElementById('formMessage');
    const newsListMessage = document.getElementById('newsListMessage');
    const logoutButton = document.getElementById('logout-button');
    const errorMessage = document.getElementById('errorMessage'); // Untuk halaman login

    // Ambil elemen kategori dan image yang baru
    const newsCategorySelect = document.getElementById('news-category'); // Ini yang baru
    const newsImageUrlInput = document.getElementById('news-image-url'); // Ini yang baru

    const API_BASE_URL = 'http://localhost:3000/api/news';

    // --- Logika Otentikasi Sederhana ---
    // (Untuk proyek prototipe, kita akan menggunakan token di localStorage)
    const ADMIN_TOKEN_KEY = 'adminToken';
    const MOCK_USERNAME = 'admin';
    const MOCK_PASSWORD = 'password'; // JANGAN GUNAKAN INI DI PRODUKSI!

    // Fungsi untuk memeriksa status login
    function checkLoginStatus() {
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        if (window.location.pathname.includes('dashboard.html')) {
            if (!token) {
                window.location.href = 'index.html'; // Redirect ke halaman login jika belum login
            } else {
                displayNewsList(); // Jika sudah login, tampilkan daftar berita
            }
        } else if (window.location.pathname.includes('index.html')) {
            if (token) {
                window.location.href = 'dashboard.html'; // Redirect ke dashboard jika sudah login
            }
        }
    }

    // Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
                // Simpan token dummy atau status login
                localStorage.setItem(ADMIN_TOKEN_KEY, 'mock-admin-token');
                window.location.href = 'dashboard.html'; // Redirect ke dashboard
            } else {
                errorMessage.textContent = 'Username atau password salah!';
            }
        });
    }

    // Handle Logout Button
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem(ADMIN_TOKEN_KEY); // Hapus token
            window.location.href = 'index.html'; // Redirect ke halaman login
        });
    }

    // Panggil saat halaman dimuat
    checkLoginStatus();

    // --- Logika CRUD Berita ---

    // Fungsi untuk menampilkan daftar berita
    async function displayNewsList() {
        try {
            newsListMessage.textContent = 'Memuat daftar berita...';
            const response = await fetch(API_BASE_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const news = await response.json();

            newsTableBody.innerHTML = ''; // Kosongkan tabel
            if (news.length === 0) {
                newsTableBody.innerHTML = '<tr><td colspan="5">Belum ada berita. Tambahkan yang pertama!</td></tr>';
                newsListMessage.textContent = ''; // Hapus pesan loading
                return;
            }

            // Urutkan dari yang terbaru
            news.sort((a, b) => new Date(b.date) - new Date(a.date));

            news.forEach(item => {
                const row = newsTableBody.insertRow();
                row.insertCell(0).textContent = item.id;
                row.insertCell(1).textContent = item.title;
                row.insertCell(2).textContent = item.category;
                row.insertCell(3).textContent = new Date(item.date).toLocaleDateString('id-ID');

                const actionsCell = row.insertCell(4);
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.classList.add('edit-button');
                editButton.style.marginRight = '5px';
                editButton.onclick = () => editNews(item);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Hapus';
                deleteButton.classList.add('delete-button');
                deleteButton.style.backgroundColor = '#DC3545'; // Warna merah
                deleteButton.style.marginLeft = '5px';
                deleteButton.onclick = () => deleteNews(item.id);

                actionsCell.appendChild(editButton);
                actionsCell.appendChild(deleteButton);
            });
            newsListMessage.textContent = ''; // Hapus pesan loading
        } catch (error) {
            console.error('Error fetching news list:', error);
            newsListMessage.textContent = `Gagal memuat daftar berita: ${error.message}`;
        }
    }

    // Handle Form Submission (Tambah/Edit Berita)
    if (newsForm) { // Pastikan elemen form ada sebelum menambahkan event listener
        newsForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const newsId = document.getElementById('newsId').value;
            const title = document.getElementById('title').value;
            const category = newsCategorySelect.value; // Ambil nilai dari SELECT baru
            const image = newsImageUrlInput.value; // Ambil nilai dari INPUT URL baru
            const content = document.getElementById('content').value;
            let date = document.getElementById('date').value;

            // Jika tanggal kosong, set ke tanggal saat ini
            if (!date) {
                date = new Date().toISOString();
            } else {
                // Pastikan format tanggal sesuai ISO 8601 untuk PostgreSQL TIMESTAMP WITH TIME ZONE
                date = new Date(date).toISOString();
            }

            const newsData = { title, category, image, content, date };

            try {
                let response;
                if (newsId) { // Jika ada newsId, berarti ini operasi EDIT (PUT)
                    submitButton.textContent = 'Memperbarui...';
                    response = await fetch(`${API_BASE_URL}/${newsId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newsData),
                    });
                } else { // Jika tidak ada newsId, berarti ini operasi TAMBAH (POST)
                    submitButton.textContent = 'Menambahkan...';
                    response = await fetch(API_BASE_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newsData),
                    });
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
                }

                formMessage.textContent = newsId ? 'Berita berhasil diperbarui!' : 'Berita berhasil ditambahkan!';
                formMessage.style.color = 'green';
                newsForm.reset(); // Kosongkan form
                document.getElementById('newsId').value = ''; // Reset ID tersembunyi
                submitButton.textContent = 'Tambah Berita'; // Kembalikan teks tombol
                cancelEditButton.style.display = 'none'; // Sembunyikan tombol batal
                displayNewsList(); // Muat ulang daftar berita
            } catch (error) {
                console.error('Error submitting news:', error);
                formMessage.textContent = `Gagal ${newsId ? 'memperbarui' : 'menambahkan'} berita: ${error.message}`;
                formMessage.style.color = 'red';
                submitButton.textContent = newsId ? 'Perbarui Berita' : 'Tambah Berita'; // Kembalikan teks tombol
            }
        });
    }

    // Fungsi untuk mengisi form saat tombol edit diklik
    function editNews(item) {
        document.getElementById('newsId').value = item.id;
        document.getElementById('title').value = item.title;
        newsCategorySelect.value = item.category; // Set nilai SELECT
        newsImageUrlInput.value = item.image || ''; // Set nilai INPUT URL, handle null
        document.getElementById('content').value = item.content;
        // Format tanggal untuk input datetime-local (YYYY-MM-DDTHH:MM)
        const date = new Date(item.date);
        const formattedDate = date.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
        document.getElementById('date').value = formattedDate;

        submitButton.textContent = 'Perbarui Berita';
        cancelEditButton.style.display = 'inline-block'; // Tampilkan tombol batal
        formMessage.textContent = ''; // Hapus pesan form sebelumnya

        // Gulir ke atas form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Handle Cancel Edit Button
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', () => {
            newsForm.reset();
            document.getElementById('newsId').value = '';
            submitButton.textContent = 'Tambah Berita';
            cancelEditButton.style.display = 'none';
            formMessage.textContent = '';
        });
    }


    // Fungsi untuk menghapus berita
    async function deleteNews(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus berita ini?')) {
            return;
        }

        try {
            newsListMessage.textContent = 'Menghapus berita...';
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
            newsListMessage.textContent = 'Berita berhasil dihapus!';
            newsListMessage.style.color = 'green';
            displayNewsList(); // Muat ulang daftar berita
        } catch (error) {
            console.error('Error deleting news:', error);
            newsListMessage.textContent = `Gagal menghapus berita: ${error.message}`;
            newsListMessage.style.color = 'red';
        }
    }
});