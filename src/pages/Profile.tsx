import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookmarkMinus, FileText, Building2 } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user]);

  const fetchBookmarks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookmarks")
      .select(
        `resource_id,
         resources:resource_id (
           id, title, description, resource_type, round_type, download_count, companies(name)
         )`
      )
      .eq("user_id", user?.id);

    setBookmarked(data || []);
    setLoading(false);
  };

  const removeBookmark = async (resourceId: string) => {
    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user?.id)
      .eq("resource_id", resourceId);
    fetchBookmarks();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">My Bookmarks</h1>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : bookmarked.length > 0 ? (
            <div className="space-y-3">
              {bookmarked.map((b: any) => (
                <Card key={b.resource_id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {b.resources?.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {b.resources?.description}
                        </CardDescription>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-3">
                          {b.resources?.companies?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {b.resources?.companies?.name}
                            </span>
                          )}
                          <span>•</span>
                          <span>{b.resources?.round_type}</span>
                          <span>•</span>
                          <span>{b.resources?.download_count || 0} downloads</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeBookmark(b.resource_id)}
                        className="gap-2"
                      >
                        <BookmarkMinus className="h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No bookmarks yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

