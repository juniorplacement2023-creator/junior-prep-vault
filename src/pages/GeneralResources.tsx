import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, FileText, Download, ExternalLink, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ResourceViewer from "@/components/ResourceViewer";

interface FolderStructure {
  [key: string]: any[];
}

const GeneralResources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [folders, setFolders] = useState<FolderStructure>({});
  const [currentPath, setCurrentPath] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerResource, setViewerResource] = useState<any | null>(null);

  useEffect(() => {
    fetchGeneralResources();
  }, []);

  const fetchGeneralResources = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("resources")
      .select("*")
      .is("company_id", null)
      .order("folder_path", { ascending: true });

    if (data) {
      setResources(data);
      organizeFolders(data);
    }
    setLoading(false);
  };

  const organizeFolders = (data: any[]) => {
    const folderMap: FolderStructure = {};
    
    data.forEach((resource) => {
      const path = resource.folder_path || "root";
      if (!folderMap[path]) {
        folderMap[path] = [];
      }
      folderMap[path].push(resource);
    });

    setFolders(folderMap);
  };

  const handleDownload = async (resource: any) => {
    if (resource.external_link) {
      window.open(resource.external_link, "_blank");
    } else if (resource.file_path) {
      const { data } = await supabase.storage
        .from("resources")
        .createSignedUrl(resource.file_path, 60);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
        
        // Track download
        await supabase.from("resource_analytics").insert({
          resource_id: resource.id,
          user_id: user?.id,
          action: "download"
        });

        // Increment download count
        await supabase
          .from("resources")
          .update({ download_count: (resource.download_count || 0) + 1 })
          .eq("id", resource.id);
      }
    }
  };

  const handleViewInSite = async (resource: any) => {
    await supabase.from("resource_analytics").insert({
      resource_id: resource.id,
      user_id: user?.id,
      action: "view",
    });
    setViewerResource(resource);
    setViewerOpen(true);
  };

  const handleBookmark = async (resourceId: string) => {
    if (!user) {
      toast.error("Please sign in to bookmark resources");
      return;
    }

    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, resource_id: resourceId });

    if (error) {
      if (error.code === "23505") {
        toast.error("Already bookmarked");
      } else {
        toast.error("Failed to bookmark");
      }
    } else {
      toast.success("Bookmarked!");
      await supabase.from("resource_analytics").insert({
        resource_id: resourceId,
        user_id: user.id,
        action: "bookmark"
      });
    }
  };

  const getFolderHierarchy = () => {
    const folderSet = new Set<string>();
    resources.forEach((r) => {
      if (r.folder_path) {
        const parts = r.folder_path.split("/");
        parts.forEach((_, index) => {
          folderSet.add(parts.slice(0, index + 1).join("/"));
        });
      }
    });
    return Array.from(folderSet).sort();
  };

  const currentFolders = getFolderHierarchy().filter((f) =>
    currentPath ? f.startsWith(currentPath + "/") && f.split("/").length === currentPath.split("/").length + 1 : f.split("/").length === 1
  );

  const currentResources = folders[currentPath || "root"] || [];

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">General Resources</h1>
            <p className="text-muted-foreground">
              Common study materials and preparation resources for all placements
            </p>
          </div>

          {/* Breadcrumb */}
          {currentPath && (
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentPath("")}
                className="mb-2"
              >
                ← Back to Root
              </Button>
              <p className="text-sm text-muted-foreground">
                Current: {currentPath || "Root"}
              </p>
            </div>
          )}

          {/* Folders */}
          {currentFolders.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {currentFolders.map((folderPath) => (
                <Card
                  key={folderPath}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setCurrentPath(folderPath)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      {folderPath.split("/").pop()}
                    </CardTitle>
                    <CardDescription>
                      {folders[folderPath]?.length || 0} resources
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          {/* Resources */}
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : currentResources.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {currentResources.map((resource) => (
                <Card key={resource.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {resource.title}
                        </CardTitle>
                        <CardDescription className="mt-2 text-justify">
                          {resource.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span>Type: {resource.resource_type}</span>
                          <span>•</span>
                          <span>Category: {resource.category}</span>
                          <span>•</span>
                          <span>{resource.download_count || 0} downloads</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleDownload(resource)}
                        className="gap-2 w-full sm:w-auto"
                      >
                        {resource.external_link ? (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            Open Link
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleViewInSite(resource)}
                        className="w-full sm:w-auto"
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleBookmark(resource.id)}
                        className="gap-2 w-full sm:w-auto"
                      >
                        <Bookmark className="h-4 w-4" />
                        Bookmark
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No resources in this folder yet
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    <ResourceViewer resource={viewerResource} open={viewerOpen} onOpenChange={setViewerOpen} />
    </>
  );
};

export default GeneralResources;