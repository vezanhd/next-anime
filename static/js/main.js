// State
let topPicksData = [];
let hiddenGemsData = [];
let topPicksShown = 10;
let hiddenGemsShown = 10;

// Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const autocompleteList = document.getElementById('autocompleteList');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');
const inputInfo = document.getElementById('inputInfo');
const randomBtn = document.getElementById('randomBtn');
const randomAgainBtn = document.getElementById('randomAgainBtn');
const randomSection = document.getElementById('randomSection');

// Autocomplete
let autocompleteTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(autocompleteTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) {
        autocompleteList.innerHTML = '';
        return;
    }
    autocompleteTimeout = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        autocompleteList.innerHTML = '';
        data.forEach(title => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = title;
            item.addEventListener('click', () => {
                searchInput.value = title;
                autocompleteList.innerHTML = '';
                getRecommendations(title);
            });
            autocompleteList.appendChild(item);
        });
    }, 300);
});

// Close autocomplete on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        autocompleteList.innerHTML = '';
    }
});

// Search button
searchBtn.addEventListener('click', () => {
    const title = searchInput.value.trim();
    if (title) getRecommendations(title);
});

// Enter key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const title = searchInput.value.trim();
        if (title) {
            autocompleteList.innerHTML = '';
            getRecommendations(title);
        }
    }
});

// Random button
randomBtn.addEventListener('click', showRandomAnime);
randomAgainBtn.addEventListener('click', showRandomAnime);

async function showRandomAnime() {
    try {
        const res = await fetch('/api/random');
        const data = await res.json();
        const grid = document.getElementById('randomGrid');
        grid.innerHTML = '';
        data.forEach(anime => {
            const card = createAnimeCard(anime);
            grid.appendChild(card);
        });
        randomSection.style.display = 'block';
        lazyLoadPosters();
        randomSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        console.error(e);
    }
}

