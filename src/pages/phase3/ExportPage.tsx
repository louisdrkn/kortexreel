import { useState } from "react";
import { Download, FileText, File, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ExportPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [exported, setExported] = useState<string[]>([]);

  const handleExport = async (format: "pdf" | "docx") => {
    setExporting(format);
    
    // Simulate export
    await new Promise(r => setTimeout(r, 2000));
    
    setExporting(null);
    setExported(prev => [...prev, format]);
    toast({ 
      title: "Export réussi", 
      description: `Document exporté en ${format.toUpperCase()}` 
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10">
            <Download className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Export</h1>
            <p className="text-muted-foreground">Téléchargez votre proposition</p>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* PDF Export */}
          <Card className="border-border shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                  <FileText className="h-6 w-6 text-red-500" />
                </div>
                PDF
              </CardTitle>
              <CardDescription>
                Format universel, idéal pour l'envoi par email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
              >
                {exporting === "pdf" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Export en cours...
                  </>
                ) : exported.includes("pdf") ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                    Télécharger à nouveau
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter en PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* DOCX Export */}
          <Card className="border-border shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <File className="h-6 w-6 text-blue-500" />
                </div>
                Word
              </CardTitle>
              <CardDescription>
                Format éditable pour les retouches finales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleExport("docx")}
                disabled={exporting !== null}
              >
                {exporting === "docx" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Export en cours...
                  </>
                ) : exported.includes("docx") ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                    Télécharger à nouveau
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter en Word
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Conseils avant envoi</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Relisez une dernière fois le document
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Vérifiez les montants et les dates
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Personnalisez les touches finales si nécessaire
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Utilisez le format Word pour des modifications importantes
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
