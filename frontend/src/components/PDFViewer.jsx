import { useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { searchPlugin } from '@react-pdf-viewer/search';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';

export default function PDFEditorViewer() {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const searchPluginInstance = searchPlugin();
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfFile, setPdfFile] = useState(null);
    const [weakWords, setWeakWords] = useState([]);
    const [suggestions, setSuggestions] = useState({});
    const [selectedWord, setSelectedWord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showWeakWords, setShowWeakWords] = useState(false);

    const { highlight, jumpToNextMatch } = searchPluginInstance;

    const [searchTerm, setSearchTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [replacements, setReplacements] = useState([]);

    const handleSearch = () => {
        highlight(searchTerm);
        jumpToNextMatch();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setPdfFile(file);
            setPdfUrl(URL.createObjectURL(file));
            // Scan for weak words
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('http://localhost:5000/scan-weak-words', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            setWeakWords(data.weak_words);
            setSuggestions(data.suggestions);
        }
    };

    const handleReplace = async (search, replace) => {
        if (!pdfFile) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', pdfFile);
        formData.append('search', search);
        formData.append('replace', replace);

        const response = await fetch('http://localhost:5000/replace-text-dynamic', {
            method: 'POST',
            body: formData,
        });

        const blob = await response.blob();
        setPdfUrl(URL.createObjectURL(blob));
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-screen w-full">
            <div className="p-4 flex flex-col gap-2 bg-gray-100">
                <div className="flex gap-2 items-center">
                    <input type="file" accept="application/pdf" onChange={handleFileChange} />
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search text"
                        className="border px-2 py-1 rounded"
                    />
                    <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-1 rounded">
                        Search
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        type="text"
                        value={replaceTerm}
                        onChange={(e) => setReplaceTerm(e.target.value)}
                        placeholder="Replace with"
                        className="border px-2 py-1 rounded"
                    />
                    <button
                        onClick={() => handleReplace(searchTerm, replaceTerm)}
                        className="bg-green-500 text-white px-4 py-1 rounded"
                        disabled={loading || !pdfFile}
                    >
                        {loading ? 'Replacing...' : 'Replace (Real)'}
                    </button>
                </div>
                {replacements.length > 0 && (
                    <div className="text-sm text-gray-700">
                        Replacements:
                        <ul>
                            {replacements.map((r, i) => (
                                <li key={i}>
                                    <strong>{r.search}</strong> → <strong>{r.replace}</strong>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <button
                    className="bg-yellow-400 text-black px-4 py-1 rounded mb-2"
                    onClick={() => setShowWeakWords((prev) => !prev)}
                    disabled={weakWords.length === 0}
                >
                    {showWeakWords ? 'Hide Weak Words' : 'Show Weak Words'}
                </button>
            </div>

            <div className="flex-grow">
                {pdfUrl ? (
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                        <Viewer
                            fileUrl={pdfUrl}
                            plugins={[defaultLayoutPluginInstance, searchPluginInstance]}
                        />
                    </Worker>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        No PDF loaded. Please upload a PDF.
                    </div>
                )}
            </div>

            {/* Weak Words and Suggestions UI */}
            {showWeakWords && weakWords.length > 0 && (
                <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                    <h3 className="font-bold mb-2">Weak Words Found:</h3>
                    <ul className="flex flex-wrap gap-2">
                        {weakWords.map(word => (
                            <li key={word}>
                                <button
                                    onClick={() => setSelectedWord(word)}
                                    className="text-red-600 underline hover:text-red-800"
                                >
                                    {word}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {selectedWord && (
                        <div className="mt-4">
                            <h4 className="font-semibold">Suggestions for "{selectedWord}":</h4>
                            <ul className="flex flex-wrap gap-2 mt-2">
                                {(suggestions[selectedWord] || []).map(syn => (
                                    <li key={syn}>
                                        <button
                                            onClick={() => handleReplace(selectedWord, syn)}
                                            className="text-blue-600 underline hover:text-blue-800"
                                        >
                                            {syn}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}