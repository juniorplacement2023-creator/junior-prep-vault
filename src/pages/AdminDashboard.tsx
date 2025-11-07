import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Shield, Trash2, UserPlus } from "lucide-react";

const AdminDashboard = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("junior");

  useEffect(() => {
    if (!authLoading && (!user || userRole !== "admin")) {
      toast.error("Access denied. Admin access required.");
      navigate("/");
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user && userRole === "admin") {
      fetchUsers();
    }
  }, [user, userRole]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select(`
        *,
        user_roles(role)
      `)
      .order("created_at", { ascending: false });

    setUsers(data || []);
  };

  const handleAssignRole = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    // First, delete existing role for this user and the selected role
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", selectedUser)
      .eq("role", selectedRole as any);

    // Then insert the new role
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: selectedUser, role: selectedRole as any });

    if (error) {
      toast.error("Failed to assign role");
    } else {
      toast.success("Role assigned successfully");
      fetchUsers();
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as any);

    if (error) {
      toast.error("Failed to remove role");
    } else {
      toast.success("Role removed");
      fetchUsers();
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
          <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

          <Tabs defaultValue="users">
            <TabsList className="mb-6">
              <TabsTrigger value="users">Manage Users</TabsTrigger>
              <TabsTrigger value="assign">Assign Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Users
                  </CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length > 0 ? (
                    <div className="space-y-3">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <div className="flex gap-2 mt-2">
                              {user.user_roles?.map((ur: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                                    {ur.role}
                                  </span>
                                  {ur.role !== "junior" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleRemoveRole(user.id, ur.role)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No users found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assign">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Assign Role
                  </CardTitle>
                  <CardDescription>Grant mentor or admin access to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleAssignRole} className="w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    Assign Role
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

export default AdminDashboard;