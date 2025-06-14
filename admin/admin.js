document.addEventListener('DOMContentLoaded', function() {
    // Fungsi untuk memastikan user sudah login sebelum mengakses dashboard
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        // Jika tidak ada token, arahkan kembali ke halaman login
        window.location.href = 'index.html';
        return; // Hentikan eksekusi script ini
    }

    const newsForm = document.getElementById('news-form');
    const newsIdInput = document.getElementById('news-id');
    const titleInput = document.getElementById('title');
    const categorySelect = document.getElementById('news-category'); // SESUAIKAN ID INI (select)
    const imageInput = document.getElementById('news-image-url'); // SESUAIKAN ID INI (input text)
    const contentInput = document.getElementById('content');
    const submitButton = document.getElementById('submit-button');
    const clearFormButton = document.getElementById('clear-form-button');
    const formMessage = document.getElementById('form-message');
    const newsList = document.getElementById('news-list');
    const logoutButton = document.getElementById('logout-button');

    let editingNewsId = null; // Menyimpan ID berita yang sedang diedit

    // Fungsi untuk menampilkan pesan (sukses/error)
    function showMessage(message, isError = false) {
        formMessage.textContent = message;
        formMessage.style.color = isError ? 'red' : 'green';
        setTimeout(() => {
            formMessage.textContent = '';
        }, 3000);
    }

    // Fungsi untuk membersihkan form
    function clearForm() {
        newsIdInput.value = '';
        titleInput.value = '';
        categorySelect.value = ''; // Reset select dropdown
        imageInput.value = '';
        contentInput.value = '';
        submitButton.textContent = 'Tambah Berita';
        editingNewsId = null;
    }

    // Fungsi untuk memuat daftar berita
    async function loadNews() {
        newsList.innerHTML = '<p>Memuat daftar berita...</p>';
        try {
            const response = await fetch('http://localhost:3000/api/news', {
                headers: {
                    'Authorization': `Bearer ${adminToken}` // Kirim token untuk autentikasi GET
                }
            });
            if (!response.ok) {
                 if (response.status === 401 || response.status === 403) {
                    // Jika token tidak valid, paksa logout
                    localStorage.removeItem('adminToken');
                    window.location.href = 'index.html';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const newsData = await response.json();

            if (newsData.length === 0) {
                newsList.innerHTML = '<p>Belum ada berita yang dipublikasikan.</p>';
                return;
            }

            newsList.innerHTML = '';
            newsData.sort((a, b) => new Date(b.date) - new Date(a.date)); // Urutkan dari terbaru
            newsData.forEach(newsItem => {
                const listItem = document.createElement('li');
                listItem.className = 'news-list-item';
                listItem.innerHTML = `
                    <span>${newsItem.title} (${newsItem.category})</span>
                    <div class="news-actions">
                        <button class="edit-btn" data-id="${newsItem.id}">Edit</button>
                        <button class="delete-btn" data-id="${newsItem.id}">Hapus</button>
                    </div>
                `;
                newsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading news:', error);
            newsList.innerHTML = '<p>Gagal memuat daftar berita.</p>';
            showMessage('Gagal memuat daftar berita.', true);
        }
    }

    // Event Listener untuk submit form (Tambah/Edit Berita)
    newsForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Mencegah reload halaman

        const news = {
            title: titleInput.value,
            category: categorySelect.value, // Ambil nilai dari select
            image: imageInput.value,
            content: contentInput.value
        };

        // Validasi sederhana untuk kategori (pastikan bukan opsi default kosong)
        if (!news.category) {
            showMessage('Kategori harus dipilih.', true);
            return;
        }

        try {
            let response;
            const headers = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}` // Kirim token untuk autentikasi
            };

            if (editingNewsId) {
                // Mode Edit (PUT)
                response = await fetch(`http://localhost:3000/api/news/${editingNewsId}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(news)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                showMessage('Berita berhasil diupdate!');
            } else {
                // Mode Tambah (POST)
                response = await fetch('http://localhost:3000/api/news', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(news)
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                showMessage('Berita berhasil ditambahkan!');
            }
            
            clearForm(); // Bersihkan form setelah sukses
            loadNews(); // Muat ulang daftar berita
        } catch (error) {
            console.error('Error saving news:', error);
            showMessage('Gagal menyimpan berita. ' + error.message, true);
        }
    });

    // Event Listener untuk tombol Edit dan Hapus
    newsList.addEventListener('click', async function(event) {
        const target = event.target;
        const newsId = target.dataset.id; // Ambil ID dari atribut data-id

        if (target.classList.contains('edit-btn')) {
            // Logika Edit
            try {
                const response = await fetch(`http://localhost:3000/api/news/${newsId}`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}` // Kirim token untuk autentikasi GET
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const newsToEdit = await response.json();
                
                // Isi form dengan data berita yang akan diedit
                newsIdInput.value = newsToEdit.id;
                titleInput.value = newsToEdit.title;
                categorySelect.value = newsToEdit.category; // Isi select
                imageInput.value = newsToEdit.image || ''; // Pastikan string kosong jika null
                contentInput.value = newsToEdit.content;
                submitButton.textContent = 'Update Berita';
                editingNewsId = newsToEdit.id; // Set ID berita yang sedang diedit
                
                // Gulir ke bagian atas form
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {
                console.error('Error fetching news for edit:', error);
                showMessage('Gagal memuat data berita untuk diedit.', true);
            }
        } else if (target.classList.contains('delete-btn')) {
            // Logika Hapus
            if (confirm('Anda yakin ingin menghapus berita ini?')) {
                try {
                    const response = await fetch(`http://localhost:3000/api/news/${newsId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${adminToken}` // Kirim token untuk autentikasi DELETE
                        }
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    showMessage('Berita berhasil dihapus!');
                    loadNews(); // Muat ulang daftar berita
                } catch (error) {
                    console.error('Error deleting news:', error);
                    showMessage('Gagal menghapus berita. ' + error.message, true);
                }
            }
        }
    });

    // Event Listener untuk tombol Clear Form
    clearFormButton.addEventListener('click', clearForm);

    // Event Listener untuk tombol Logout
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('adminToken'); // Hapus token
        window.location.href = 'index.html'; // Arahkan kembali ke halaman login
    });

    // Muat berita saat halaman pertama kali dimuat
    loadNews();
});