from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os
from utils.pdf_handler import search_text_in_pdf, replace_text_in_memory
import fitz
import requests
import re

app = Flask(__name__)
CORS(app)

app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['STATIC_FOLDER'] = os.path.join(os.getcwd(), 'static')

@app.route('/')
def home():
    return 'Backend is running!'

@app.route('/search', methods=['POST'])
def search_text():
    data = request.get_json()
    filename = data['filename']
    term = data['search_term']

    results, error = search_text_in_pdf(filename, term)
    if error:
        return jsonify({"error": error}), 404

    return jsonify({"results": results})


@app.route('/replace-text-dynamic', methods=['POST'])
def replace_text_dynamic():
    file = request.files['file']
    search = request.form.get('search')
    replace = request.form.get('replace')
    font_size = float(request.form.get('fontSize', 12))

    if not file or not search or not replace:
        return {'error': 'Missing file or text inputs'}, 400

    updated_pdf = replace_text_in_memory(file, search, replace)

    return send_file(
        updated_pdf,
        mimetype='application/pdf',
        as_attachment=False,
        download_name='modified.pdf'
    )

@app.route('/static/<path:filename>')
def serve_static_file(filename):
    return send_from_directory(app.config['STATIC_FOLDER'], filename)

def get_synonyms(word):
    response = requests.get(f"https://api.datamuse.com/words?rel_syn={word}")
    if response.status_code == 200:
        return [item['word'] for item in response.json()]
    return []

def extract_text_from_pdf(pdf_file):
    pdf_bytes = pdf_file.read()
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

def get_unique_words(text):
    words = re.findall(r'\\b\\w+\\b', text.lower())
    stopwords = set(["the", "and", "is", "in", "to", "of", "a", "for", "on", "with", "as", "by", "at", "an", "be", "this", "that", "it", "from"])
    unique_words = set(words) - stopwords
    return list(unique_words)

def find_weak_words(words):
    weak_words = []
    suggestions = {}
    for word in words:
        syns = get_synonyms(word)
        if syns:  # You can refine this logic
            suggestions[word] = syns
        else:
            weak_words.append(word)
    return weak_words, suggestions

@app.route('/scan-weak-words', methods=['POST'])
def scan_weak_words():
    file = request.files['file']
    if not file:
        return {'error': 'Missing file'}, 400
    text = extract_text_from_pdf(file)
    words = get_unique_words(text)
    weak_words, suggestions = find_weak_words(words)
    return jsonify({'weak_words': weak_words, 'suggestions': suggestions})

if __name__ == '__main__':
    app.run(debug=True)
