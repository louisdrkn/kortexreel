import { Save, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface SaveButtonProps {
  onSave: () => Promise<void>;
  isSaving?: boolean;
  className?: string;
}

export function SaveButton({ onSave, isSaving: externalSaving, className }: SaveButtonProps) {
  const [internalSaving, setInternalSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isSaving = externalSaving || internalSaving;

  const handleSave = async () => {
    setInternalSaving(true);
    try {
      await onSave();
      setShowSuccess(true);
    } finally {
      setInternalSaving(false);
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  return (
    <Button
      onClick={handleSave}
      disabled={isSaving}
      className={className}
      variant={showSuccess ? "outline" : "default"}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Enregistrement...
        </>
      ) : showSuccess ? (
        <>
          <Check className="h-4 w-4 mr-2 text-emerald-500" />
          Enregistré
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </>
      )}
    </Button>
  );
}
