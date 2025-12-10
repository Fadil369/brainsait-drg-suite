import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, FileText, Bot, Lightbulb, Settings, Scale, LogOut, FilePlus2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coding-workspace', label: 'Coding Workspace', icon: Bot },
  { href: '/claims-manager', label: 'Claims Manager', icon: FileText },
  { href: '/cdi-nudges', label: 'CDI Nudges', icon: Lightbulb },
];
const adminNavItems = [
  { href: '/integration', label: 'Integration', icon: Settings },
  { href: '/audit-reconciliation', label: 'Audit & Reconciliation', icon: Scale },
];
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <Sidebar>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0E5FFF] to-[#083e9e]" />
          <span className="text-lg font-bold font-display">BrainSAIT</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex flex-col justify-between">
        <div>
          <SidebarGroup>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location.pathname.startsWith(item.href)}>
                    <Link to={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
          {user?.role === 'admin' && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={location.pathname.startsWith(item.href)}>
                        <Link to={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </div>
        <div className="mt-auto">
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="size-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 text-xs text-muted-foreground">
          Logged in as {user?.username} ({user?.role})
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}