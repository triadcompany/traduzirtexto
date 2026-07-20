/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import PdfGenerator from './components/PdfGenerator';

const languages = [
  { code: 'en', name: 'Inglês' },
  { code: 'es', name: 'Espanhol' },
  { code: 'fr', name: 'Francês' },
  { code: 'de', name: 'Alemão' },
  { code: 'pt', name: 'Português' },
  { code: 'it', name: 'Italiano' },
  { code: 'ja', name: 'Japonês' },
  { code: 'ko', name: 'Coreano' },
  { code: 'zh', name: 'Chinês' },
];

export default function App() {
  const [inputText, setInputText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'translator' | 'pdfGenerator'>('translator');

  // 4000 chars por chunk é seguro: cabe dentro do limite de saída do Gemini (8192 tokens)
  const CHUNK_SIZE = 4000;

  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    setTranslatedText('');

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      const sourceLangName = languages.find(lang => lang.code === sourceLanguage)?.name;
      const targetLangName = languages.find(lang => lang.code === targetLanguage)?.name;

      if (!inputText.trim()) {
        throw new Error('Por favor, digite um texto para traduzir.');
      }

      const textChunks: string[] = [];
      for (let i = 0; i < inputText.length; i += CHUNK_SIZE) {
        textChunks.push(inputText.substring(i, i + CHUNK_SIZE));
      }

      let fullTranslatedText = '';

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];

        let retries = 0;
        const maxRetries = 3;
        let chunkDone = false;

        while (!chunkDone && retries < maxRetries) {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: chunk,
              sourceLanguage: sourceLangName,
              targetLanguage: targetLangName,
            }),
          });

          if (!response.ok) {
            if (response.status === 429) {
              retries++;
              if (retries < maxRetries) {
                await sleep(15000 * retries);
                continue;
              }
            }
            const errorBody = await response.json().catch(() => null);
            throw new Error(errorBody?.error || `Falha ao traduzir (HTTP ${response.status}).`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let chunkText = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunkText += decoder.decode(value, { stream: true });
              setTranslatedText(fullTranslatedText + chunkText);
            }
          }

          if (fullTranslatedText && !fullTranslatedText.endsWith('\n')) {
            fullTranslatedText += ' ';
          }
          fullTranslatedText += chunkText.trim();
          setTranslatedText(fullTranslatedText);
          chunkDone = true;
        }

        if (i < textChunks.length - 1) {
          await sleep(300);
        }
      }

      setTranslatedText(fullTranslatedText.trim() || 'Nenhuma tradução encontrada.');
    } catch (err: any) {
      console.error('Translation error:', err);
      const errorMsg = String(err);
      if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        setError(`Limite de uso da API atingido. Detalhes: ${err instanceof Error ? err.message : errorMsg}`);
      } else {
        setError(`Falha ao traduzir o texto. Detalhes: ${err instanceof Error ? err.message : errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">


        <div className="flex justify-center mb-6">
          <button
            className={`px-6 py-3 rounded-t-lg text-lg font-semibold ${activeTab === 'translator' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setActiveTab('translator')}
          >
            Tradutor
          </button>
          <button
            className={`px-6 py-3 rounded-t-lg text-lg font-semibold ${activeTab === 'pdfGenerator' ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            onClick={() => setActiveTab('pdfGenerator')}
          >
            Gerador de PDF
          </button>
        </div>

        <div className="bg-gray-800 p-8 rounded-b-2xl rounded-tr-2xl shadow-2xl w-full border border-blue-700">
        {error && (
          <div className="bg-red-800 border border-red-600 text-white px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Erro:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {activeTab === 'translator' && (
          <>
            <div className="mb-6">
              <label htmlFor="inputText" className="block text-blue-200 text-sm font-semibold mb-2">Texto de Origem:</label>
              <textarea
                id="inputText"
                className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none placeholder-gray-400"
                placeholder="Digite o texto para traduzir..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="sourceLanguage" className="block text-blue-200 text-sm font-semibold mb-2">Idioma de Origem:</label>
                <select
                  id="sourceLanguage"
                  className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="targetLanguage" className="block text-blue-200 text-sm font-semibold mb-2">Idioma de Destino:</label>
                <select
                  id="targetLanguage"
                  className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleTranslate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 w-full transition duration-200 ease-in-out transform hover:scale-105"
              disabled={loading}
            >
              {loading ? 'Traduzindo...' : 'Traduzir'}
            </button>

            {(translatedText || loading) && (
              <div className="mt-8">
                <label htmlFor="translatedText" className="block text-blue-200 text-sm font-semibold mb-2">Texto Traduzido:</label>
                <textarea
                  id="translatedText"
                  className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  style={{ minHeight: '200px', height: `${Math.max(200, Math.min(600, translatedText.split('\n').length * 24 + 48))}px` }}
                  placeholder="A tradução aparecerá aqui em tempo real..."
                  value={translatedText}
                  readOnly
                ></textarea>
              </div>
            )}
          </>
        )}

        {activeTab === 'pdfGenerator' && (
          <PdfGenerator initialText={translatedText} />
        )}
        </div>
      </div>
    </div>
  );
}
