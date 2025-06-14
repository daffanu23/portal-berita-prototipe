document.addEventListener('DOMContentLoaded', async function() {
    const newsDetailContainer = document.getElementById('news-detail-container');

    // 1. Ambil ID Berita dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = parseInt(urlParams.get('id'));

    if (isNaN(newsId)) {
        newsDetailContainer.innerHTML = '<h2>Error: ID Berita tidak valid.</h2>';
        return;
    }

    try {
        // Ambil detail berita dari API backend berdasarkan ID
        const response = await fetch(`http://localhost:3000/api/news/${newsId}`);
        if (!response.ok) {
            if (response.status === 404) {
                newsDetailContainer.innerHTML = '<h2>404 - Berita tidak ditemukan</h2><p>Berita yang Anda cari mungkin telah dihapus atau URL tidak valid.</p>';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const article = await response.json();

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
                        ${article.content}
                    </div>
                </article>
            `;
            newsDetailContainer.innerHTML = articleHTML;
        } else {
            newsDetailContainer.innerHTML = '<h2>404 - Berita tidak ditemukan</h2><p>Berita yang Anda cari mungkin telah dihapus atau URL tidak valid.</p>';
        }
    } catch (error) {
        console.error('Error fetching news detail:', error);
        newsDetailContainer.innerHTML = '<p>Gagal memuat detail berita. Silakan coba lagi nanti.</p>';
    }
});