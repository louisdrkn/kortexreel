import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with correct URL for browser
const PDFJS_CDN_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_URL;

export interface ExtractionResult {
  text: string;
  charCount: number;
  pageCount: number;
}

export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .filter(Boolean)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    const trimmedText = fullText.trim();
    
    return {
      text: trimmedText,
      charCount: trimmedText.length,
      pageCount: pdf.numPages,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Impossible de lire le PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}

export async function extractTextFromMultiplePDFs(files: File[]): Promise<ExtractionResult> {
  const results = await Promise.all(files.map(extractTextFromPDF));
  const combinedText = results.map(r => r.text).join('\n\n---\n\n');
  const totalPages = results.reduce((sum, r) => sum + r.pageCount, 0);
  
  return {
    text: combinedText,
    charCount: combinedText.length,
    pageCount: totalPages,
  };
}
