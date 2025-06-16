// admin.js
document.addEventListener('DOMContentLoaded', function() {
    // --- Elemen Umum dan Inisialisasi ---
    const adminToken = localStorage.getItem('adminToken');
    const adminWelcomeMessage = document.getElementById('admin-welcome-message'); // Ini tidak ada di dashboard.html, bisa diabaikan atau ditambahkan di HTML
    const logoutButton = document.getElementById('logout-button');

    // Pastikan user sudah login sebagai admin sebelum mengakses dashboard ini
    if (!adminToken) {
        window.location.href = 'admin.html'; // Arahkan kembali ke halaman login admin Anda
        return;
    }

    // Tampilkan pesan selamat datang (Jika elemen ada)
    // if (adminWelcomeMessage) {
    //     adminWelcomeMessage.textContent = 'Selamat datang, Admin!';
    // }


    // --- Elemen UI Manajemen Berita ---
    const newsManagementSection = document.getElementById('news-management-section');
    const newsListSection = document.getElementById('news-list-section'); // Bagian daftar berita Anda
    const newsForm = document.getElementById('news-form');
    const newsIdInput = document.getElementById('news-id');
    const titleInput = document.getElementById('title');
    const categorySelect = document.getElementById('news-category'); // Ini adalah SELECT
    const imageInput = document.getElementById('news-image-url');
    const contentInput = document.getElementById('content');
    const submitButton = document.getElementById('submit-button');
    const clearFormButton = document.getElementById('clear-form-button');
    const newsFormMessage = document.getElementById('news-form-message'); // Pesan untuk form berita
    const newsList = document.getElementById('news-list');

    let editingNewsId = null; // Menyimpan ID berita yang sedang diedit

    // --- Elemen UI Manajemen Kategori ---
    const categoryManagementSection = document.getElementById('category-management-section');
    const categoryForm = document.getElementById('category-form');
    const categoryIdInput = document.getElementById('category-id'); // Hidden input untuk ID kategori
    const categoryNameInput = document.getElementById('category-name');
    const submitCategoryButton = document.getElementById('submit-category-button');
    const clearCategoryFormButton = document.getElementById('clear-category-form-button');
    const categoryFormMessage = document.getElementById('category-form-message'); // Pesan untuk form kategori
    const categoryList = document.getElementById('category-list');

    let editingCategoryId = null; // Menyimpan ID kategori yang sedang diedit


    // --- Elemen Navigasi Dashboard ---
    const showNewsBtn = document.getElementById('show-news-btn');
    const showCategoriesBtn = document.getElementById('show-categories-btn');


    // --- Fungsi Umum ---

    // Fungsi untuk menampilkan pesan (sukses/error) pada form berita
    function showNewsMessage(message, isError = false) {
        newsFormMessage.textContent = message;
        newsFormMessage.className = isError ? 'message error-message' : 'message success-message';
        setTimeout(() => {
            newsFormMessage.textContent = '';
            newsFormMessage.className = 'message'; // Reset class
        }, 3000);
    }

    // Fungsi untuk menampilkan pesan (sukses/error) pada form kategori
    function showCategoryMessage(message, isError = false) {
        categoryFormMessage.textContent = message;
        categoryFormMessage.className = isError ? 'message error-message' : 'message success-message';
        setTimeout(() => {
            categoryFormMessage.textContent = '';
            categoryFormMessage.className = 'message'; // Reset class
        }, 3000);
    }

    // Fungsi untuk membersihkan form berita
    function clearNewsForm() {
        newsIdInput.value = '';
        titleInput.value = '';
        categorySelect.value = ''; // Reset select dropdown
        imageInput.value = '';
        contentInput.value = '';
        submitButton.textContent = 'Tambah Berita';
        editingNewsId = null;
        showNewsMessage(''); // Bersihkan pesan
    }

    // Fungsi untuk membersihkan form kategori
    function clearCategoryForm() {
        categoryIdInput.value = '';
        categoryNameInput.value = '';
        submitCategoryButton.textContent = 'Tambah Kategori';
        editingCategoryId = null;
        showCategoryMessage(''); // Bersihkan pesan
    }

    // Fungsi untuk menampilkan section yang dipilih
    function showSection(sectionId) {
        // Sembunyikan semua section yang relevan
        newsManagementSection.classList.remove('active');
        newsListSection.classList.remove('active');
        categoryManagementSection.classList.remove('active');

        // Tampilkan section yang diminta
        if (sectionId === 'news') {
            newsManagementSection.classList.add('active');
            newsListSection.classList.add('active');
            // Atur tombol navigasi aktif
            showNewsBtn.classList.add('active-tab');
            showCategoriesBtn.classList.remove('active-tab');
        } else if (sectionId === 'categories') {
            categoryManagementSection.classList.add('active');
            // Atur tombol navigasi aktif
            showCategoriesBtn.classList.add('active-tab');
            showNewsBtn.classList.remove('active-tab');
        }
    }


    // --- Logika Manajemen Kategori (NEW) ---

    // Fungsi untuk memuat daftar kategori
    async function loadCategories() {
        categoryList.innerHTML = '<p>Memuat daftar kategori...</p>';
        try {
            const response = await fetch('http://localhost:3000/api/categories', {
                headers: {
                    // Endpoint GET /api/categories tidak memerlukan token,
                    // tapi tidak ada salahnya jika dikirim.
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            if (!response.ok) {
                // Untuk GET kategori, kita tidak perlu redirect jika gagal autentikasi,
                // karena ini route publik (walaupun di dashboard admin)
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categoriesData = await response.json();

            if (categoriesData.length === 0) {
                categoryList.innerHTML = '<p>Belum ada kategori yang ditambahkan.</p>';
                return;
            }

            categoryList.innerHTML = '';
            categoriesData.forEach(categoryItem => {
                const listItem = document.createElement('li');
                listItem.className = 'item-list-item'; // Menggunakan class umum
                listItem.innerHTML = `
                    <span>${categoryItem.name}</span>
                    <div class="actions">
                        <button class="edit-btn" data-id="${categoryItem.id}" data-name="${categoryItem.name}">Edit</button>
                        <button class="delete-btn" data-id="${categoryItem.id}">Hapus</button>
                    </div>
                `;
                categoryList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading categories:', error);
            categoryList.innerHTML = '<p class="error-message">Gagal memuat daftar kategori.</p>';
            showCategoryMessage('Gagal memuat daftar kategori.', true);
        }
    }

    // Fungsi untuk mengisi dropdown kategori di form berita
    async function populateCategoryDropdown() {
        categorySelect.innerHTML = '<option value="">-- Pilih Kategori --</option>'; // Reset dropdown
        try {
            const response = await fetch('http://localhost:3000/api/categories');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categoriesData = await response.json();
            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating category dropdown:', error);
            showNewsMessage('Gagal memuat daftar kategori untuk berita. Refresh halaman.', true);
        }
    }

    // Event Listener untuk submit form kategori (Tambah/Edit Kategori)
    categoryForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const categoryName = categoryNameInput.value.trim();
        if (!categoryName) {
            showCategoryMessage('Nama kategori tidak boleh kosong.', true);
            return;
        }

        const categoryData = { name: categoryName };
        let url = 'http://localhost:3000/api/categories';
        let method = 'POST';

        if (editingCategoryId) {
            url = `http://localhost:3000/api/categories/${editingCategoryId}`;
            method = 'PUT';
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(categoryData)
            });

            const data = await response.json();

            if (response.ok) {
                showCategoryMessage(editingCategoryId ? 'Kategori berhasil diupdate!' : 'Kategori berhasil ditambahkan!');
                clearCategoryForm();
                loadCategories(); // Muat ulang daftar kategori
                populateCategoryDropdown(); // Perbarui dropdown berita
            } else {
                showCategoryMessage(data.message || 'Gagal menyimpan kategori.', true);
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showCategoryMessage('Terjadi kesalahan saat menyimpan kategori.', true);
        }
    });

    // Event Listener untuk tombol Edit dan Hapus kategori
    categoryList.addEventListener('click', async function(event) {
        const target = event.target;
        const categoryId = target.dataset.id;
        const categoryName = target.dataset.name;

        if (target.classList.contains('edit-btn')) {
            // Logika Edit Kategori
            categoryIdInput.value = categoryId;
            categoryNameInput.value = categoryName;
            submitCategoryButton.textContent = 'Update Kategori';
            editingCategoryId = categoryId;
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Gulir ke atas form
        } else if (target.classList.contains('delete-btn')) {
            // Logika Hapus Kategori
            if (confirm('Anda yakin ingin menghapus kategori ini? Berita yang terkait mungkin tidak bisa tampil tanpa kategori!')) {
                try {
                    const response = await fetch(`http://localhost:3000/api/categories/${categoryId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${adminToken}`
                        }
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showCategoryMessage(data.message || 'Kategori berhasil dihapus!');
                        loadCategories();
                        populateCategoryDropdown(); // Perbarui dropdown berita
                    } else {
                        showCategoryMessage(data.message || 'Gagal menghapus kategori.', true);
                    }
                } catch (error) {
                    console.error('Error deleting category:', error);
                    showCategoryMessage('Terjadi kesalahan saat menghapus kategori.', true);
                }
            }
        }
    });

    // Event Listener untuk tombol Clear Category Form
    clearCategoryFormButton.addEventListener('click', clearCategoryForm);


    // --- Logika Manajemen Berita (UPDATED) ---

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
                    window.location.href = 'admin.html'; // Arahkan kembali ke login admin
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
                listItem.className = 'item-list-item'; // Menggunakan class umum
                listItem.innerHTML = `
                    <span>${newsItem.title} (${newsItem.category_name || newsItem.category})</span> <div class="actions">
                        <button class="edit-btn" data-id="${newsItem.id}">Edit</button>
                        <button class="delete-btn" data-id="${newsItem.id}">Hapus</button>
                    </div>
                `;
                newsList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading news:', error);
            newsList.innerHTML = '<p class="error-message">Gagal memuat daftar berita.</p>';
            showNewsMessage('Gagal memuat daftar berita.', true);
        }
    }

    // Event Listener untuk submit form berita (Tambah/Edit Berita)
    newsForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const news = {
            title: titleInput.value,
            category_id: categorySelect.value, // **PENTING: Sekarang kirim category_id, bukan nama**
            image: imageInput.value,
            content: contentInput.value
        };

        // Validasi sederhana untuk category_id (pastikan bukan opsi default kosong)
        if (!news.category_id) {
            showNewsMessage('Kategori harus dipilih.', true);
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
                showNewsMessage('Berita berhasil diupdate!');
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
                showNewsMessage('Berita berhasil ditambahkan!');
            }
            
            clearNewsForm(); // Bersihkan form setelah sukses
            loadNews(); // Muat ulang daftar berita
        } catch (error) {
            console.error('Error saving news:', error);
            showNewsMessage('Gagal menyimpan berita. ' + error.message, true);
        }
    });

    // Event Listener untuk tombol Edit dan Hapus berita
    newsList.addEventListener('click', async function(event) {
        const target = event.target;
        const newsId = target.dataset.id; // Ambil ID dari atribut data-id

        if (target.classList.contains('edit-btn')) {
            // Logika Edit Berita
            try {
                const response = await fetch(`http://localhost:3000/api/news/${newsId}`, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const newsToEdit = await response.json();
                
                // Isi form dengan data berita yang akan diedit
                newsIdInput.value = newsToEdit.id;
                titleInput.value = newsToEdit.title;
                categorySelect.value = newsToEdit.category_id; // **PENTING: Isi dropdown dengan category_id**
                imageInput.value = newsToEdit.image || ''; // Pastikan string kosong jika null
                contentInput.value = newsToEdit.content;
                submitButton.textContent = 'Update Berita';
                editingNewsId = newsToEdit.id; // Set ID berita yang sedang diedit
                
                // Gulir ke bagian atas form
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (error) {
                console.error('Error fetching news for edit:', error);
                showNewsMessage('Gagal memuat data berita untuk diedit.', true);
            }
        } else if (target.classList.contains('delete-btn')) {
            // Logika Hapus Berita
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
                    showNewsMessage('Berita berhasil dihapus!');
                    loadNews(); // Muat ulang daftar berita
                } catch (error) {
                    console.error('Error deleting news:', error);
                    showNewsMessage('Gagal menghapus berita. ' + error.message, true);
                }
            }
        }
    });

    // Event Listener untuk tombol Clear Form Berita
    clearFormButton.addEventListener('click', clearNewsForm);

    // --- Event Listener Global ---

    // Event Listener untuk tombol Logout
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('adminToken'); // Hapus token
        window.location.href = 'admin.html'; // Arahkan kembali ke halaman login admin Anda
    });

    // Event Listener untuk navigasi menu dashboard
    showNewsBtn.addEventListener('click', () => showSection('news'));
    showCategoriesBtn.addEventListener('click', () => showSection('categories'));


    // --- Inisialisasi Saat Halaman Dimuat ---
    showSection('news'); // Tampilkan section berita secara default
    populateCategoryDropdown(); // Isi dropdown kategori di form berita
    loadNews(); // Muat daftar berita
    loadCategories(); // Muat daftar kategori
});