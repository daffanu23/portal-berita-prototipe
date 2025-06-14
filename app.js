document.addEventListener('DOMContentLoaded', function() {
    const newsContainer = document.getElementById('news-container');

    async function fetchAndDisplayNews() {
        try {
            // Ambil data berita dari API backend
            const response = await fetch('http://localhost:3000/api/news');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const newsData = await response.json();

            if (newsData.length === 0) {
                newsContainer.innerHTML = '<p>Belum ada berita yang dipublikasikan.</p>';
                return;
            }

            // Urutkan berita dari yang terbaru (opsional, bisa dilakukan di backend juga)
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
        } catch (error) {
            console.error('Error fetching news:', error);
            newsContainer.innerHTML = '<p>Gagal memuat berita. Silakan coba lagi nanti.</p>';
        }
    }

    fetchAndDisplayNews();
});