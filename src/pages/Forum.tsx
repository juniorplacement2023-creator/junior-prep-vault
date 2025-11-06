import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2 } from "lucide-react";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  profiles?: { full_name?: string } | null;
  replies?: Array<{
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    profiles?: { full_name?: string } | null;
  }> | null;
}

const Forum = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyTextByPost, setReplyTextByPost] = useState<Record<string, string>>({});
  const [rolesByUserId, setRolesByUserId] = useState<Record<string, string>>({});
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
    fetchUserRole();

    // Set up realtime subscriptions
    const postsChannel = supabase
      .channel('forum-posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_posts'
        },
        () => {
          console.log('New post detected, refreshing...');
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'forum_posts'
        },
        () => {
          console.log('Post deleted, refreshing...');
          fetchPosts();
        }
      )
      .subscribe();

    const repliesChannel = supabase
      .channel('forum-replies-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_replies'
        },
        () => {
          console.log('New reply detected, refreshing...');
          fetchPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'forum_replies'
        },
        () => {
          console.log('Reply deleted, refreshing...');
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    setUserRole(data?.role || null);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("forum_posts")
      .select(`
        id, title, content, author_id, created_at,
        profiles:author_id (full_name),
        replies:forum_replies (
          id, content, author_id, created_at,
          profiles:author_id (full_name)
        )
      `)
      .order("created_at", { ascending: false });

    const fetchedPosts = (data as unknown as ForumPost[]) || [];
    setPosts(fetchedPosts);

    // Collect unique author ids from posts and replies to fetch roles in one go
    const userIds = new Set<string>();
    fetchedPosts.forEach((p) => {
      if (p.author_id) userIds.add(p.author_id);
      (p.replies || []).forEach((r) => {
        if (r.author_id) userIds.add(r.author_id);
      });
    });
    if (userIds.size > 0) {
      const ids = Array.from(userIds);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (roles || []).forEach((row: any) => {
        map[row.user_id] = row.role;
      });
      setRolesByUserId(map);
    } else {
      setRolesByUserId({});
    }

    setLoading(false);
  };

  const roleLabel = (userId?: string) => {
    if (!userId) return "(Student)";
    const role = rolesByUserId[userId];
    return role === "mentor" ? "(Mentor)" : "(Student)";
  };

  const isMentorOrAdmin = userRole === "mentor" || userRole === "admin";

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", postId);
    if (error) {
      toast.error("Failed to delete post");
      return;
    }
    toast.success("Post deleted");
    fetchPosts();
  };

  const handleDeleteReply = async (replyId: string) => {
    const { error } = await supabase
      .from("forum_replies")
      .delete()
      .eq("id", replyId);
    if (error) {
      toast.error("Failed to delete reply");
      return;
    }
    toast.success("Reply deleted");
    fetchPosts();
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast.error("Please sign in to post a question");
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    const { error } = await supabase.from("forum_posts").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      author_id: user.id,
    });
    if (error) {
      toast.error("Failed to post query");
      return;
    }
    setNewTitle("");
    setNewContent("");
    toast.success("Query posted");
    fetchPosts();
  };

  const handleReply = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to reply");
      return;
    }
    const text = (replyTextByPost[postId] || "").trim();
    if (!text) {
      toast.error("Reply cannot be empty");
      return;
    }
    const { error } = await supabase.from("forum_replies").insert({
      post_id: postId,
      content: text,
      author_id: user.id,
    });
    if (error) {
      toast.error("Failed to post reply");
      return;
    }
    setReplyTextByPost((prev) => ({ ...prev, [postId]: "" }));
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Community Forum</h1>
            <p className="text-muted-foreground">Ask questions, share knowledge, and help each other.</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create a Query</CardTitle>
              <CardDescription>Post your question to the community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Describe your problem..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
              />
              <Button onClick={handleCreatePost} className="w-full sm:w-auto">
                <Send className="h-4 w-4 mr-2" /> Post Query
              </Button>
            </CardContent>
          </Card>

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
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <CardDescription className="text-justify">
                      {post.content}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">{post.profiles?.full_name || "User"} {roleLabel(post.author_id)}</span>
                        <span className="ml-2">• {new Date(post.created_at).toLocaleString()}</span>
                      </div>
                      {isMentorOrAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.replies?.length || 0} replies</span>
                    </div>

                    {post.replies && post.replies.length > 0 && (
                      <div className="space-y-3">
                        {post.replies.map((reply) => (
                          <div key={reply.id} className="p-3 rounded-md border">
                            <p className="text-sm text-justify">{reply.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">{reply.profiles?.full_name || "User"} {roleLabel(reply.author_id)}</span>
                                <span className="ml-2">• {new Date(reply.created_at).toLocaleString()}</span>
                              </div>
                              {isMentorOrAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteReply(reply.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Write a reply..."
                        value={replyTextByPost[post.id] || ""}
                        onChange={(e) => setReplyTextByPost((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      />
                      <Button onClick={() => handleReply(post.id)} className="sm:w-auto">
                        Reply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No queries yet. Be the first to ask!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Forum;