// Get recommendations
async function getRecommendations(title) {
    results.style.display = 'none';
    errorMsg.style.display = 'none';
    inputInfo.style.display = 'none';
    randomSection.style.display = 'none';
    loading.style.display = 'block';
    topPicksShown = 10;
    hiddenGemsShown = 10;

    loading.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Tampilkan skeleton dulu
    results.style.display = 'block';
    renderSkeleton('topPicksGrid', 8);
    renderSkeleton('hiddenGemsGrid', 8);

    try {
        const res = await fetch(`/api/recommend?title=${encodeURIComponent(title)}`);
        const data = await res.json();

        loading.style.display = 'none';

        if (data.error) {
            errorMsg.style.display = 'block';
            document.getElementById('errorText').textContent = data.error;

            // Cek apakah error karena tidak ditemukan → tampilkan hint judul Jepang
            if (data.error.toLowerCase().includes('tidak ditemukan')) {
                document.getElementById('errorHint').textContent =
                    '💡 Try using the Japanese title. Example: "Shingeki no Kyojin" instead of "Attack on Titan", or "Kimetsu no Yaiba" instead of "Demon Slayer".';
            } else {
                document.getElementById('errorHint').textContent = '';
            }
            return;
        }

        showInputAnime(data.input_anime);
        fetchPosterForInputAnime(data.input_anime.title);

        topPicksData = data.top_picks;
        // Reset filter ke all
        topPicksFilter = ['all'];
        hiddenGemsFilter = ['all'];
        document.querySelectorAll('#topPicksFilter .filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#hiddenGemsFilter .filter-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('#topPicksFilter .filter-btn[data-type="all"]').classList.add('active');
        document.querySelector('#hiddenGemsFilter .filter-btn[data-type="all"]').classList.add('active');
        hiddenGemsData = data.hidden_gems;

        renderGrid('topPicksGrid', topPicksData, topPicksShown);
        renderGrid('hiddenGemsGrid', hiddenGemsData, hiddenGemsShown);

        lazyLoadPosters();

        document.getElementById('topPicksMore').style.display =
            topPicksData.length > 10 ? 'block' : 'none';
        document.getElementById('hiddenGemsMore').style.display =
            hiddenGemsData.length > 10 ? 'block' : 'none';

        results.style.display = 'block';
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        loading.style.display = 'none';
        errorMsg.style.display = 'block';
        document.getElementById('errorText').textContent = 'Something went wrong. Please try again.';
        document.getElementById('errorHint').textContent = '';
    }
}

// Fetch poster for input anime
async function fetchPosterForInputAnime(title) {
    try {
        const res = await fetch(`/api/poster?title=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (data.poster) {
            const imgEl = document.getElementById('inputPoster');
            if (imgEl) {
                imgEl.src = data.poster;
                imgEl.style.display = 'block';
                imgEl.closest('.input-poster-wrapper').querySelector('.input-poster-placeholder').style.display = 'none';
            }
        }
    } catch (e) {}
}

// Show input anime info
function showInputAnime(anime) {
    document.getElementById('inputTitle').textContent = anime.title;
    document.getElementById('inputType').textContent = anime.media_type.toUpperCase();
    document.getElementById('inputScore').textContent = `⭐ ${anime.mean}`;
    document.getElementById('inputEpisodes').textContent =
        anime.num_episodes > 0 ? `${anime.num_episodes} eps` : 'Ongoing';
    document.getElementById('inputGenres').textContent = anime.genres;
    document.getElementById('inputSynopsis').textContent =
        anime.synopsis || 'No synopsis available.';
    inputInfo.style.display = 'block';
}

// Lazy load all posters
function lazyLoadPosters() {
    const cards = document.querySelectorAll('.anime-card[data-title]');
    cards.forEach((card, i) => {
        if (card.getAttribute('data-loaded') === 'true') return;
        setTimeout(() => {
            const title = card.getAttribute('data-title');
            fetch(`/api/poster?title=${encodeURIComponent(title)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.poster) {
                        const img = card.querySelector('.anime-poster');
                        const placeholder = card.querySelector('.anime-poster-placeholder');
                        if (img) {
                            img.src = data.poster;
                            img.style.display = 'block';
                            if (placeholder) placeholder.style.display = 'none';
                            card.setAttribute('data-loaded', 'true');
                        }
                    }
                })
                .catch(() => {});
        }, i * 120);
    });
}

// Buat skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
        <div class="skeleton skeleton-poster"></div>
        <div class="skeleton-body">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-title-short"></div>
            <div>
                <span class="skeleton skeleton-badge"></span>
                <span class="skeleton skeleton-badge"></span>
            </div>
            <br>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text-short"></div>
        </div>
    `;
    return card;
}

// Render skeleton dulu sebelum data siap
function renderSkeleton(gridId, count = 8) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        grid.appendChild(createSkeletonCard());
    }
}

// Render grid
function renderGrid(gridId, data, limit) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    const items = data.slice(0, limit);

    if (items.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">No results found.</p>';
        return;
    }

    items.forEach(anime => {
        const card = createAnimeCard(anime);
        grid.appendChild(card);
    });
}

// Create anime card
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.setAttribute('data-title', anime.title);
    card.setAttribute('data-media-type', anime.media_type.toLowerCase());

    const episodes = anime.num_episodes > 0 ? `${anime.num_episodes} eps` : 'Ongoing';
    const score = anime.mean > 0 ? `⭐ ${anime.mean}` : 'N/A';
    const synopsis = anime.synopsis || 'No synopsis available.';
    const genres = anime.genres || 'Unknown';

    card.innerHTML = `
        <div class="anime-poster-wrapper">
            <div class="anime-poster-placeholder">🎌</div>
            <img class="anime-poster" src="" alt="${anime.title}" style="display:none;">
        </div>
        <div class="anime-card-body">
            <div class="anime-card-header">
                <div class="anime-card-title">${anime.title}</div>
                <div class="anime-score">${score}</div>
            </div>
            <div class="anime-card-meta">
                <span class="badge">${anime.media_type.toUpperCase()}</span>
                <span class="badge">${episodes}</span>
            </div>
            <div class="anime-card-genres">${genres}</div>
            <div class="anime-card-synopsis">${synopsis}</div>
            <button class="more-like-btn" data-title="${anime.title}">🔍 More Like This</button>
        </div>
    `;

    // Klik card → buka MAL
    card.addEventListener('click', (e) => {
        // Jangan trigger kalau yang diklik adalah tombol
        if (e.target.closest('.more-like-btn')) return;
        const query = encodeURIComponent(anime.title);
        window.open(`https://myanimelist.net/anime.php?q=${query}&cat=anime`, '_blank');
    });

    // Klik tombol More Like This
    card.querySelector('.more-like-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const title = anime.title;
        searchInput.value = title;
        getRecommendations(title);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return card;
}

