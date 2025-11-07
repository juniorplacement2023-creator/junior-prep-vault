import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Plus, FileText, Trash2, Building2, TrendingUp, Download, Eye, Bookmark, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const MentorDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalResources: 0,
    totalDownloads: 0,
    totalViews: 0,
    totalBookmarks: 0,
    topResources: [],
    recentActivity: [],
    downloadsByResource: {}
  });
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDesc, setNewCompanyDesc] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("general");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceType, setResourceType] = useState("pdf");
  const [roundType, setRoundType] = useState("aptitude");
  const [category, setCategory] = useState("general");
  const [folderPath, setFolderPath] = useState("");
  const [externalLink, setExternalLink] = useState("");
  // Edit resource dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRound, setEditRound] = useState("general");
  const [editType, setEditType] = useState("pdf");
  const [editExternalLink, setEditExternalLink] = useState("");

  // Announcement form
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (userRole !== "mentor" && userRole !== "admin"))) {
      toast.error("Access denied. Mentor access required.");
      navigate("/");
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user && (userRole === "mentor" || userRole === "admin")) {
      fetchData();
      fetchAnalytics();
    }
  }, [user, userRole]);

  const fetchData = async () => {
    const { data: companiesData } = await supabase.from("companies").select("*").order("name");
    const { data: resourcesData } = await supabase
      .from("resources")
      .select("*, companies(name)")
      .order("created_at", { ascending: false });

    const { data: announcementsData } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    setCompanies(companiesData || []);
    setResources(resourcesData || []);
    setAnnouncements(announcementsData || []);
  };

  const fetchAnalytics = async () => {
    // Get total resources count
    const { count: totalResources } = await supabase
      .from("resources")
      .select("*", { count: "exact", head: true });

    // Get download stats
    const { data: downloadData } = await supabase
      .from("resource_analytics")
      .select("id")
      .eq("action", "download");

    // Get view stats
    const { data: viewData } = await supabase
      .from("resource_analytics")
      .select("id")
      .eq("action", "view");

    // Get bookmark stats
    const { data: bookmarkData } = await supabase
      .from("bookmarks")
      .select("id");

    // Build top resources by effective download count (analytics-based, fallback to resource.download_count)
    const { data: downloadRows } = await supabase
      .from("resource_analytics")
      .select("resource_id")
      .eq("action", "download");

    const downloadCountByResource: Record<string, number> = {};
    (downloadRows || []).forEach((r: any) => {
      const key = r.resource_id as string;
      downloadCountByResource[key] = (downloadCountByResource[key] || 0) + 1;
    });

    const { data: allResources } = await supabase
      .from("resources")
      .select("id, title, round_type, download_count, companies(name)");

    const sortedTop = (allResources || [])
      .map((r: any) => ({
        ...r,
        derived_downloads: downloadCountByResource[r.id] ?? r.download_count ?? 0,
      }))
      .sort((a: any, b: any) => (b.derived_downloads || 0) - (a.derived_downloads || 0))
      .slice(0, 5);

    setAnalytics({
      totalResources: totalResources || 0,
      totalDownloads: downloadData?.length || 0,
      totalViews: viewData?.length || 0,
      totalBookmarks: bookmarkData?.length || 0,
      topResources: sortedTop || [],
      downloadsByResource: downloadCountByResource,
    });
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    const { error } = await supabase
      .from("companies")
      .insert({ name: newCompanyName, description: newCompanyDesc, is_featured: true });

    if (error) {
      toast.error("Failed to add company");
    } else {
      toast.success("Company added successfully");
      setNewCompanyName("");
      setNewCompanyDesc("");
      fetchData();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Are you sure? This will delete all resources for this company.")) return;
    
    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete company");
    } else {
      toast.success("Company deleted");
      fetchData();
    }
  };

  const handleUploadResource = async () => {
    if (!resourceTitle.trim()) {
      toast.error("Please fill in the title");
      return;
    }

    if (selectedCompany !== "general" && !selectedCompany) {
      toast.error("Please select a company or choose General Resources");
      return;
    }

    if (!file && !externalLink.trim()) {
      toast.error("Please provide either a file or external link");
      return;
    }

    setUploading(true);

    try {
      let filePath = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        filePath = fileName;
      }

      // Insert resource record
      const { error } = await supabase.from("resources").insert({
        company_id: selectedCompany === "general" ? null : selectedCompany,
        title: resourceTitle,
        description: resourceDesc,
        resource_type: resourceType as any,
        round_type: roundType as any,
        category: category as any,
        folder_path: selectedCompany === "general" ? folderPath : null,
        file_path: filePath,
        external_link: externalLink || null,
        uploaded_by: user?.id,
      });

      if (error) throw error;

      toast.success("Resource uploaded successfully");
      
      // Reset form
      setSelectedCompany("general");
      setResourceTitle("");
      setResourceDesc("");
      setExternalLink("");
      setFile(null);
      setFolderPath("");
      
      fetchData();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload resource");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;

    try {
      // Get the resource details first
      const { data: resRow } = await supabase
        .from("resources")
        .select("file_path")
        .eq("id", id)
        .single();

      // Delete from database first
      const { error: dbError } = await supabase.from("resources").delete().eq("id", id);

      if (dbError) {
        toast.error(dbError.message || "Failed to delete resource");
        return;
      }

      // Delete from storage if file exists
      if (resRow?.file_path) {
        const { error: storageError } = await supabase.storage
          .from("resources")
          .remove([resRow.file_path]);
        
        if (storageError) {
          console.error("Storage deletion error:", storageError);
          // Don't show error to user as DB record is already deleted
        }
      }

      // Update UI
      setResources((prev) => prev.filter((r: any) => r.id !== id));
      setAnalytics((prev: any) => ({
        ...prev,
        totalResources: Math.max(0, (prev.totalResources || 0) - 1),
      }));

      toast.success("Resource deleted successfully");
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete resource");
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Are you sure you want to delete all resources in "${folderPath}"?`)) return;

    try {
      // Get all resources in this folder
      const { data: folderResources, error: fetchError } = await supabase
        .from("resources")
        .select("id, file_path")
        .eq("folder_path", folderPath);

      if (fetchError) throw fetchError;

      if (!folderResources || folderResources.length === 0) {
        toast.error("No resources found in this folder");
        return;
      }

      // Delete all resources from database
      const { error: dbError } = await supabase
        .from("resources")
        .delete()
        .eq("folder_path", folderPath);

      if (dbError) throw dbError;

      // Delete all files from storage
      const filePaths = folderResources
        .map(r => r.file_path)
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("resources")
          .remove(filePaths);
        
        if (storageError) {
          console.error("Storage deletion error:", storageError);
        }
      }

      // Update UI
      setResources((prev) => 
        prev.filter((r: any) => r.folder_path !== folderPath)
      );

      toast.success(`Deleted ${folderResources.length} resources from "${folderPath}"`);
      fetchData();
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete folder");
    }
  };

  const openEdit = (resource: any) => {
    setEditingResource(resource);
    setEditTitle(resource.title || "");
    setEditDesc(resource.description || "");
    setEditRound(resource.round_type || "general");
    setEditType(resource.resource_type || "pdf");
    setEditExternalLink(resource.external_link || "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingResource) return;
    const { error } = await supabase
      .from("resources")
      .update({
        title: editTitle.trim(),
        description: editDesc.trim(),
        round_type: editRound as any,
        resource_type: editType as any,
        external_link: editExternalLink.trim() || null,
      })
      .eq("id", editingResource.id);

    if (error) {
      toast.error(error.message || "Failed to update resource");
      return;
    }
    toast.success("Resource updated");
    setEditOpen(false);
    setEditingResource(null);
    fetchData();
    fetchAnalytics();
  };

  const handlePostAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: announcementTitle,
      content: announcementContent,
      is_pinned: isPinned,
      posted_by: user?.id,
    });

    if (error) {
      toast.error("Failed to post announcement");
    } else {
      toast.success("Announcement posted");
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setIsPinned(false);
      fetchData();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete announcement");
    } else {
      toast.success("Announcement deleted");
      fetchData();
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">Mentor Dashboard</h1>

          <Tabs defaultValue="analytics" className="space-y-6">
            <div className="overflow-x-auto pb-2 -mx-1 md:mx-0">
              <TabsList className="flex w-max md:w-full md:grid md:grid-cols-6 gap-2">
                <TabsTrigger className="shrink-0" value="analytics">Analytics</TabsTrigger>
                <TabsTrigger className="shrink-0" value="upload">Upload</TabsTrigger>
                <TabsTrigger className="shrink-0" value="resources">Resources</TabsTrigger>
                <TabsTrigger className="shrink-0" value="companies">Companies</TabsTrigger>
                <TabsTrigger className="shrink-0" value="announcements">Announcements</TabsTrigger>
                <TabsTrigger className="shrink-0" value="manage-announcements">Manage</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-bold">{analytics.totalResources}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-accent" />
                      <span className="text-3xl font-bold">{analytics.totalDownloads}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-success" />
                      <span className="text-3xl font-bold">{analytics.totalViews}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Bookmarked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-5 w-5 text-warning" />
                      <span className="text-3xl font-bold">{analytics.totalBookmarks}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Resources by Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topResources.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.topResources.map((resource: any, index: number) => (
                        <div key={resource.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {resource.companies?.name || "General"} • {resource.round_type}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{(resource as any).derived_downloads ?? resource.download_count ?? 0}</p>
                            <p className="text-xs text-muted-foreground">downloads</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data available yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>Upload New Resource</CardTitle>
                  <CardDescription>Add study materials for students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Type</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Resources (Common for all)</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCompany === "general" && (
                    <div className="space-y-2">
                      <Label>Folder Path (Optional)</Label>
                      <Input
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        placeholder="e.g., Communication Skills/Presentation"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use / to create nested folders. Leave empty for root folder.
                      </p>
                    </div>
                  )}

                  {selectedCompany === "general" && (
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="aptitude">Aptitude</SelectItem>
                          <SelectItem value="coding">Coding</SelectItem>
                          <SelectItem value="communication">Communication</SelectItem>
                          <SelectItem value="resume">Resume Building</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Resource Type</Label>
                      <Select value={resourceType} onValueChange={setResourceType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="doc">Document</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Round Type</Label>
                      <Select value={roundType} onValueChange={setRoundType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aptitude">Aptitude</SelectItem>
                          <SelectItem value="coding">Coding</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      placeholder="e.g., Aptitude Questions Set 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={resourceDesc}
                      onChange={(e) => setResourceDesc(e.target.value)}
                      placeholder="Brief description of the resource"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>File Upload</Label>
                    <Input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Or External Link</Label>
                    <Input
                      value={externalLink}
                      onChange={(e) => setExternalLink(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <Button onClick={handleUploadResource} disabled={uploading} className="w-full gap-2">
                    {uploading ? "Uploading..." : <><Upload className="h-4 w-4" /> Upload Resource</>}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources">
              <Card>
                <CardHeader>
                  <CardTitle>All Resources</CardTitle>
                  <CardDescription>{resources.length} total resources</CardDescription>
                </CardHeader>
                <CardContent>
                  {resources.length > 0 ? (
                    <div className="space-y-3">
                      {/* Group resources by folder */}
                      {(() => {
                        const folders = new Map<string, typeof resources>();
                        resources.forEach(r => {
                          const folder = r.folder_path || "_root";
                          if (!folders.has(folder)) folders.set(folder, []);
                          folders.get(folder)?.push(r);
                        });

                        return Array.from(folders.entries()).map(([folder, folderResources]) => (
                          <div key={folder} className="space-y-2 animate-fade-in">
                            {folder !== "_root" && (
                              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{folder}</span>
                                  <span className="text-xs text-muted-foreground">({folderResources.length})</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteFolder(folder)}
                                  className="h-7 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Delete Folder
                                </Button>
                              </div>
                            )}
                            {folderResources.map((resource) => (
                              <div key={resource.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-3 hover-scale transition-all duration-300">
                                <div className="flex items-start gap-3 flex-1">
                                  <FileText className="h-5 w-5 text-primary mt-1" />
                                  <div className="flex-1">
                                    <p className="font-medium">{resource.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {resource.companies?.name || "General Resources"} • {resource.round_type}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Downloads: {analytics.downloadsByResource?.[resource.id] ?? resource.download_count ?? 0}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(resource)}
                                    className="shrink-0 transition-transform hover:scale-110"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteResource(resource.id)}
                                    className="shrink-0 transition-transform hover:scale-110"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No resources uploaded yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="companies">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Company</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="e.g., Infosys"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={newCompanyDesc}
                        onChange={(e) => setNewCompanyDesc(e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                    <Button onClick={handleAddCompany} className="w-full gap-2">
                      <Plus className="h-4 w-4" /> Add Company
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Manage Companies</CardTitle>
                    <CardDescription>{companies.length} companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {companies.length > 0 ? (
                      <div className="space-y-3">
                        {companies.map((company) => (
                          <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{company.name}</p>
                                {company.description && (
                                  <p className="text-sm text-muted-foreground">{company.description}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCompany(company.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No companies added yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="announcements">
              <Card>
                <CardHeader>
                  <CardTitle>Post Announcement</CardTitle>
                  <CardDescription>Share important updates with students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="Announcement title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      placeholder="Announcement content"
                      rows={6}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pinned"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="pinned">Pin to top</Label>
                  </div>
                  <Button onClick={handlePostAnnouncement} className="w-full">
                    Post Announcement
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage-announcements">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Announcements</CardTitle>
                  <CardDescription>{announcements.length} announcements</CardDescription>
                </CardHeader>
                <CardContent>
                  {announcements.length > 0 ? (
                    <div className="space-y-3">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="flex flex-col md:flex-row md:items-start justify-between p-4 border rounded-lg gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-medium">{announcement.title}</p>
                              {announcement.is_pinned && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Pinned</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground text-justify">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No announcements yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Round Type</Label>
              <Select value={editRound} onValueChange={setEditRound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aptitude">Aptitude</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resource Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>External Link (optional)</Label>
            <Input value={editExternalLink} onChange={(e) => setEditExternalLink(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={saveEdit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default MentorDashboard;