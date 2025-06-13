document.addEventListener('DOMContentLoaded', function() {
    const newsDetailContainer = document.getElementById('news-detail-container');

    // 1. Ambil ID Berita dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = parseInt(urlParams.get('id')); // Ambil 'id' dan ubah ke angka

    // 2. Ambil semua data berita dari Local Storage
    const newsData = JSON.parse(localStorage.getItem('news')) || [];

    // 3. Cari berita yang cocok berdasarkan ID
    const article = newsData.find(item => item.id === newsId);

    // 4. Tampilkan berita jika ditemukan
    if (article) {
        // Mengubah judul halaman sesuai judul berita
        document.title = article.title;

        const articleHTML = `
            <article class="news-detail">
                <h1 class="detail-title">${article.title}</h1>
                <p class="detail-meta">
                    <span class="category">${article.category}</span> | 
                    Dipublikasikan pada: ${new Date(article.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <img class="detail-image" src="${article.image}" alt="${article.title}">
                <div class="detail-content">
                    ${article.content} </div>
            </article>
        `;
        newsDetailContainer.innerHTML = articleHTML;
    } else {
        // Tampilkan pesan jika berita tidak ditemukan
        newsDetailContainer.innerHTML = '<h2>404 - Berita tidak ditemukan</h2><p>Berita yang Anda cari mungkin telah dihapus atau URL tidak valid.</p>';
    }
});