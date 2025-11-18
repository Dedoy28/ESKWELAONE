import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GraduationCap,
  Home,
  Users,
  LogOut,
  BookOpen,
  Calendar,
  Stethoscope,
  MessageCircle,
  FileDown
} from 'lucide-react';
import { UserRole } from '@/contexts/AuthContext'; // Adjust path if needed

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  adminHref?: string; // Admin-specific URL
  roles: UserRole[]; // Use the specific UserRole type from AuthContext
}

// --- UPDATED navigationItems ---
const navigationItems: NavItem[] = [
  { label: 'Dashboard', icon: Home, href: '/dashboard', roles: ['admin', 'registrar', 'teacher', 'nurse', 'guidance_counselor'] },
  { label: 'Student Management', icon: Users, href: '/students', roles: ['admin', 'registrar'] },
  
  { label: 'Grades', icon: BookOpen, href: '/grades', roles: ['admin', 'teacher'] }, 
  
  { 
    label: 'Attendance', 
    icon: Calendar, 
    href: '/attendance', // Teacher's page
    adminHref: '/admin/attendance-report', // Admin's page
    roles: ['admin', 'teacher'] // 'registrar' was already removed
  }, 
  
  // ⭐️ --- THIS IS THE FIX --- ⭐️
  { label: 'Clinic Visits', icon: Stethoscope, href: '/clinic', roles: ['nurse'] }, // 'admin' removed
  { label: 'Behavior Records', icon: MessageCircle, href: '/behavior', roles: ['guidance_counselor'] }, // 'admin' removed
  // ⭐️ --- END OF FIX --- ⭐️

  { label: 'Reports', icon: FileDown, href: '/reports', roles: ['admin', 'registrar', 'teacher'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Filter navigation items based on the current user's role
  const filteredItems = navigationItems.filter(item =>
    item.roles.includes(user.role)
  );

  return (
    <div className="flex flex-col h-full bg-[#800000] text-white">
      {/* Logo / Header */}
      <div className="p-6 border-b border-white/20 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-[#800000]" />
        </div>
        <div>
          <h2 className="font-bold text-lg">EskwelaOne</h2>
          <p className="text-xs text-white/70">SNHS EMIS</p>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/20">
        <div className="text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-white/70 capitalize">{user.role.replace('_', ' ')}</p>
          {user.studentId && (
            <p className="text-xs text-white/70">{user.studentId}</p>
          )}
          {user.section && (
            <p className="text-xs text-white/70">{user.section}</p>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;

            const isAdmin = user.role === 'admin' || user.role === 'registrar';
            const destination = (isAdmin && item.adminHref) ? item.adminHref : item.href;

            return (
              <NavLink
                key={item.href} 
                to={destination}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-[#a52a2a] text-white shadow' // Active style
                      : 'text-white/80 hover:bg-white/10 hover:text-white' // Inactive style
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sign Out Button */}
      <div className="p-4 border-t border-white/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout} 
          className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

// Ensure this component is exported if used elsewhere,
// If it's the default export, add 'export default Sidebar;'