import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface ResourceViewerProps {
  resource: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResourceViewer = ({ resource, open, onOpenChange }: ResourceViewerProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!resource) {
        setUrl(null);
        return;
      }
      if (resource.external_link) {
        setUrl(resource.external_link);
      } else if (resource.file_path) {
        const { data } = await supabase.storage
          .from("resources")
          .createSignedUrl(resource.file_path, 60 * 10);
        setUrl(data?.signedUrl || null);
      } else {
        setUrl(null);
      }
    };
    load();
  }, [resource]);

  const renderContent = () => {
    if (!url) return <div className="text-sm text-muted-foreground">No preview available.</div>;

    const isVideoType = (resource?.resource_type === "video");
    const isVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

    // Handle YouTube links: convert watch URL to embed
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i);
    if (!isVideoFile && ytMatch) {
      const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      return (
        <iframe
          src={embedUrl}
          title={resource?.title || "Video"}
          className="w-full h-[70vh] rounded border"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }

    if (isVideoType || isVideoFile) {
      return (
        <video controls className="w-full h-[70vh] rounded border" src={url} />
      );
    }

    // Default: iframe preview (PDFs, web pages, etc.)
    return (
      <iframe
        src={url}
        title={resource?.title || "Resource"}
        className="w-full h-[70vh] rounded border"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{resource?.title || "Resource"}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default ResourceViewer;

