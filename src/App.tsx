import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentManagement from "./pages/StudentManagement";
import GradesPage from "./pages/Grades";
import StudentGradesManager from "./pages/StudentGradesManager";
import TeacherClassRoster from "./pages/TeacherClassRoster";
import ManageClasses from "./pages/ManageClasses";

// ⭐️ --- 1. IMPORT THE RENAMED/REFACTORED CLINIC FILES --- ⭐️
import Clinic from "./pages/Clinic";
import AddEditClinicVisit from "./pages/AddEditClinicVisit"; // Renamed from ClinicVisitForm

import Behavior from "./pages/Behavior";
import AddEditBehaviorRecord from "./pages/AddEditBehaviorRecord";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

import ManageGradesLocks from "./pages/ManageGradesLocks"; 

import TeacherAttendanceDashboard from "./pages/TeacherAttendanceDashboard";
import TakeAttendance from "./pages/TakeAttendance";
import AdminAttendanceReport from "./pages/AdminAttendanceReport";

const queryClient = new QueryClient();

// --- Protected Route ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// --- Admin Route ---
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Check if user is admin or registrar
  if (user.role !== 'admin' && user.role !== 'registrar') {
      console.warn(`User with role '${user.role}' tried to access admin route.`);
      return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Redirect root to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Student Management */}
              <Route
                path="/students"
                element={
                  <ProtectedRoute>
                    <StudentManagement />
                  </ProtectedRoute>
                }
              />

              {/* Grades Management */}
              <Route
                path="/grades"
                element={
                  <ProtectedRoute>
                    <GradesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/grade-locks"
                element={
                  <AdminRoute>
                    <ManageGradesLocks /> 
                  </AdminRoute>
                }
              />
              <Route
                path="/students/:id/grades"
                element={
                  <ProtectedRoute>
                    <StudentGradesManager />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grades/class-roster/:classId"
                element={
                  <ProtectedRoute>
                    <TeacherClassRoster />
                  </ProtectedRoute>
                }
              />

              {/* ADMIN ROUTE FOR MANAGE CLASSES */}
              <Route
                path="/admin/manage-classes"
                element={
                  <AdminRoute>
                    <ManageClasses />
                  </AdminRoute>
                }
              />

              {/* Attendance Routes */}
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute>
                    <TeacherAttendanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance/class/:classId"
                element={
                  <ProtectedRoute>
                    <TakeAttendance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance-report"
                element={
                  <AdminRoute>
                    <AdminAttendanceReport />
                  </AdminRoute>
                }
              />

              {/* ⭐️ --- 2. UPDATED CLINIC ROUTES (to match Behavior) --- ⭐️ */}
              <Route 
                path="/clinic" 
                element={
                  <ProtectedRoute>
                    <Clinic />
                  </ProtectedRoute>
                } 
              />
              {/* This path uses student_pk to match the Behavior routes */}
              <Route 
                path="/clinic/history/:student_pk" 
                element={
                  <ProtectedRoute>
                    <Clinic />
                  </ProtectedRoute>
                } 
              />
              {/* This path uses the new form component */}
              <Route 
                path="/clinic/add" 
                element={
                  <ProtectedRoute>
                    <AddEditClinicVisit />
                  </ProtectedRoute>
                } 
              />
              {/* This path uses the new form component */}
              <Route 
                path="/clinic/edit/:id" 
                element={
                  <ProtectedRoute>
                    <AddEditClinicVisit />
                  </ProtectedRoute>
                } 
              />
              {/* --- END OF CLINIC ROUTE FIX --- */}


              {/* Behavior Management (These are correct) */}
              <Route 
                path="/behavior" 
                element={
                  <ProtectedRoute>
                    <Behavior />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/behavior/history/:student_pk" 
                element={
                  <ProtectedRoute>
                    <Behavior />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/behavior/add" 
                element={
                  <ProtectedRoute>
                    <AddEditBehaviorRecord />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/behavior/edit/:id" 
                element={
                  <ProtectedRoute>
                    <AddEditBehaviorRecord />
                  </ProtectedRoute>
                } 
              />

              {/* Reports */}
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;