// src/pages/Dashboard.tsx
// ⭐️ FINALIZED FILE: Section Summary Pop-up Added ⭐️

import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  BookOpen,
  UserCheck,
  Stethoscope,
  MessageCircle,
  FileText,
  BarChart,
  List,
  Loader2,
  AlertTriangle,
  Eye
} from 'lucide-react';
import api from '@/lib/axios';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- (Interfaces) ---
interface DashboardStats {
  totalStudents: number;
  activeRecords: number;
  clinicVisits: number;
  behavioralReports: number;
}
interface TeacherClass {
  id: number;
  subject: string;
  section: string;
  academic_year: string;
}
interface ClinicVisit {
  id: number;
  student: {
    first_name: string;
    last_name: string;
  };
  illness: string;
  visit_date: string;
}
interface BehaviorRecord {
  id: number;
  student: {
    first_name: string;
    last_name: string;
  };
  category: string;
  date: string;
}
interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
}

// --- NEW INTERFACES FOR SECTION MODAL ---
interface SectionStudent {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  gender: string;
}
interface SectionDetail {
  id: number;
  name: string;
  grade: string;
  school_year: string;
  adviser_name: string | null;
  student_count: number;
}

// --- HOOK ---
function useSummaryData<T>(endpoint: string): { data: T | null; isLoading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(endpoint);
        setData(response.data);
        setError(null);
      } catch (err: any) {
        console.error(`Error fetching summary from ${endpoint}:`, err);
        setError(err.message || 'Failed to load summary data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  return { data, isLoading, error };
}

const Dashboard = () => {
  const { user, accessToken } = useAuth(); 
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    if (user?.role === 'teacher') {
      setIsLoading(false); 
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/dashboard/stats/');
        const data: DashboardStats = response.data;
        setStats(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    const WS_URL = import.meta.env.VITE_WS_URL;
    if (!WS_URL) return;
    
    const socketUrl = `${WS_URL}/ws/dashboard-updates/?token=${accessToken}`;
    const socket = new WebSocket(socketUrl);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stats_update' && data.payload) {
        setStats(data.payload);
      }
    };
    return () => socket.close();
  }, [accessToken, user?.role]); 

  const renderDashboardByRole = () => {
    if (!user) return <div>Loading user data...</div>;
    
    const globalDashboardProps: DashboardProps = { stats, isLoading, error };

    switch (user.role as UserRole) {
      case 'admin': return <AdminDashboard {...globalDashboardProps} />;
      case 'registrar': return <RegistrarDashboard {...globalDashboardProps} />;
      case 'teacher': return <TeacherDashboard />;
      case 'nurse': return <NurseDashboard {...globalDashboardProps} />; 
      case 'guidance_counselor': return <GuidanceDashboard {...globalDashboardProps} />; 
      default: return <div>No dashboard for role: {user.role}</div>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {getGreeting()}, {user?.name || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Welcome to your {user?.role?.replace('_', ' ') || 'user'} dashboard
          </p>
        </div>
        {error && (
           <Card className="border-destructive bg-destructive/10">
             <CardHeader>
               <CardTitle className="text-destructive">Connection Error</CardTitle>
               <CardDescription className="text-destructive">{error}</CardDescription>
             </CardHeader>
           </Card>
        )}
        {renderDashboardByRole()}
      </div>
    </DashboardLayout>
  );
};

const StatValue = ({ value, isLoading }: { value: number | string | undefined | null, isLoading: boolean }) => {
  if (isLoading) return <>...</>;
  if (value === null || value === undefined) return <>-</>;
  return <>{value.toLocaleString()}</>;
};

// --- CLINIC CHART ---
interface ClinicSummaryData {
  summary_by_illness: { illness: string; count: number }[];
}
const ClinicSummaryChart = () => {
  const { data, isLoading, error } = useSummaryData<ClinicSummaryData>('/reports/clinic-summary/');

  return (
    <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart className="w-5 h-5 mr-2" /> Clinic Visit Summary (Last 30 Days)
        </CardTitle>
        <CardDescription>Top reported illnesses and symptoms</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="h-60 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading chart...
          </div>
        )}
        {error && <div className="h-60 flex items-center justify-center text-destructive">Could not load chart.</div>}
        {data && (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={data.summary_by_illness} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="illness" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip wrapperClassName="rounded-md border bg-popover p-2 shadow-sm" cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Total Visits" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- ⭐️ NEW: SECTION DETAIL MODAL ⭐️ ---
const SectionDetailModal = ({ section, onClose }: { section: SectionDetail | null, onClose: () => void }) => {
  const [students, setStudents] = useState<SectionStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (section) {
      setLoading(true);
      // Fetch students for this specific section
      api.get(`/students/?section_enrollments__section__name=${section.name}&section_enrollments__section__grade=${section.grade}&section_enrollments__school_year=${section.school_year}&is_active=true`)
        .then(res => {
          setStudents(res.data);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [section]);

  return (
    <Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Section: {section?.name} (Grade {section?.grade})</DialogTitle>
          <DialogDescription>
            Adviser: {section?.adviser_name || 'N/A'} | Students: {section?.student_count}
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
           <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6"/></div>
        ) : (
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>LRN</TableHead>
                 <TableHead>Last Name</TableHead>
                 <TableHead>First Name</TableHead>
                 <TableHead>Gender</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {students.length === 0 ? (
                 <TableRow><TableCell colSpan={4} className="text-center">No students found.</TableCell></TableRow>
               ) : (
                 students.map(s => (
                   <TableRow key={s.id}>
                     <TableCell>{s.lrn}</TableCell>
                     <TableCell>{s.last_name}</TableCell>
                     <TableCell>{s.first_name}</TableCell>
                     <TableCell>{s.gender}</TableCell>
                   </TableRow>
                 ))
               )}
             </TableBody>
           </Table>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// --- UPDATED: SECTION SUMMARY LIST (With Modal) ---
interface SectionSummaryData {
  total_students: number;
  total_sections: number;
  sections: SectionDetail[];
}
const SectionSummaryList = () => {
  const { data, isLoading, error } = useSummaryData<SectionSummaryData>('/reports/section-summary/?school_year=2025-2026');
  const [selectedSection, setSelectedSection] = useState<SectionDetail | null>(null);

  return (
    <>
      <Card className="col-span-1 sm:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" /> Section Summary
          </CardTitle>
          <CardDescription>Student count per section for the current year.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="h-60 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...</div>}
          {error && <div className="h-60 flex items-center justify-center text-destructive">{error}</div>}
          {data && (
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sections.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground h-24">No sections found.</TableCell>
                    </TableRow>
                  )}
                  {data.sections.map(section => (
                    <TableRow 
                      key={section.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => setSelectedSection(section)} // ⭐️ Opens Modal
                    >
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                           <Eye className="w-3 h-3 text-muted-foreground"/> 
                           Grade {section.grade} - {section.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{section.student_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ⭐️ Render the Modal ⭐️ */}
      {selectedSection && (
        <SectionDetailModal section={selectedSection} onClose={() => setSelectedSection(null)} />
      )}
    </>
  );
};

// --- AT-RISK LIST ---
interface AtRiskStudent {
  student_id: number;
  student_name: string;
  absent_count: number;
  grade: string;
  section: string;
}
interface AttendanceSummaryData {
  at_risk_students: AtRiskStudent[];
}
const AttendanceHotspotList: React.FC<{ endpoint: string, title: string, description: string }> = ({ endpoint, title, description }) => {
  const { data, isLoading, error } = useSummaryData<AttendanceSummaryData>(endpoint);
  
  return (
    <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="flex items-center text-destructive">
          <AlertTriangle className="w-5 h-5 mr-2" /> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-40 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...</div>}
        {error && <div className="h-40 flex items-center justify-center text-destructive">Could not load attendance summary.</div>}
        {data && data.at_risk_students.length === 0 && (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            <UserCheck className="w-5 h-5 mr-2" /> No students are currently at-risk.
          </div>
        )}
        {data && data.at_risk_students.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Absences</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.at_risk_students.map(student => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell>Grade {student.grade} - {student.section}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{student.absent_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- DASHBOARDS ---
const AdminDashboard: React.FC<DashboardProps> = ({ stats, isLoading }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard title="Total Students" value={<StatValue value={stats?.totalStudents} isLoading={isLoading} />} icon={Users} description="All student profiles" />
      <StatCard title="Active Records" value={<StatValue value={stats?.activeRecords} isLoading={isLoading} />} icon={UserCheck} description="Currently active students" />
      <StatCard title="Today's Clinic Visits" value={<StatValue value={stats?.clinicVisits} isLoading={isLoading} />} icon={Stethoscope} description="Visits logged today" />
      <StatCard title="Behavioral Reports" value={<StatValue value={stats?.behavioralReports} isLoading={isLoading} />} icon={MessageCircle} description="Total incidents reported" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <ClinicSummaryChart />
      <SectionSummaryList /> {/* ⭐️ Uses new Modal */}
    </div>
    <div className="grid grid-cols-1 gap-6">
      <AttendanceHotspotList endpoint="/reports/attendance-summary/?min_absences=3" title="At-Risk Attendance (All Students)" description="Students with 3 or more absences this quarter." />
    </div>
  </div>
);

const RegistrarDashboard: React.FC<DashboardProps> = ({ stats, isLoading }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <StatCard title="Enrolled Students" value={<StatValue value={stats?.activeRecords} isLoading={isLoading} />} icon={Users} description="Currently active students" />
    <StatCard title="Total Student Records" value={<StatValue value={stats?.totalStudents} isLoading={isLoading} />} icon={FileText} description="All profiles (active & inactive)" />
    <SectionSummaryList />
  </div>
);

const NurseDashboard: React.FC<DashboardProps> = ({ stats, isLoading: isGlobalLoading }) => {
  const { accessToken } = useAuth();
  const [recentVisits, setRecentVisits] = useState<ClinicVisit[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentVisits = async () => {
      if (!accessToken) return;
      try {
        setIsListLoading(true);
        const response = await api.get('/clinic-visits/?ordering=-visit_date&limit=5');
        const data = response.data;
        setRecentVisits(data.results || data); 
        setListError(null);
      } catch (err: any) {
        setListError(err.message);
      } finally {
        setIsListLoading(false);
      }
    };
    fetchRecentVisits();
  }, [accessToken]);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Today's Visits" value={<StatValue value={stats?.clinicVisits} isLoading={isGlobalLoading} />} icon={Stethoscope} description="Visits logged today" />
        <Card className="col-span-1 sm:col-span-1 lg:col-span-2">
         <CardHeader><CardTitle className="flex items-center"><List className="w-5 h-5 mr-2" /> Recent Clinic Visits</CardTitle><CardDescription>The 5 most recent visits to the clinic</CardDescription></CardHeader>
         <CardContent>
           {isListLoading ? <p className="text-muted-foreground text-sm">Loading recent visits...</p> : listError ? <p className="text-destructive text-sm">{listError}</p> : recentVisits.length > 0 ? (
            <ul className="space-y-3">
              {recentVisits.map(visit => (
                <li key={visit.id} className="flex justify-between items-center">
                  <div><span className="font-medium">{visit.student.last_name}, {visit.student.first_name}</span><p className="text-sm text-muted-foreground">{visit.illness}</p></div>
                  <Badge variant="outline">{new Date(visit.visit_date).toLocaleTimeString()}</Badge>
                </li>
              ))}
            </ul>
           ) : <p className="text-muted-foreground text-sm">No recent visits.</p>}
         </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1"><ClinicSummaryChart /></div>
    </div>
  );
};

const GuidanceDashboard: React.FC<DashboardProps> = ({ stats, isLoading: isGlobalLoading }) => {
  const { accessToken } = useAuth();
  const [recentReports, setRecentReports] = useState<BehaviorRecord[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentReports = async () => {
      if (!accessToken) return;
      try {
        setIsListLoading(true);
        const response = await api.get('/behavior-records/?ordering=-date&limit=5');
        const data = response.data;
        setRecentReports(data.results || data); 
        setListError(null);
      } catch (err: any) {
        setListError(err.message);
      } finally {
        setIsListLoading(false);
      }
    };
    fetchRecentReports();
  }, [accessToken]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Behavior Reports" value={<StatValue value={stats?.behavioralReports} isLoading={isGlobalLoading} />} icon={FileText} description="Total incidents on record" />
          <Card className="col-span-1 sm:col-span-1 lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center"><List className="w-5 h-5 mr-2" /> Recent Behavior Records</CardTitle><CardDescription>The 5 most recent reported incidents</CardDescription></CardHeader>
            <CardContent>
             {isListLoading ? <p className="text-muted-foreground text-sm">Loading recent reports...</p> : listError ? <p className="text-destructive text-sm">{listError}</p> : recentReports.length > 0 ? (
                <ul className="space-y-3">
                  {recentReports.map(report => (
                    <li key={report.id} className="flex justify-between items-center">
                      <div><span className="font-medium">{report.student.last_name}, {report.student.first_name}</span><p className="text-sm text-muted-foreground">{report.category}</p></div>
                      <Badge variant="outline">{new Date(report.date).toLocaleDateString()}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground text-sm">No recent reports.</p>}
            </CardContent>
          </Card>
      </div>
      <div className="grid grid-cols-1">
          <AttendanceHotspotList endpoint="/reports/attendance-summary/?min_absences=3" title="At-Risk Attendance (All Students)" description="Students with 3 or more absences this quarter." />
      </div>
    </div>
  );
};

const TeacherDashboard = () => {
  const { accessToken } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!accessToken) { setError("Authentication token not found."); setIsLoading(false); return; }
      try {
        setIsLoading(true);
        const response = await api.get('/teacher/my-classes/');
        const data: TeacherClass[] = response.data;
        setClasses(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeacherData();
  }, [accessToken]);

  const myClassesCount = classes.length;

  if (error) {
      return (<Card className="border-destructive bg-destructive/10 col-span-full"><CardHeader><CardTitle className="text-destructive">Connection Error</CardTitle><CardDescription className="text-destructive">{error}</CardDescription></CardHeader></Card>);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1"><StatCard title="My Classes" value={<StatValue value={myClassesCount} isLoading={isLoading} />} icon={BookOpen} description="Classes you are assigned to" /></div>
      <div className="grid grid-cols-1"><AttendanceHotspotList endpoint="/teacher/reports/attendance-summary/?min_absences=3" title="At-Risk Attendance (My Students)" description="Students in your classes with 3 or more absences this quarter." /></div>
      <Card>
        <CardHeader><CardTitle>My Classes List</CardTitle><CardDescription>Your schedule for this academic year</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? <div className="text-muted-foreground text-sm">Loading classes...</div> : classes.length > 0 ? (
            <ul className="space-y-3">
              {classes.map(cls => {
                const sectionName = cls.section.replace(`(${cls.academic_year})`, '').trim();
                return (
                  <li key={cls.id} className="flex justify-between items-center">
                    <div><span className="font-medium">{cls.subject}</span><span className="text-muted-foreground"> ({sectionName})</span></div>
                    <Badge variant="secondary">{cls.academic_year}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : <div className="text-muted-foreground text-sm">You are not assigned to any classes.</div>}
        </CardContent>
      </Card>
    </div>
  );
};

interface StatCardProps { title: string; value: React.ReactNode; icon: React.ElementType; description?: string; variant?: 'default' | 'warning' | 'destructive'; }
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, variant = 'default' }) => {
  const iconColor = variant === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : variant === 'destructive' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground';
  const borderColor = variant === 'warning' ? 'border-yellow-500/50' : variant === 'destructive' ? 'border-red-500/50' : ''; 
  return (
    <Card className={`shadow-sm h-full ${borderColor}`}> 
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle><Icon className={`h-4 w-4 ${iconColor}`} /></CardHeader>
      <CardContent className="space-y-1"><div className="text-2xl font-bold">{value}</div>{description && <p className="text-xs text-muted-foreground">{description}</p>}</CardContent>
    </Card>
  );
};

export default Dashboard;