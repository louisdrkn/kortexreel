import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, Trash2, RefreshCw, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useKnowledgeBase, KnowledgeDocument } from '@/hooks/useKnowledgeBase';
import { cn } from '@/lib/utils';

const DOC_TYPES = {
  pitch_deck: { label: 'Pitch Deck', color: 'bg-violet-500/20 text-violet-400' },
  price_list: { label: 'Grille Tarifaire', color: 'bg-emerald-500/20 text-emerald-400' },
  case_study: { label: 'Case Study', color: 'bg-blue-500/20 text-blue-400' },
  proposal: { label: 'Propale Gagnée', color: 'bg-amber-500/20 text-amber-400' },
  other: { label: 'Autre', color: 'bg-slate-500/20 text-slate-400' },
};

const STATUS_CONFIG = {
  pending: { icon: Loader2, label: 'En attente', color: 'text-slate-400', animate: false },
  processing: { icon: Loader2, label: 'Analyse...', color: 'text-violet-400', animate: true },
  completed: { icon: CheckCircle2, label: 'Analysé', color: 'text-emerald-400', animate: false },
  failed: { icon: XCircle, label: 'Échec', color: 'text-red-400', animate: false },
};

interface KnowledgeVaultProps {
  className?: string;
}

export function KnowledgeVault({ className }: KnowledgeVaultProps) {
  const { documents, isLoading, isUploading, uploadDocument, deleteDocument, refreshDocument } = useKnowledgeBase();
  const [selectedDocType, setSelectedDocType] = useState<string>('pitch_deck');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files?.length) return;
    
    for (const file of Array.from(files)) {
      await uploadDocument(file, selectedDocType as any);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const renderDocumentCard = (doc: KnowledgeDocument) => {
    const status = STATUS_CONFIG[doc.processing_status];
    const docType = DOC_TYPES[doc.doc_type as keyof typeof DOC_TYPES] || DOC_TYPES.other;
    const StatusIcon = status.icon;

    return (
      <div
        key={doc.id}
        className="group flex items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
      >
        <div className="flex-shrink-0 p-2 rounded-lg bg-slate-800">
          <FileText className="h-5 w-5 text-slate-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-white truncate">{doc.file_name}</span>
            <Badge variant="outline" className={cn('text-xs', docType.color)}>
              {docType.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <StatusIcon className={cn('h-3.5 w-3.5', status.color, status.animate && 'animate-spin')} />
            <span className={status.color}>{status.label}</span>
          </div>
          
          {doc.processing_status === 'completed' && doc.summary && (
            <p className="mt-2 text-xs text-slate-400 line-clamp-2">{doc.summary}</p>
          )}
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {doc.processing_status === 'processing' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refreshDocument(doc.id)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => deleteDocument(doc.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn('bg-slate-950 border-slate-800', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">Knowledge Vault</CardTitle>
            <CardDescription className="text-slate-400">
              Uploadez vos documents commerciaux pour entraîner vos agents IA
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Doc Type Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Type de document :</span>
          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
            isDragging 
              ? 'border-violet-500 bg-violet-500/10' 
              : 'border-slate-700 hover:border-slate-600 bg-slate-900/30',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
              <p className="text-sm text-slate-400">Upload en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-slate-800">
                <Upload className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Glissez vos présentations ici
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF ou PPTX • 50MB max
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Keynote User Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <FileText className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80">
            <span className="font-medium text-amber-300">Utilisateurs Keynote :</span> Veuillez exporter votre présentation en PDF pour garantir une analyse à 100%.
          </p>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {documents.map(renderDocumentCard)}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun document uploadé</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
