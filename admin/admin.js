document.addEventListener('DOMContentLoaded', function() {
    // Cek di halaman mana script ini dijalankan
    const isLoginPage = document.getElementById('login-form');
    const isDashboardPage = document.getElementById('add-news-form');

    // --- LOGIKA UNTUK HALAMAN LOGIN ---
    if (isLoginPage) {
        const loginForm = document.getElementById('login-form');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const errorMessage = document.getElementById('login-error');

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Untuk prototipe, kita gunakan username & password sederhana
            const DUMMY_USER = 'admin';
            const DUMMY_PASS = 'admin123';

            if (usernameInput.value === DUMMY_USER && passwordInput.value === DUMMY_PASS) {
                // Jika berhasil, simpan status login di sessionStorage
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                // Arahkan ke dashboard
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.textContent = 'Username atau password salah!';
            }
        });
    }

    // --- LOGIKA UNTUK HALAMAN DASHBOARD ---
    if (isDashboardPage) {
        // Cek apakah admin sudah login. Jika belum, tendang kembali ke halaman login.
        if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
            window.location.href = 'index.html';
            return; // Hentikan eksekusi script
        }

        const addNewsForm = document.getElementById('add-news-form');
        const newsTitle = document.getElementById('news-title');
        const newsCategory = document.getElementById('news-category');
        const newsImageUrl = document.getElementById('news-image-url');
        const newsContent = document.getElementById('news-content');
        const logoutButton = document.getElementById('logout-button');
        const adminNewsList = document.getElementById('admin-news-list');

        // Ambil data berita yang sudah ada dari Local Storage
        let newsData = JSON.parse(localStorage.getItem('news')) || [];

        // Fungsi untuk menampilkan berita di dashboard admin
        function displayAdminNews() {
             // Urutkan berita dari yang terbaru
            newsData.sort((a, b) => new Date(b.date) - new Date(a.date));

            adminNewsList.innerHTML = '';
            newsData.forEach((newsItem, index) => {
                const newsCard = `
                    <div class="news-card">
                         <img src="${newsItem.image}" alt="${newsItem.title}">
                         <div class="news-card-content">
                            <span class="category">${newsItem.category}</span>
                            <h3>${newsItem.title}</h3>
                         </div>
                    </div>
                `;
                adminNewsList.innerHTML += newsCard;
            });
        }

        // Form submission untuk menambah berita baru
        addNewsForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const newNews = {
                id: Date.now(), // ID unik berdasarkan timestamp
                title: newsTitle.value,
                category: newsCategory.value,
                image: newsImageUrl.value,
                content: newsContent.value,
                date: new Date().toISOString()
            };

            // Tambahkan berita baru ke array
            newsData.push(newNews);
            // Simpan array yang sudah diupdate ke Local Storage
            localStorage.setItem('news', JSON.stringify(newsData));

            // Reset form
            addNewsForm.reset();
            alert('Berita berhasil di-upload!');
            
            // Tampilkan ulang daftar berita
            displayAdminNews();
        });

        // Fungsi Logout
        logoutButton.addEventListener('click', function() {
            sessionStorage.removeItem('isAdminLoggedIn');
            window.location.href = 'index.html';
        });

        // Tampilkan berita yang sudah ada saat halaman dimuat
        displayAdminNews();
    }
});