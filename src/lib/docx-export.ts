import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { SalesPack } from '@/types/sales-pack';

// Parse markdown-like content into docx paragraphs
function parseContentToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }
    
    // H1 - Main title
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: trimmedLine.slice(2), bold: true, size: 32 })],
        spacing: { before: 400, after: 200 },
      }));
    }
    // H2 - Section title
    else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmedLine.slice(3), bold: true, size: 28 })],
        spacing: { before: 300, after: 150 },
      }));
    }
    // H3 - Subsection
    else if (trimmedLine.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: trimmedLine.slice(4), bold: true, size: 24 })],
        spacing: { before: 200, after: 100 },
      }));
    }
    // Bullet list
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineFormatting(trimmedLine.slice(2)),
        spacing: { before: 50, after: 50 },
      }));
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const text = trimmedLine.replace(/^\d+\.\s/, '');
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineFormatting(text),
        spacing: { before: 50, after: 50 },
      }));
    }
    // Regular paragraph
    else {
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(trimmedLine),
        spacing: { before: 100, after: 100 },
      }));
    }
  }
  
  return paragraphs;
}

// Parse inline formatting (**bold**, etc.)
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index), size: 22 }));
    }
    // Add bold text
    runs.push(new TextRun({ text: match[1], bold: true, size: 22 }));
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), size: 22 }));
  }
  
  if (runs.length === 0) {
    runs.push(new TextRun({ text, size: 22 }));
  }
  
  return runs;
}

// Create pricing section
function createPricingSection(salesPack: SalesPack): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  if (salesPack.pricing.length === 0) return paragraphs;
  
  paragraphs.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: 'Options de Tarification', bold: true, size: 32 })],
    spacing: { before: 600, after: 300 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: '3b82f6' } },
  }));
  
  for (const pkg of salesPack.pricing) {
    const isRecommended = pkg.tier === 'recommended';
    
    // Package name
    paragraphs.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ 
          text: `${pkg.name}${isRecommended ? ' ⭐ RECOMMANDÉ' : ''}`, 
          bold: true, 
          size: 26,
          color: isRecommended ? '3b82f6' : '000000'
        })
      ],
      spacing: { before: 300, after: 100 },
    }));
    
    // Price
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `${pkg.price}€`, bold: true, size: 28 })],
      spacing: { after: 100 },
    }));
    
    // Description
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: pkg.description, italics: true, size: 20, color: '6b7280' })],
      spacing: { after: 150 },
    }));
    
    // Features
    for (const feature of pkg.features) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: feature, size: 20 })],
        spacing: { before: 30, after: 30 },
      }));
    }
  }
  
  return paragraphs;
}

export async function exportToWord(salesPack: SalesPack, clientName: string): Promise<void> {
  const proposalParagraphs = parseContentToParagraphs(salesPack.proposal.content);
  const pricingParagraphs = createPricingSection(salesPack);
  
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        ...proposalParagraphs,
        ...pricingParagraphs,
      ],
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  const fileName = `Proposition_${clientName.replace(/\s+/g, '_') || 'Client'}_${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(blob, fileName);
}
