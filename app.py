from flask import Flask, render_template, request, jsonify
import pandas as pd
import pickle
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import requests as req
import os

load_dotenv()

app = Flask(__name__)

# Load model & data
print("Loading model...")
df = pd.read_csv('data/anime_cleaned.csv')
with open('data/tfidf_model.pkl', 'rb') as f:
    tfidf = pickle.load(f)
with open('data/tfidf_matrix.pkl', 'rb') as f:
    tfidf_matrix = pickle.load(f)
with open('data/indices.pkl', 'rb') as f:
    indices = pickle.load(f)
print("Model loaded! ✅")

def is_sequel(input_title, candidate_title):
    input_clean = input_title.lower().strip()
    candidate_clean = candidate_title.lower().strip()
    input_words = set(w for w in input_clean.split() if len(w) >= 3)
    candidate_words = set(w for w in candidate_clean.split() if len(w) >= 3)
    if len(input_words) == 0:
        return False
    overlap = len(input_words & candidate_words) / len(input_words)
    return overlap >= 0.5

def remove_franchise_duplicates(df_result):
    """Hanya ambil 1 anime per franchise"""
    seen_franchises = set()
    filtered_indices = []
    
    for idx, row in df_result.iterrows():
        title = row['title'].lower()
        title_words = set(w for w in title.split() if len(w) >= 3)
        
        is_duplicate = False
        for franchise in seen_franchises:
            overlap = len(title_words & franchise) / len(franchise) if len(franchise) > 0 else 0
            if overlap >= 0.6:
                is_duplicate = True
                break
        
        if not is_duplicate:
            seen_franchises.add(frozenset(title_words))
            filtered_indices.append(idx)
    
    return df_result.loc[filtered_indices]

def get_recommendations(title, n=10):
    title_lower = title.lower()

    if title_lower not in indices:
        return None, None, f"Anime '{title}' tidak ditemukan di database."

    idx = indices[title_lower]
    sim_scores = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    sim_scores[idx] = 0

    top_indices = sim_scores.argsort()[::-1][:500]
    top_df = df.iloc[top_indices].copy()
    top_df['similarity'] = sim_scores[top_indices]
    top_df = top_df[top_df['mean'] > 0]
    top_df = top_df[~top_df['title'].apply(lambda x: is_sequel(title, x))]
    top_df = remove_franchise_duplicates(top_df)

    max_rank = df[df['rank'] > 0]['rank'].max()
    top_df['rank_score'] = top_df['rank'].apply(lambda x: 1 - (x / max_rank) if x > 0 else 0)
    top_df['combined_score'] = (top_df['mean'] / 10 * 0.6) + (top_df['rank_score'] * 0.4)

    # TOP PICKS
    top_picks = top_df[
        (top_df['mean'] >= 7.0) &
        (top_df['popularity'] <= 2000)
    ].sort_values(by=['combined_score', 'similarity'], ascending=[False, False]).head(n * 2)

    if len(top_picks) < n:
        extra = top_df[
            (top_df['mean'] >= 7.0) &
            (~top_df.index.isin(top_picks.index))
        ].sort_values(by=['combined_score'], ascending=False).head(n - len(top_picks))
        top_picks = pd.concat([top_picks, extra])

    # HIDDEN GEMS
    top_picks_indices = set(top_picks.index)
    hidden_gems = top_df[
        (top_df['mean'] >= 7.0) &
        (top_df['popularity'] > 2000) &
        (~top_df.index.isin(top_picks_indices))
    ].sort_values(by=['similarity', 'mean'], ascending=[False, False]).head(n * 2)

    return top_picks, hidden_gems, None

def df_to_list(df_result):
    if df_result is None or len(df_result) == 0:
        return []
    result = df_result[['title', 'mean', 'rank', 'popularity', 'genres', 'media_type', 'num_episodes', 'synopsis', 'studios']].fillna('')
    records = []
    for _, row in result.iterrows():
        records.append({
            'title': str(row['title']),
            'mean': float(row['mean']),
            'rank': int(row['rank']),
            'popularity': int(row['popularity']),
            'genres': str(row['genres']),
            'media_type': str(row['media_type']),
            'num_episodes': int(row['num_episodes']),
            'synopsis': str(row['synopsis']),
            'studios': str(row['studios'])
        })
    return records

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    matches = df[df['title'].str.lower().str.contains(query.lower(), na=False)]['title'].head(10).tolist()
    return jsonify(matches)

@app.route('/api/poster')
def get_poster():
    title = request.args.get('title', '').strip()
    if not title:
        return jsonify({'poster': None})
    try:
        client_id = os.getenv("MAL_CLIENT_ID")
        url = "https://api.myanimelist.net/v2/anime"
        headers = {"X-MAL-CLIENT-ID": client_id}
        params = {
            "q": title,
            "limit": 1,
            "fields": "main_picture"
        }
        response = req.get(url, headers=headers, params=params, timeout=5)
        data = response.json()
        if data.get('data') and len(data['data']) > 0:
            pictures = data['data'][0]['node'].get('main_picture', {})
            poster = pictures.get('medium') or pictures.get('large')
            return jsonify({'poster': poster})
        return jsonify({'poster': None})
    except Exception:
        return jsonify({'poster': None})

@app.route('/api/recommend')
def recommend():
    title = request.args.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Judul anime diperlukan'})

    top_picks, hidden_gems, error = get_recommendations(title, n=10)

    if error:
        return jsonify({'error': error})

    input_anime = df[df['title'].str.lower() == title.lower()].iloc[0]

    return jsonify({
        'input_anime': {
            'title': str(input_anime['title']),
            'mean': float(input_anime['mean']),
            'genres': str(input_anime['genres']),
            'media_type': str(input_anime['media_type']),
            'num_episodes': int(input_anime['num_episodes']),
            'synopsis': str(input_anime['synopsis']),
            'studios': str(input_anime['studios'])
        },
        'top_picks': df_to_list(top_picks),
        'hidden_gems': df_to_list(hidden_gems)
    })

@app.route('/api/random')
def random_anime():
    sample = df[df['mean'] > 7.0].sample(3)
    records = []
    for _, row in sample.iterrows():
        records.append({
            'title': str(row['title']),
            'mean': float(row['mean']),
            'rank': int(row['rank']),
            'popularity': int(row['popularity']),
            'genres': str(row['genres']),
            'media_type': str(row['media_type']),
            'num_episodes': int(row['num_episodes']),
            'synopsis': str(row['synopsis']),
            'studios': str(row['studios'])
        })
    return jsonify(records)

if __name__ == '__main__':
    app.run(debug=True)