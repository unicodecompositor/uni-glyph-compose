import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertCircle, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocale } from '@/hooks/useLocale';

interface ImportExportPanelProps {
  code: string;
  onImport: (content: string) => void;
  hasErrors: boolean;
  errorMessage?: string;
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  code,
  onImport,
  hasErrors,
  errorMessage,
}) => {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showErrorDialog, setShowErrorDialog] = React.useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Strip UNICOMP header if present
        let cleanContent = content;
        if (cleanContent.startsWith('# UNICOMP v')) {
          const lines = cleanContent.split('\n');
          let startIdx = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().startsWith('# ')) {
              startIdx = i + 1;
            } else {
              break;
            }
          }
          cleanContent = lines.slice(startIdx).join('\n').trim();
        }
        onImport(cleanContent);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (hasErrors) {
      setShowErrorDialog(true);
      return;
    }

    const header = '# UNICOMP v1.0\n';
    const fileContent = header + code;
    const blob = new Blob([fileContent], { type: 'application/x-unicomp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'composition.unicomp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.unicomp"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={handleImportClick} className="flex-1 text-xs h-8">
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          {t.import}
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 text-xs h-8">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          .unicomp
        </Button>
      </div>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {t.errorInRule}
            </DialogTitle>
            <DialogDescription>{t.fixErrorFirst}</DialogDescription>
          </DialogHeader>
          
          {errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { if (errorMessage) navigator.clipboard.writeText(errorMessage); }}>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              {t.copyError}
            </Button>
            <Button size="sm" onClick={() => setShowErrorDialog(false)}>
              {t.ok}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
