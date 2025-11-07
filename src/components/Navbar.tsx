import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { GraduationCap, LogOut, User, Home, Building2, LayoutDashboard, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Navbar = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 animate-slide-up">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <GraduationCap className="h-8 w-8 text-primary transition-transform group-hover:rotate-12" />
            <span className="text-xl font-bold gradient-text">
              PlacementSphere
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="transition-all hover:scale-105">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link to="/companies">
              <Button variant="ghost" size="sm" className="transition-all hover:scale-105">
                <Building2 className="h-4 w-4 mr-2" />
                Companies
              </Button>
            </Link>
            <Link to="/forum">
              <Button variant="ghost" size="sm" className="transition-all hover:scale-105">
                Forum
              </Button>
            </Link>
            <Link to="/general-resources">
              <Button variant="ghost" size="sm" className="transition-all hover:scale-105">
                General Resources
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="transition-all hover:scale-105"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    My Bookmarks
                  </DropdownMenuItem>
                  {(userRole === "mentor" || userRole === "admin") && (
                    <DropdownMenuItem onClick={() => navigate("/mentor/dashboard")}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Mentor Dashboard
                    </DropdownMenuItem>
                  )}
                  {userRole === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-3 mt-8">
                  <Link to="/">
                    <Button variant="ghost" className="justify-start">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Link to="/companies">
                    <Button variant="ghost" className="justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      Companies
                    </Button>
                  </Link>
                  <Link to="/forum">
                    <Button variant="ghost" className="justify-start">
                      Forum
                    </Button>
                  </Link>
                  <Link to="/general-resources">
                    <Button variant="ghost" className="justify-start">
                      General Resources
                    </Button>
                  </Link>

                  {user ? (
                    <>
                      {(userRole === "mentor" || userRole === "admin") && (
                        <Button
                          variant="ghost"
                          className="justify-start"
                          onClick={() => navigate("/mentor/dashboard")}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Mentor Dashboard
                        </Button>
                      )}
                      {userRole === "admin" && (
                        <Button
                          variant="ghost"
                          className="justify-start"
                          onClick={() => navigate("/admin/dashboard")}
                        >
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Admin Dashboard
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="justify-start"
                        onClick={signOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth">
                      <Button variant="default" className="justify-start">
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};