document.addEventListener('DOMContentLoaded', function() {
    const newsContainer = document.getElementById('news-container');
    const categoryFilter = document.getElementById('category-filter');

    // Elemen-elemen untuk User Login
    // eslint-disable-next-line no-unused-vars
    const userInfoSection = document.getElementById('user-info-section'); // Disertakan untuk referensi jika dibutuhkan, tapi bisa diabaikan jika tidak langsung digunakan
    const welcomeMessage = document.getElementById('welcome-message');
    const userLoginBtn = document.getElementById('user-login-btn'); // Tombol "Login / Daftar"
    const userLogoutBtn = document.getElementById('user-logout-btn'); // Tombol "Logout"

    // Fungsi untuk memformat tanggal
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    // Fungsi untuk mengecek status login pengguna (menggunakan token JWT di localStorage)
    async function checkLoginStatus() {
        const userToken = localStorage.getItem('userToken'); // Ambil token user dari localStorage

        if (!userToken) {
            // User belum login, tampilkan tombol login, sembunyikan tombol logout dan pesan selamat datang
            welcomeMessage.textContent = '';
            if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
            if (userLogoutBtn) userLogoutBtn.style.display = 'none';
            return;
        }

        try {
            // Kirim token ke backend untuk memverifikasi dan mendapatkan info user
            const response = await fetch('http://localhost:3000/api/current_user', {
                headers: {
                    'Authorization': `Bearer ${userToken}` // Kirim token di header Authorization (penting!)
                }
            });

            if (response.ok) {
                const user = await response.json();
                // User berhasil diverifikasi dan login
                welcomeMessage.textContent = `Selamat datang, ${user.username}!`; // Tampilkan username
                if (userLoginBtn) userLoginBtn.style.display = 'none';
                if (userLogoutBtn) userLogoutBtn.style.display = 'inline-block';
            } else {
                // Token tidak valid atau expired (misal, 401 Unauthorized, 403 Forbidden)
                localStorage.removeItem('userToken'); // Hapus token yang tidak valid dari localStorage
                welcomeMessage.textContent = '';
                if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
                if (userLogoutBtn) userLogoutBtn.style.display = 'none';
                console.error('Invalid user token or authentication failed:', response.status);
            }
        } catch (error) {
            // Terjadi error jaringan atau server
            console.error('Error checking login status:', error);
            localStorage.removeItem('userToken'); // Hapus token jika ada error
            welcomeMessage.textContent = '';
            if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
            if (userLogoutBtn) userLogoutBtn.style.display = 'none';
        }
    }

    // Fungsi untuk memuat dan menampilkan berita berdasarkan kategori
    async function fetchAndDisplayNews(category = 'all') {
        if (newsContainer) newsContainer.innerHTML = '<p>Memuat berita...</p>'; // Tampilkan pesan loading

        try {
            let url = 'http://localhost:3000/api/news';
            if (category && category !== 'all') {
                url = `http://localhost:3000/api/news/category/${encodeURIComponent(category)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const newsData = await response.json();

            if (newsData.length === 0) {
                if (newsContainer) newsContainer.innerHTML = '<p>Belum ada berita yang dipublikasikan untuk kategori ini.</p>';
                return;
            }

            // Urutkan berita dari yang terbaru (opsional, bisa dilakukan di backend juga)
            newsData.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (newsContainer) newsContainer.innerHTML = ''; // Kosongkan kontainer
            newsData.forEach(newsItem => {
                const newsCard = `
                    <a href="detail.html?id=${newsItem.id}" class="news-card-link">
                        <div class="news-card">
                            <img src="${newsItem.image}" alt="${newsItem.title}">
                            <div class="news-card-content">
                                <span class="category">${newsItem.category}</span>
                                <h3>${newsItem.title}</h3>
                                <p class="date">Dipublikasikan pada: ${formatDate(newsItem.date)}</p>
                            </div>
                        </div>
                    </a>
                `;
                if (newsContainer) newsContainer.innerHTML += newsCard;
            });
        } catch (error) {
            console.error('Error fetching news:', error);
            if (newsContainer) newsContainer.innerHTML = '<p>Gagal memuat berita. Silakan coba lagi nanti.</p>';
        }
    }

    // Event listener untuk tombol Login / Daftar
    if (userLoginBtn) {
        userLoginBtn.addEventListener('click', function() {
            window.location.href = 'login.html'; // Arahkan ke halaman login/daftar
        });
    }

    // Event listener untuk tombol Logout
    if (userLogoutBtn) {
        userLogoutBtn.addEventListener('click', function() {
            localStorage.removeItem('userToken'); // Hapus token JWT dari localStorage
            checkLoginStatus(); // Perbarui tampilan UI status login (akan menampilkan tombol login lagi)
            alert('Anda telah berhasil logout.'); // Notifikasi sederhana ke user
        });
    }

    // Event listener untuk perubahan filter kategori
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            const selectedCategory = this.value;
            fetchAndDisplayNews(selectedCategory); // Muat berita sesuai kategori yang dipilih
        });
    }
    
    // Panggil fungsi saat halaman utama dimuat
    checkLoginStatus(); // Cek status login saat halaman dimuat
    fetchAndDisplayNews(categoryFilter ? categoryFilter.value : 'all'); // Muat berita awal (semua kategori atau sesuai filter default)
});