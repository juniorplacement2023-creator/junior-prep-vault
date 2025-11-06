import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileText, Video, Link as LinkIcon, Bookmark, BookmarkCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import ResourceViewer from "@/components/ResourceViewer";
import { format } from "date-fns";

const CompanyDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerResource, setViewerResource] = useState<any | null>(null);

  useEffect(() => {
    if (id) {
      fetchCompanyData();
    }
  }, [id]);

  const fetchCompanyData = async () => {
    setLoading(true);
    
    // Fetch company details
    const { data: companyData } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();
    
    // Fetch resources
    const { data: resourcesData } = await supabase
      .from("resources")
      .select(`
        *,
        profiles:uploaded_by (full_name)
      `)
      .eq("company_id", id)
      .order("created_at", { ascending: false });
    
    // Fetch user bookmarks if logged in
    if (user) {
      const { data: bookmarksData } = await supabase
        .from("bookmarks")
        .select("resource_id")
        .eq("user_id", user.id);
      
      setBookmarks(new Set(bookmarksData?.map(b => b.resource_id) || []));
    }
    
    setCompany(companyData);
    setResources(resourcesData || []);
    setLoading(false);
  };

  const toggleBookmark = async (resourceId: string) => {
    if (!user) {
      toast.error("Please sign in to bookmark resources");
      return;
    }

    const isBookmarked = bookmarks.has(resourceId);
    
    if (isBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resourceId);
      
      if (!error) {
        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        toast.success("Bookmark removed");
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ user_id: user.id, resource_id: resourceId });
      
      if (!error) {
        setBookmarks(prev => new Set(prev).add(resourceId));
        toast.success("Resource bookmarked");
      }
    }
  };

  const handleDownload = async (resource: any) => {
    // Track download event
    await supabase.from("resource_analytics").insert({
      resource_id: resource.id,
      user_id: user?.id,
      action: "download",
    });

    // Increment download count
    await supabase
      .from("resources")
      .update({ download_count: (resource.download_count || 0) + 1 })
      .eq("id", resource.id);

    // Open link
    if (resource.external_link) {
      window.open(resource.external_link, "_blank");
    } else if (resource.file_path) {
      const { data } = await supabase.storage
        .from("resources")
        .createSignedUrl(resource.file_path, 60);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    }
    toast.success("Opening resource...");
  };

  const handleViewInSite = async (resource: any) => {
    // Track view event
    await supabase.from("resource_analytics").insert({
      resource_id: resource.id,
      user_id: user?.id,
      action: "view",
    });
    setViewerResource(resource);
    setViewerOpen(true);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "link":
        return <LinkIcon className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const filteredResources = selectedRound === "all" 
    ? resources 
    : resources.filter(r => r.round_type === selectedRound);

  const rounds = ["all", "aptitude", "coding", "technical", "hr", "general"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="text-center py-12">
              <p>Company not found</p>
              <Link to="/companies">
                <Button variant="outline" className="mt-4">Back to Companies</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Link to="/companies">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Button>
          </Link>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl">{company.name}</CardTitle>
              <CardDescription className="text-lg">
                {company.description || "Placement preparation resources"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs value={selectedRound} onValueChange={setSelectedRound}>
            <TabsList className="mb-6">
              {rounds.map((round) => (
                <TabsTrigger key={round} value={round} className="capitalize">
                  {round}
                </TabsTrigger>
              ))}
            </TabsList>

            {filteredResources.length > 0 ? (
              <div className="space-y-4">
                {filteredResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getResourceIcon(resource.resource_type)}
                            <CardTitle className="text-xl">{resource.title}</CardTitle>
                          </div>
                          <CardDescription className="text-justify">{resource.description}</CardDescription>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="capitalize">
                              {resource.round_type}
                            </Badge>
                            <Badge variant="secondary" className="capitalize">
                              {resource.resource_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-2">
                              {resource.download_count || 0} downloads
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Uploaded by {resource.profiles?.full_name || "Mentor"} • {format(new Date(resource.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleBookmark(resource.id)}
                          >
                            {bookmarks.has(resource.id) ? (
                              <BookmarkCheck className="h-5 w-5 text-accent" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </Button>
                          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleViewInSite(resource)}>
                            Preview
                          </Button>
                          <Button onClick={() => handleDownload(resource)} className="gap-2 w-full sm:w-auto">
                            <Download className="h-4 w-4" />
                            Open
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No resources found</h3>
                  <p className="text-muted-foreground">
                    {selectedRound === "all"
                      ? "No resources have been uploaded for this company yet"
                      : `No resources for ${selectedRound} round yet`}
                  </p>
                </CardContent>
              </Card>
            )}
          </Tabs>
        </div>
      </div>
    </div>
    <ResourceViewer resource={viewerResource} open={viewerOpen} onOpenChange={setViewerOpen} />
    </>
  );
};

export default CompanyDetail;