import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ⭐️ FIX: Added 'print:hidden' to hide sidebar on print */}
      <div className="hidden md:block w-64 fixed left-0 top-0 h-full border-r bg-[#800000] text-white print:hidden">
        <Sidebar />
      </div>

      {/* ⭐️ FIX: Added 'print:hidden' to hide mobile menu on print */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex print:hidden">
          <div className="w-64 bg-[#800000] text-white h-full shadow-lg">
            <Sidebar />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* ⭐️ FIX: Added 'print:ml-0' to remove margin on print */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0 print:ml-0">
        {/* ⭐️ FIX: Added 'print:hidden' to hide mobile header on print */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-[#800000] text-white print:hidden">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold">Dashboard</h1>
        </header>

        {/* ⭐️ FIX: Added 'print:p-0' to remove padding on print */}
        <main className="p-6 flex-1 bg-white print:p-0">{children}</main>
      </div>
    </div>
  );
};