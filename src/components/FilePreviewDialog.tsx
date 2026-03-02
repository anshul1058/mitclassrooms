import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X, FileText } from "lucide-react";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: { name: string; url: string } | null;
}

const FilePreviewDialog = ({ open, onOpenChange, file }: FilePreviewDialogProps) => {
  const [iframeError, setIframeError] = useState(false);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "webm", "ogg", "mov"].includes(ext);
  const isAudio = ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext);
  const canPreview = isImage || isPdf || isVideo || isAudio;

  // Google Docs Viewer for non-native formats (works on mobile too)
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(file.url)}`;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold truncate pr-4">
              {file.name}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-1.5 text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center">
          {isImage && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-full object-contain p-4"
              onError={() => setIframeError(true)}
            />
          )}

          {isPdf && !iframeError && (
            <iframe
              src={file.url}
              className="w-full h-full border-0"
              title={file.name}
              onError={() => setIframeError(true)}
            />
          )}

          {isVideo && (
            <video
              controls
              className="max-w-full max-h-full"
              src={file.url}
              preload="metadata"
            >
              Your browser does not support video playback.
            </video>
          )}

          {isAudio && (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <p className="text-sm font-medium">{file.name}</p>
              <audio controls src={file.url} preload="metadata" className="w-full max-w-md" />
            </div>
          )}

          {/* Non-native formats: use Google Docs viewer */}
          {!canPreview && !iframeError && (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-0"
              title={file.name}
              onError={() => setIframeError(true)}
            />
          )}

          {/* Fallback when preview fails or PDF fails on mobile */}
          {iframeError && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="gap-1.5">
                  <Download className="w-4 h-4" /> Download File
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(file.url, "_blank")}
                  className="gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Browser
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;
