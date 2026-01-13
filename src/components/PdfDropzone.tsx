import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractTextFromPDF, ExtractionResult } from '@/lib/pdf-extractor';
import { toast } from '@/hooks/use-toast';

interface PdfDropzoneProps {
  onTextExtracted: (text: string) => void;
  className?: string;
}

interface UploadedFile {
  name: string;
  status: 'uploading' | 'success' | 'error';
  charCount?: number;
  pageCount?: number;
}

export function PdfDropzone({ onTextExtracted, className }: PdfDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) {
      toast({
        title: "Format non supporté",
        description: "Veuillez uploader des fichiers PDF uniquement.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const newFiles: UploadedFile[] = pdfFiles.map((f) => ({
      name: f.name,
      status: 'uploading' as const,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);

    try {
      const extractedResults: ExtractionResult[] = [];

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        try {
          const result = await extractTextFromPDF(file);
          extractedResults.push(result);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.name === file.name 
                ? { ...f, status: 'success', charCount: result.charCount, pageCount: result.pageCount } 
                : f
            )
          );
        } catch (err) {
          console.error('Error extracting PDF:', err);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.name === file.name ? { ...f, status: 'error' } : f
            )
          );
          toast({
            title: `Erreur : ${file.name}`,
            description: err instanceof Error ? err.message : "Impossible de lire le PDF",
            variant: "destructive",
          });
        }
      }

      if (extractedResults.length > 0) {
        const combinedText = extractedResults.map(r => r.text).join('\n\n---\n\n');
        const totalChars = combinedText.length;
        const totalPages = extractedResults.reduce((sum, r) => sum + r.pageCount, 0);
        
        onTextExtracted(combinedText);
        
        toast({
          title: "Contenu extrait avec succès ✨",
          description: `${totalChars.toLocaleString('fr-FR')} caractères extraits de ${totalPages} page${totalPages > 1 ? 's' : ''}.`,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onTextExtracted]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-all cursor-pointer',
          'flex flex-col items-center justify-center gap-3 text-center',
          'p-8 min-h-[140px]',
          isDragging
            ? 'border-accent bg-accent/5 scale-[1.01]'
            : 'border-border hover:border-accent/50 hover:bg-muted/30',
          isProcessing && 'pointer-events-none'
        )}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        <div className={cn(
          'p-3 rounded-full transition-all',
          isDragging ? 'bg-accent/10 scale-110' : 'bg-muted',
          isProcessing && 'animate-pulse'
        )}>
          {isProcessing ? (
            <Loader2 className="h-6 w-6 text-accent animate-spin" />
          ) : (
            <Upload className={cn(
              'h-6 w-6 transition-colors',
              isDragging ? 'text-accent' : 'text-muted-foreground'
            )} />
          )}
        </div>
        <div>
          <p className="font-medium text-foreground">
            {isProcessing ? 'Analyse des documents en cours...' : 'Glissez vos PDF ici'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isProcessing 
              ? 'Extraction du texte...' 
              : 'Anciennes propales, devis gagnants, etc.'
            }
          </p>
        </div>
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div
              key={file.name}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                file.status === 'success' 
                  ? "bg-success/5 border border-success/20" 
                  : file.status === 'error'
                  ? "bg-destructive/5 border border-destructive/20"
                  : "bg-muted/50"
              )}
            >
              <FileText className={cn(
                "h-5 w-5",
                file.status === 'success' ? 'text-success' : 'text-muted-foreground'
              )} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{file.name}</span>
                {file.status === 'success' && file.charCount && (
                  <span className="text-xs text-muted-foreground">
                    {file.charCount.toLocaleString('fr-FR')} caractères • {file.pageCount} page{(file.pageCount ?? 0) > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {file.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              )}
              {file.status === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              {file.status === 'error' && (
                <span className="text-xs text-destructive font-medium">Erreur</span>
              )}
              <button
                onClick={() => removeFile(file.name)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}