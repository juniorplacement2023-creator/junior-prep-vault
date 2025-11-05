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
import { Upload, Plus, FileText, Trash2, Building2, BarChart3, TrendingUp, Download, Eye, Bookmark, Folder, FolderPlus } from "lucide-react";

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
  const [file, setFile] = useState<File | null>(null);

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

    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete resource");
    } else {
      toast.success("Resource deleted");
      fetchData();
      fetchAnalytics();
    }
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
                      {resources.map((resource) => (
                        <div key={resource.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <FileText className="h-5 w-5 text-primary mt-1" />
                            <div className="flex-1">
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {resource.companies?.name || "General Resources"} • {resource.round_type}
                                {resource.folder_path && ` • ${resource.folder_path}`}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Downloads: {analytics.downloadsByResource?.[resource.id] ?? resource.download_count ?? 0}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
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
  );
};

export default MentorDashboard;