// Show more
function showMore(type) {
    if (type === 'top') {
        topPicksShown += 10;
        renderGrid('topPicksGrid', topPicksData, topPicksShown);
        lazyLoadPosters();
        applyFilter('topPicksGrid', topPicksFilter); // tambah ini
        if (topPicksShown >= topPicksData.length) {
            document.getElementById('topPicksMore').style.display = 'none';
        }
    } else {
        hiddenGemsShown += 10;
        renderGrid('hiddenGemsGrid', hiddenGemsData, hiddenGemsShown);
        lazyLoadPosters();
        applyFilter('hiddenGemsGrid', hiddenGemsFilter); // tambah ini
        if (hiddenGemsShown >= hiddenGemsData.length) {
            document.getElementById('hiddenGemsMore').style.display = 'none';
        }
    }
}

// Filter state
let topPicksFilter = ['all'];
let hiddenGemsFilter = ['all'];

// Set filter — hanya hide/show card yang sudah ada, tidak ubah data
function setFilter(section, type, btn) {
    const filterId = section === 'top' ? 'topPicksFilter' : 'hiddenGemsFilter';
    const gridId = section === 'top' ? 'topPicksGrid' : 'hiddenGemsGrid';

    if (type === 'all') {
        // Reset ke all
        if (section === 'top') topPicksFilter = ['all'];
        else hiddenGemsFilter = ['all'];
        document.querySelectorAll(`#${filterId} .filter-btn`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    } else {
        const filterState = section === 'top' ? topPicksFilter : hiddenGemsFilter;
        const allBtn = document.querySelector(`#${filterId} .filter-btn[data-type="all"]`);

        // Hapus 'all' dari filter
        const allIdx = filterState.indexOf('all');
        if (allIdx > -1) {
            filterState.splice(allIdx, 1);
            allBtn.classList.remove('active');
        }

        // Toggle tipe yang dipilih
        const typeIdx = filterState.indexOf(type);
        if (typeIdx > -1) {
            filterState.splice(typeIdx, 1);
            btn.classList.remove('active');
        } else {
            filterState.push(type);
            btn.classList.add('active');
        }

        // Kalau tidak ada yang dipilih, balik ke all
        if (filterState.length === 0) {
            if (section === 'top') topPicksFilter = ['all'];
            else hiddenGemsFilter = ['all'];
            allBtn.classList.add('active');
        }
    }

    // Apply filter — hide/show card
    applyFilter(gridId, section === 'top' ? topPicksFilter : hiddenGemsFilter);
}

// Apply filter — hanya hide/show card, tidak ubah data sama sekali
function applyFilter(gridId, selectedTypes) {
    const cards = document.querySelectorAll(`#${gridId} .anime-card`);
    cards.forEach(card => {
        const mediaType = card.getAttribute('data-media-type');
        if (selectedTypes.includes('all') || selectedTypes.includes(mediaType)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}