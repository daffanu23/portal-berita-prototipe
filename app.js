document.addEventListener('DOMContentLoaded', function() {
    const newsContainer = document.getElementById('news-container');

    // Ambil data berita dari Local Storage
    // Jika tidak ada, gunakan array kosong
    const newsData = JSON.parse(localStorage.getItem('news')) || [];

    function displayNews() {
        if (newsData.length === 0) {
            newsContainer.innerHTML = '<p>Belum ada berita yang dipublikasikan.</p>';
            return;
        }

        // Urutkan berita dari yang terbaru
        newsData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        newsContainer.innerHTML = ''; // Kosongkan kontainer
        newsData.forEach(newsItem => {
            const newsCard = `
                <a href="detail.html?id=${newsItem.id}" class="news-card-link">
                    <div class="news-card">
                        <img src="${newsItem.image}" alt="${newsItem.title}">
                        <div class="news-card-content">
                            <span class="category">${newsItem.category}</span>
                            <h3>${newsItem.title}</h3>
                            <p class="date">Dipublikasikan pada: ${new Date(newsItem.date).toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                </a>
            `;
            newsContainer.innerHTML += newsCard;
        });
    }

    displayNews();
});