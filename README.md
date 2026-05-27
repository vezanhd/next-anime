# 🎌 Next Anime

> **Temukan anime selanjutnya berdasarkan anime yang sudah kamu tonton.**  
> Sistem rekomendasi anime berbasis konten yang didukung oleh MAL API dan Machine Learning.

🔗 **Live Demo:** [next-anime.onrender.com](https://next-anime.onrender.com)

---

## 📌 Tentang Proyek

Next Anime adalah sistem rekomendasi anime berbasis web yang membantu pengguna menemukan anime serupa berdasarkan judul yang sudah mereka tonton. Sistem ini menggunakan **Content-Based Filtering** dengan **TF-IDF Vectorization** dan **Cosine Similarity** untuk menemukan anime dengan vibes yang mirip.

### ✨ Fitur
- 🔍 **Smart Search** — pencarian dengan autocomplete dan dukungan judul Jepang (Original)
- ⭐ **Top Picks** — anime populer dengan vibes serupa (popularity ≤ 2000)
- 💎 **Hidden Gems** — anime underrated yang mungkin terlewatkan (popularity > 2000)
- 🎲 **Surprise Me!** — rekomendasi anime acak untuk yang belum tahu mau nonton apa
- 🖼️ **Poster Anime** — poster lazy-loaded langsung dari MAL API
- 📱 **Responsif** — tampilan optimal di desktop maupun mobile

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Sumber Data** | MAL Official API + Kaggle MyAnimeList Dataset 2023 |
| **Pemrosesan Data** | Python, Pandas |
| **Machine Learning** | TF-IDF Vectorization + Cosine Similarity (Scikit-learn) |
| **Backend** | Flask |
| **Frontend** | HTML, CSS, JavaScript |
| **Deployment** | Render |

---

## 🤖 Cara Kerja Sistem

1. **Pengumpulan Data** — Mengambil 2.000 anime teratas dari MAL API dan menggabungkannya dengan dataset Kaggle (24.905 anime) → **25.240 anime unik**
2. **Feature Engineering** — Menggabungkan fitur `genres`, `synopsis`, `media_type`, dan `studios` menjadi satu kolom `tags` dengan bobot tertentu
3. **TF-IDF Vectorization** — Mengubah tags menjadi vektor numerik (matriks 25.240 × 10.000)
4. **Cosine Similarity** — Mengukur kemiripan antar vektor anime
5. **Dual Recommendation** — Membagi hasil menjadi Top Picks (populer) dan Hidden Gems (underrated)

### Strategi Pembobotan
```
media_type × 5  →  bobot tertinggi (memastikan rekomendasi tipe yang sama)
genres × 2      →  bobot tinggi (faktor kemiripan utama)
synopsis        →  500 karakter pertama (menangkap tema cerita)
studios         →  konteks tambahan
```

---

## 📊 Evaluasi Model

Dievaluasi pada **50 sampel anime** dari berbagai genre:

| Metrik | Skor |
|---|---|
| Genre Overlap | **68.00%** |
| Media Type Consistency | **89.31%** |
| Rata-rata Cosine Similarity | **0.2790** |

---

## 🚀 Cara Menjalankan Secara Lokal

### Prasyarat
- Python 3.10+
- MAL API Client ID ([daftar di sini](https://myanimelist.net/apiconfig))

### Instalasi

```bash
# Clone repository
git clone https://github.com/vezanhd/next-anime.git
cd next-anime

# Buat virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Setup environment variable
# Buat file .env dan tambahkan:
MAL_CLIENT_ID=your_client_id_here

# Jalankan aplikasi
python app.py
```

Buka `http://127.0.0.1:5000` di browser.

---

## 📁 Struktur Proyek

```
next-anime/
├── data/
│   ├── anime_dataset.csv        # Dataset MAL API (2.000 anime)
│   ├── anime-dataset-2023.csv   # Dataset Kaggle (24.905 anime)
│   ├── anime_cleaned.csv        # Dataset gabungan & bersih
│   ├── tfidf_model.pkl          # Model TF-IDF tersimpan
│   ├── tfidf_matrix.pkl         # Matriks TF-IDF tersimpan
│   └── indices.pkl              # Indeks judul anime
├── notebooks/
│   └── eda_preprocessing.ipynb  # Notebook EDA & pembuatan model
├── static/
│   ├── css/style.css
│   ├── js/main.js
│   └── images/logo.png
├── templates/
│   └── index.html
├── app.py                       # Aplikasi Flask
├── requirements.txt
├── Procfile
└── .python-version
```

---

## ⚠️ Keterbatasan

- Anime dengan genre yang sangat niche (contoh: pure drama seperti Violet Evergarden) mungkin menghasilkan rekomendasi yang lebih sedikit
- Judul anime harus dimasukkan dalam **bahasa Jepang** (contoh: "Shingeki no Kyojin" bukan "Attack on Titan")
- Animasi China (Donghua) mungkin muncul di rekomendasi anime dengan genre umum seperti action, adventure, dan martial arts

---

## 👨‍💻 Pembuat

**Vezan Hidayatullah**  
📧 hidyatullahvezan@gmail.com  
🔗 [LinkedIn](https://linkedin.com/in/vezanhidayatullah)  
🌐 [Portofolio](https://vezanhd.github.io)  
💻 [GitHub](https://github.com/vezanhd)

---

## 📄 Lisensi

Proyek ini bersifat open source dan tersedia di bawah [MIT License](LICENSE).