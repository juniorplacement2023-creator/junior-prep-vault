import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, BookOpen, Users, ArrowRight, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({ companies: 0, resources: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch featured companies
    const { data: companies } = await supabase
      .from("companies")
      .select("*")
      .eq("is_featured", true)
      .limit(6);
    
    // Fetch latest announcements
    const { data: announcements } = await supabase
      .from("announcements")
      .select(`
        *,
        profiles:posted_by (full_name)
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    
    // Fetch stats
    const { count: companiesCount } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true });
    
    const { count: resourcesCount } = await supabase
      .from("resources")
      .select("*", { count: "exact", head: true });
    
    setFeaturedCompanies(companies || []);
    setAnnouncements(announcements || []);
    setStats({
      companies: companiesCount || 0,
      resources: resourcesCount || 0,
    });
    setLoading(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/companies?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PlacementSphere
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Campus Recruitment Resource Portal for Batch 2027
          </p>
          
          <div className="flex gap-2 max-w-xl mx-auto mt-8">
            <Input
              placeholder="Search companies, resources, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-12"
            />
            <Button onClick={handleSearch} size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Latest Announcements</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className={announcement.is_pinned ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {announcement.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                          {announcement.title}
                        </CardTitle>
                        <CardDescription className="mt-2 text-justify">
                          {announcement.content}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                      <span>Posted by {announcement.profiles?.full_name || "Admin"}</span>
                      <span>•</span>
                      <span>{format(new Date(announcement.created_at), "MMM dd, yyyy")}</span>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No announcements yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="h-10 w-10 mx-auto text-primary mb-2" />
              <CardTitle>Active Companies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{loading ? "-" : stats.companies}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <BookOpen className="h-10 w-10 mx-auto text-accent mb-2" />
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{loading ? "-" : stats.resources}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Featured Companies */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Companies</h2>
            <Link to="/companies">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCompanies.map((company) => (
                <Link key={company.id} to={`/company/${company.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {company.name}
                        <Badge variant="secondary" className="ml-auto">Featured</Badge>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {company.description || "Explore resources for this company"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="w-full gap-2">
                        View Resources
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* Getting Started Guide */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription>Your guide to using PlacementSphere effectively</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                1
              </div>
              <div>
                <h3 className="font-semibold">Browse Companies</h3>
                <p className="text-sm text-muted-foreground">
                  Explore resources organized by company names
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                2
              </div>
              <div>
                <h3 className="font-semibold">Download Materials</h3>
                <p className="text-sm text-muted-foreground">
                  Access PDFs, videos, and study materials for each round
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                3
              </div>
              <div>
                <h3 className="font-semibold">Bookmark & Track</h3>
                <p className="text-sm text-muted-foreground">
                  Save important resources and track your preparation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;