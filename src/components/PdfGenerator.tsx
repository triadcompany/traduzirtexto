import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';

interface PdfGeneratorProps {
  initialText: string;
}

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

    // Data abaixo do título (mesmo tamanho do texto)
    if (date) {
      doc.setFontSize(fontSize);
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(date, 105, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += (fontSize * 1.5) / doc.internal.scaleFactor + 4;
    } else {
      y += 7;
    }

    doc.setFontSize(fontSize);
    doc.setFont(fontFamily, 'normal');

    // Regex melhorada: suporte a livros com números (1 João), abreviações e intervalos de versículos
    const BIBLE_BOOKS = '(?:[123]\\s?)?(?:Gen|Exo|Lev|Num|Deu|Jos|Judg|Ruth|Sam|Kings|Chron|Ezra|Neh|Esth|Job|Psa|Prov|Eccl|Song|Isa|Jer|Lam|Eze|Dan|Hos|Joel|Amos|Oba|Jon|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phi|Col|Thess|Tim|Tit|Phile|Heb|James|Pet|Jude|Rev|Gên|Êxo|Lev|Núm|Deu|Jos|Juí|Rut|Sam|Reis|Crô|Esd|Nee|Est|Jó|Sal|Pro|Ecl|Cân|Isa|Jer|Lam|Eze|Dan|Osé|Joe|Amó|Oba|Jon|Miq|Nau|Hab|Sof|Age|Zac|Mal|Mat|Mar|Luc|João|Ato|Rom|Cor|Gál|Efi|Fil|Col|Tes|Tim|Tit|Fil|Heb|Tia|Ped|Jud|Apo)[a-z]*';
    const bibleRegex = new RegExp(`\\b${BIBLE_BOOKS}\\s\\d+[:.,]\\d+(?:-\\d+)?\\b`, 'i');

    const fullText = pdfText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const words = fullText.split(' ');
    
    let currentLine = '';
    let globalLineIndex = 0;
    let isInsideBibleBlock = false;

    words.forEach((word, index) => {
      if (word.includes('***')) {
        isInsideBibleBlock = !isInsideBibleBlock;
        word = word.replace(/\*\*\*/g, '');
      }

      const hasBibleRef = bibleRegex.test(word) || bibleRegex.test(currentLine + ' ' + word);
      const isBibleStyle = hasBibleRef || isInsideBibleBlock;
      doc.setFont(fontFamily, isBibleStyle ? 'bolditalic' : 'normal');

      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testLineWidth = doc.getTextWidth(testLine);

      if (testLineWidth > maxWidth && currentLine !== '') {
        const isLastLineOfPara = ((globalLineIndex + 1) % linesPerParagraph === 0);
        const curAlign = (alignment === 'justify' && !isLastLineOfPara) ? 'justify' : (alignment === 'justify' ? 'left' : alignment);
        
        doc.text(currentLine, margin, y, { 
          align: curAlign as any,
          maxWidth: curAlign === 'justify' ? maxWidth : undefined
        });

        y += (fontSize * lineSpacing) / doc.internal.scaleFactor;
        globalLineIndex++;

        if (isLastLineOfPara) {
          y += paragraphSpacing / doc.internal.scaleFactor;
        }

        if (y > 275) { // Evita sobrepor o rodapé
          doc.addPage();
          y = 30;
        }

        currentLine = word;
      } else {
        currentLine = testLine;
      }

      if (index === words.length - 1) {
        doc.text(currentLine, margin, y, { align: 'left' });
      }
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        addPageDecorations(i, totalPages);
    }

    doc.save('documento_traduzido.pdf');
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
          <label htmlFor="linesPerParagraph" className="block text-blue-200 text-sm font-semibold mb-2">Linhas por Parágrafo:</label>
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
