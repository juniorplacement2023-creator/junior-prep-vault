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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, Plus, FileText, Trash2 } from "lucide-react";

const MentorDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDesc, setNewCompanyDesc] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceType, setResourceType] = useState("pdf");
  const [roundType, setRoundType] = useState("aptitude");
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
    }
  }, [user, userRole]);

  const fetchData = async () => {
    const { data: companiesData } = await supabase.from("companies").select("*").order("name");
    const { data: resourcesData } = await supabase
      .from("resources")
      .select("*, companies(name)")
      .eq("uploaded_by", user?.id)
      .order("created_at", { ascending: false });

    setCompanies(companiesData || []);
    setResources(resourcesData || []);
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    const { error } = await supabase
      .from("companies")
      .insert({ name: newCompanyName, description: newCompanyDesc });

    if (error) {
      toast.error("Failed to add company");
    } else {
      toast.success("Company added successfully");
      setNewCompanyName("");
      setNewCompanyDesc("");
      fetchData();
    }
  };

  const handleUploadResource = async () => {
    if (!selectedCompany || !resourceTitle.trim()) {
      toast.error("Please fill in all required fields");
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
        company_id: selectedCompany,
        title: resourceTitle,
        description: resourceDesc,
        resource_type: resourceType as any,
        round_type: roundType as any,
        file_path: filePath,
        external_link: externalLink || null,
        uploaded_by: user?.id,
      });

      if (error) throw error;

      toast.success("Resource uploaded successfully");
      
      // Reset form
      setSelectedCompany("");
      setResourceTitle("");
      setResourceDesc("");
      setExternalLink("");
      setFile(null);
      
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload resource");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete resource");
    } else {
      toast.success("Resource deleted");
      fetchData();
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
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Mentor Dashboard</h1>

          <Tabs defaultValue="upload">
            <TabsList className="mb-6">
              <TabsTrigger value="upload">Upload Resources</TabsTrigger>
              <TabsTrigger value="my-resources">My Resources</TabsTrigger>
              <TabsTrigger value="companies">Manage Companies</TabsTrigger>
              <TabsTrigger value="announcements">Post Announcement</TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>Upload New Resource</CardTitle>
                  <CardDescription>Add study materials for students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

            <TabsContent value="my-resources">
              <Card>
                <CardHeader>
                  <CardTitle>My Uploaded Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  {resources.length > 0 ? (
                    <div className="space-y-3">
                      {resources.map((resource) => (
                        <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {resource.companies?.name} • {resource.round_type}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteResource(resource.id)}
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
                    />
                    <Label htmlFor="pinned">Pin to top</Label>
                  </div>
                  <Button onClick={handlePostAnnouncement} className="w-full">
                    Post Announcement
                  </Button>
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