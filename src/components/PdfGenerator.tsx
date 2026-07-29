import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface PdfGeneratorProps {
  initialText: string;
}

const MONTHS_PT: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
  outubro: '10', novembro: '11', dezembro: '12',
};

const formatDateForFilename = (rawDate: string): string => {
  const match = rawDate.trim().match(/(\d{1,2})\s*(?:de)?\s*([a-zçãéíóúõê]+)\s*(?:de)?\s*(\d{4})/i);
  if (!match) return '';
  const [, day, monthName, year] = match;
  const month = MONTHS_PT[monthName.toLowerCase()];
  if (!month) return '';
  return `${day.padStart(2, '0')}-${month}-${year}`;
};

const sanitizeFilename = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '').trim();

const PdfGenerator: React.FC<PdfGeneratorProps> = ({ initialText }) => {
  const [pdfText, setPdfText] = useState(initialText);
  const [title, setTitle] = useState('Documento Traduzido');
  const [fontFamily, setFontFamily] = useState('helvetica');
  const [fontSize, setFontSize] = useState(13);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [paragraphSpacing, setParagraphSpacing] = useState(20);
  const [alignment, setAlignment] = useState('justify');
  const [wordsPerLine, setWordsPerLine] = useState(16);
  const [linesPerParagraph, setLinesPerParagraph] = useState(10);
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('Abel Country, Longdenville, Trinidad and Tobago');

  useEffect(() => {
    setPdfText(initialText);
  }, [initialText]);

  const generatePdf = () => {
    const doc = new jsPDF();

    doc.setFont(fontFamily);
    doc.setFontSize(fontSize);

    let y = 30; // Aumentar margem superior inicial
    const margin = 15; // Margem lateral (1.5 cm)
    const maxWidth = 210 - 2 * margin; // Largura máxima da área de texto

    const addPageDecorations = (pageNumber: number, total: number) => {
      doc.setPage(pageNumber);
      
      // Rodapé estilizado com linha divisória
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(20, 285, 190, 285);
      
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Página ${pageNumber} de ${total}`, 105, 290, { align: 'center' });
    };

    // Título com estilo aprimorado
    doc.setFontSize(fontSize + 6);
    doc.setFont(fontFamily, 'bold');
    const titleLines = doc.splitTextToSize(title, maxWidth);
    titleLines.forEach((line: string) => {
      doc.text(line, 105, y, { align: 'center' });
      y += (fontSize + 6) * 1.2 / doc.internal.scaleFactor;
    });
    
    // Linha decorativa abaixo do título
    doc.setDrawColor(0, 51, 102); // Azul escuro clássico
    doc.setLineWidth(0.8);
    doc.line(70, y - 2, 140, y - 2);
    y += 8;

    // Data (+ local) abaixo do título (mesmo tamanho do texto)
    const dateAndLocation = [date, location].filter(Boolean).join(' - ');
    if (dateAndLocation) {
      doc.setFontSize(fontSize);
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(dateAndLocation, 105, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += (fontSize * 1.5) / doc.internal.scaleFactor + 4;
    } else {
      y += 7;
    }

    doc.setFontSize(fontSize);
    doc.setFont(fontFamily, 'normal');

    // Regex melhorada: suporte a livros com números (1 João), abreviações e intervalos de versículos
    const BIBLE_BOOKS = '(?:[123]\\s?)?(?:Gen|Exo|Lev|Num|Deu|Jos|Judg|Ruth|Sam|Kings|Chron|Ezra|Neh|Esth|Job|Psa|Prov|Eccl|Song|Isa|Jer|Lam|Eze|Dan|Hos|Joel|Amos|Oba|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phi|Col|Thess|Tim|Tit|Phile|Heb|James|Pet|Jude|Rev|Gên|Êxo|Lev|Núm|Deu|Jos|Juí|Rut|Sam|Reis|Crô|Esd|Nee|Est|Jó|Sal|Pro|Ecl|Cân|Isa|Jer|Lam|Eze|Dan|Osé|Joe|Amó|Oba|Jon|Miq|Nau|Hab|Sof|Age|Zac|Mal|Mat|Mar|Luc|João|Ato|Rom|Cor|Gál|Efi|Fil|Col|Tes|Tim|Tit|Fil|Heb|Tia|Ped|Jud|Apo)[a-z]*';
    // Palavras usadas em citações por extenso: "capítulo"/"cap." e "versículo"/"verso"/"v."
    const CHAPTER_WORD = '(?:cap(?:í|i)tulo|cap\\.)';
    const VERSE_WORD = '(?:vers(?:í|i)culo|verso|v\\.)';
    // Formas cobertas: "Gênesis 10:5" | "Gênesis capítulo 10 verso 5" | "capítulo 10 de Gênesis, verso 5"
    // | "Gênesis capítulo 3. 16." (número do versículo sem a palavra "verso")
    const REF_COMPACT = `${BIBLE_BOOKS}\\s*(?:${CHAPTER_WORD}\\s+)?\\d+\\s*[:.,]\\s*\\d+(?:-\\d+)?`;
    const REF_FORWARD = `${BIBLE_BOOKS}\\s+(?:${CHAPTER_WORD}\\s+)?\\d+\\s*[,.]?\\s*${VERSE_WORD}\\s*\\.?\\s*\\d+(?:-\\d+)?`;
    const REF_REVERSED = `${CHAPTER_WORD}\\s+\\d+\\s+de\\s+${BIBLE_BOOKS}\\s*[,.]?\\s*(?:${VERSE_WORD}\\s*\\.?\\s*)?\\d+(?:-\\d+)?`;
    // Ancorada no fim da string testada: só reconhece quando a citação acabou de se completar,
    // e permite pontuação sobrando depois do último número (ex: "Verso 8.")
    const tailBibleRegex = new RegExp(`(?:${REF_FORWARD}|${REF_REVERSED}|${REF_COMPACT})[.,]?$`, 'i');

    const fullText = pdfText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const words = fullText.split(' ');

    type Segment = { word: string; isBible: boolean };
    let currentLineSegments: Segment[] = [];
    let currentLineWidth = 0;
    let linesSinceParagraphStart = 0;
    let isInsideBibleBlock = false;
    // Uma palavra termina a frase, não a linha (a quebra por largura raramente coincide com o fim da frase)
    const endsSentence = (word: string) => /[.!?][”"'’)\]]*$/.test(word);

    const setStyle = (isBible: boolean) => doc.setFont(fontFamily, isBible ? 'bolditalic' : 'normal');
    setStyle(false);
    const spaceWidth = doc.getTextWidth(' ');

    // Renderiza cada palavra individualmente (com sua própria fonte), em vez da linha
    // inteira de uma vez só — do contrário, toda a linha herdava a última fonte ativa.
    const flushLine = (segments: Segment[], isParaEnd: boolean) => {
      const curAlign = (alignment === 'justify' && !isParaEnd) ? 'justify' : (alignment === 'justify' ? 'left' : alignment);

      let lineWidth = 0;
      segments.forEach((seg, i) => {
        setStyle(seg.isBible);
        lineWidth += doc.getTextWidth(seg.word);
        if (i < segments.length - 1) lineWidth += spaceWidth;
      });

      let x = margin;
      let gapExtra = 0;
      if (curAlign === 'center') x = margin + (maxWidth - lineWidth) / 2;
      else if (curAlign === 'right') x = margin + (maxWidth - lineWidth);
      else if (curAlign === 'justify' && segments.length > 1) gapExtra = (maxWidth - lineWidth) / (segments.length - 1);

      segments.forEach((seg, i) => {
        setStyle(seg.isBible);
        doc.text(seg.word, x, y);
        x += doc.getTextWidth(seg.word) + (i < segments.length - 1 ? spaceWidth + gapExtra : 0);
      });

      y += (fontSize * lineSpacing) / doc.internal.scaleFactor;
      linesSinceParagraphStart++;

      if (isParaEnd) {
        y += paragraphSpacing / doc.internal.scaleFactor;
        linesSinceParagraphStart = 0;
      }

      if (y > 275) { // Evita sobrepor o rodapé
        doc.addPage();
        y = 30;
      }
    };

    words.forEach((word, index) => {
      if (word.includes('***')) {
        isInsideBibleBlock = !isInsideBibleBlock;
        word = word.replace(/\*\*\*/g, '');
      }

      const lineTextSoFar = currentLineSegments.map(s => s.word).join(' ');
      const testText = lineTextSoFar + (lineTextSoFar ? ' ' : '') + word;

      let isBible = isInsideBibleBlock;
      const match = testText.match(tailBibleRegex);
      if (match) {
        isBible = true;
        // Marca retroativamente as palavras anteriores que fazem parte desta mesma citação
        const matchedWordCount = match[0].trim().split(/\s+/).length;
        for (let k = 1; k < matchedWordCount; k++) {
          const idx = currentLineSegments.length - k;
          if (idx >= 0) currentLineSegments[idx].isBible = true;
        }
      }

      setStyle(isBible);
      const wordWidth = doc.getTextWidth(word);
      const addedWidth = (currentLineSegments.length > 0 ? spaceWidth : 0) + wordWidth;

      if (currentLineWidth + addedWidth > maxWidth && currentLineSegments.length > 0) {
        flushLine(currentLineSegments, false);
        currentLineSegments = [{ word, isBible }];
        currentLineWidth = wordWidth;
      } else {
        currentLineSegments.push({ word, isBible });
        currentLineWidth += addedWidth;
      }

      const isLastWord = index === words.length - 1;
      const reachedMinLines = linesSinceParagraphStart + 1 >= linesPerParagraph;

      if (isLastWord) {
        flushLine(currentLineSegments, true);
      } else if (endsSentence(word) && reachedMinLines) {
        // Força a quebra logo após a frase terminar, mesmo no meio da largura da linha
        flushLine(currentLineSegments, true);
        currentLineSegments = [];
        currentLineWidth = 0;
      }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        addPageDecorations(i, totalPages);
    }

    const formattedDate = formatDateForFilename(date);
    const filenameParts = [formattedDate, title || 'documento_traduzido'].filter(Boolean);
    const filenameBase = sanitizeFilename(filenameParts.join(' - '));
    doc.save(`${filenameBase}.pdf`);
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg border border-blue-600">
      <h2 className="text-2xl font-bold mb-6 text-white">Gerador de PDF</h2>

      <div className="mb-4">
        <label htmlFor="pdfText" className="block text-blue-200 text-sm font-semibold mb-2">
          Texto para PDF:
          <span className="ml-2 text-xs font-normal text-blue-300">(Dica: Referências bíblicas automáticas ou use *** para iniciar/terminar um bloco em Negrito+Itálico)</span>
        </label>
        <textarea
          id="pdfText"
          className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 resize-none placeholder-gray-400"
          value={pdfText}
          onChange={(e) => setPdfText(e.target.value)}
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="title" className="block text-blue-200 text-sm font-semibold mb-2">Título do PDF:</label>
          <input
            type="text"
            id="title"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-blue-200 text-sm font-semibold mb-2">Data <span className="font-normal text-blue-300">(aparece abaixo do título)</span>:</label>
          <input
            type="text"
            id="date"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="Ex: 04 de maio de 2025"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-blue-200 text-sm font-semibold mb-2">Local <span className="font-normal text-blue-300">(aparece ao lado da data)</span>:</label>
          <input
            type="text"
            id="location"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="Ex: Táriba, Venezuela"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fontFamily" className="block text-blue-200 text-sm font-semibold mb-2">Fonte:</label>
          <select
            id="fontFamily"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            <option value="helvetica">Helvetica</option>
            <option value="times">Times</option>
            <option value="courier">Courier</option>
          </select>
        </div>
        <div>
          <label htmlFor="fontSize" className="block text-blue-200 text-sm font-semibold mb-2">Tamanho da Fonte:</label>
          <input
            type="number"
            id="fontSize"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            min="8"
            max="36"
          />
        </div>
        <div>
          <label htmlFor="lineSpacing" className="block text-blue-200 text-sm font-semibold mb-2">Espaçamento entre Linhas:</label>
          <input
            type="number"
            id="lineSpacing"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(Number(e.target.value))}
            step="0.1"
            min="1"
            max="3"
          />
        </div>
        <div>
          <label htmlFor="paragraphSpacing" className="block text-blue-200 text-sm font-semibold mb-2">Espaçamento entre Parágrafos:</label>
          <input
            type="number"
            id="paragraphSpacing"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={paragraphSpacing}
            onChange={(e) => setParagraphSpacing(Number(e.target.value))}
            min="0"
            max="30"
          />
        </div>
        <div>
          <label htmlFor="alignment" className="block text-blue-200 text-sm font-semibold mb-2">Alinhamento:</label>
          <select
            id="alignment"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={alignment}
            onChange={(e) => setAlignment(e.target.value)}
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
            <option value="justify">Justificar</option>
          </select>
        </div>
        <div>
          <label htmlFor="wordsPerLine" className="block text-blue-200 text-sm font-semibold mb-2">Palavras por Linha:</label>
          <input
            type="number"
            id="wordsPerLine"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={wordsPerLine}
            onChange={(e) => setWordsPerLine(Number(e.target.value))}
            min="1"
            max="50"
          />
        </div>
        <div>
          <label htmlFor="linesPerParagraph" className="block text-blue-200 text-sm font-semibold mb-2">Linhas mínimas por Parágrafo <span className="font-normal text-blue-300">(quebra só no fim de uma frase)</span>:</label>
          <input
            type="number"
            id="linesPerParagraph"
            className="shadow-inner appearance-none border border-blue-700 rounded-lg w-full py-3 px-4 text-white bg-gray-600 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={linesPerParagraph}
            onChange={(e) => setLinesPerParagraph(Number(e.target.value))}
            min="1"
            max="50"
          />
        </div>
      </div>

      <button
        onClick={generatePdf}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 w-full transition duration-200 ease-in-out transform hover:scale-105"
      >
        Gerar PDF
      </button>
    </div>
  );
};

export default PdfGenerator;
