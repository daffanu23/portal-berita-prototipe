// app.js
document.addEventListener('DOMContentLoaded', function() {
    const newsContainer = document.getElementById('news-container');
    const categoryFilterContainer = document.getElementById('category-filter-container'); // Ambil wadah tombol filter
    
    // Elemen-elemen untuk User Login
    const welcomeMessage = document.getElementById('welcome-message');
    const userLoginBtn = document.getElementById('user-login-btn');
    const userLogoutBtn = document.getElementById('user-logout-btn');

    let currentCategoryId = ''; // Menyimpan ID kategori yang sedang aktif difilter

    // Fungsi untuk memformat tanggal
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    }

    // Fungsi untuk mengecek status login pengguna (menggunakan token JWT di localStorage)
    async function checkLoginStatus() {
        const userToken = localStorage.getItem('userToken');

        if (!userToken) {
            welcomeMessage.textContent = '';
            if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
            if (userLogoutBtn) userLogoutBtn.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/current_user', {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                welcomeMessage.textContent = `Selamat datang, ${user.username}!`;
                if (userLoginBtn) userLoginBtn.style.display = 'none';
                if (userLogoutBtn) userLogoutBtn.style.display = 'inline-block';
            } else {
                // Token tidak valid atau expired
                localStorage.removeItem('userToken');
                welcomeMessage.textContent = '';
                if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
                if (userLogoutBtn) userLogoutBtn.style.display = 'none';
                console.error('Invalid user token or authentication failed:', response.status);
            }
        } catch (error) {
            console.error('Error checking login status:', error);
            localStorage.removeItem('userToken');
            welcomeMessage.textContent = '';
            if (userLoginBtn) userLoginBtn.style.display = 'inline-block';
            if (userLogoutBtn) userLogoutBtn.style.display = 'none';
        }
    }

    // Fungsi untuk memuat dan menampilkan berita berdasarkan categoryId
    async function fetchAndDisplayNews(categoryId = '') {
        if (newsContainer) newsContainer.innerHTML = '<p>Memuat berita...</p>'; 

        try {
            let url = 'http://localhost:3000/api/news';
            if (categoryId && categoryId !== '') { // Jika categoryId diberikan dan tidak kosong
                url += `?category_id=${categoryId}`; 
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
                // newsItem.category_name digunakan karena JOIN di backend
                const newsCard = `
                    <a href="detail.html?id=${newsItem.id}" class="news-card-link">
                        <div class="news-card">
                            <img src="${newsItem.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${newsItem.title}">
                            <div class="news-card-content">
                                <span class="category">${newsItem.category_name || 'Tidak Diketahui'}</span>
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

    // Fungsi untuk memuat dan menampilkan tombol filter kategori dari backend
    async function loadCategoryButtons() {
        try {
            const response = await fetch('http://localhost:3000/api/categories');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categoriesData = await response.json();

            // Hapus tombol kategori dinamis lama (biarkan "Semua Berita" yang di HTML)
            // Mulai dari indeks 1 karena tombol "Semua Berita" adalah elemen pertama
            while (categoryFilterContainer.children.length > 1) {
                categoryFilterContainer.removeChild(categoryFilterContainer.lastChild);
            }

            categoriesData.forEach(category => {
                const categoryBtn = document.createElement('button');
                categoryBtn.className = 'category-filter-btn';
                categoryBtn.dataset.categoryId = category.id; // Simpan ID kategori
                categoryBtn.textContent = category.name; // Tampilkan nama kategori
                categoryFilterContainer.appendChild(categoryBtn);
            });

            // Tambahkan event listener ke container untuk delegasi event
            // Ini menangani klik pada semua tombol .category-filter-btn
            categoryFilterContainer.addEventListener('click', function(event) {
                const target = event.target;
                if (target.classList.contains('category-filter-btn')) {
                    // Hapus kelas 'active' dari semua tombol
                    document.querySelectorAll('.category-filter-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    // Tambahkan kelas 'active' ke tombol yang diklik
                    target.classList.add('active');
                    
                    currentCategoryId = target.dataset.categoryId; // Ambil ID dari data-attribute
                    fetchAndDisplayNews(currentCategoryId); // Muat berita dengan filter baru
                }
            });

        } catch (error) {
            console.error('Error loading category filters:', error);
            // Opsional: Tampilkan pesan error di UI jika kategori gagal dimuat
            // const errorMessage = document.createElement('p');
            // errorMessage.textContent = 'Gagal memuat filter kategori.';
            // categoryFilterContainer.appendChild(errorMessage);
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
    
    // Panggil fungsi saat halaman utama dimuat
    checkLoginStatus(); // Cek status login saat halaman dimuat
    loadCategoryButtons(); // Muat tombol-tombol kategori
    fetchAndDisplayNews(); // Muat semua berita secara default saat pertama kali loading
});