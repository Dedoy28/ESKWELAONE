// src/pages/Grades.tsx (FIXED: Removed whitespace/comments inside TableRow)

import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Eye,
  Users,
  BookMarked,
  Settings,
  Loader2,
} from "lucide-react";

// --- INTERFACES ---
interface Section {
  id: number;
  name: string;
  school_year: string;
  grade: string;
  adviser_name: string | null;
}

interface SectionEnrollment {
  id: number;
  section: Section;
  school_year: string;
  is_active: boolean;
}

interface Student {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  email?: string;
  phone?: string;
  grade: string | null;
  section: Section | null;
  section_history: SectionEnrollment[];
  current_enrollment: SectionEnrollment | null;
}

interface TeacherClass {
  id: number;
  subject: string;
  section: string;
  academic_year: string;
}

// --- DYNAMIC URLS ---
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const API_URL_STUDENTS = `${API_BASE}/students/`;
const API_URL_TEACHER_CLASSES = `${API_BASE}/teacher/my-classes/`;
const WS_URL = `${WS_BASE_URL}/ws/students/`;

const GradesPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);

  // Role state
  const [userRole, setUserRole] = useState<string | null>(null);

  // --- Admin State ---
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // --- Teacher State ---
  const [classes, setClasses] = useState<TeacherClass[]>([]);

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    setUserRole(role);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (userRole) {
      setLoading(true);
      if (userRole === "admin" || userRole === "registrar") {
        fetchStudents().then(() => {
          if (isMounted) {
            connectWebSocket();
            setLoading(false);
          }
        }).catch(() => {
          if (isMounted) setLoading(false);
        });
      } else if (userRole === "teacher") {
        fetchTeacherClasses().finally(() => {
            if (isMounted) setLoading(false);
        });
      } else {
        console.warn("Unknown user role:", userRole);
        if (isMounted) setLoading(false);
      }
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      console.log("GradesPage unmounting, closing WebSocket.");
      ws.current?.close(1000, "Component unmounted");
      ws.current = null;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [userRole]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");
      
      const params = new URLSearchParams();
      if (gradeFilter !== "all") params.append("section_enrollments__section__grade", gradeFilter);
      if (sectionFilter !== "all") params.append("section_enrollments__section__name", sectionFilter);
      params.append("is_active", "true");

      const response = await axios.get(`${API_URL_STUDENTS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to fetch student records. Please check connection or log in again.",
        variant: "destructive",
      });
      setStudents([]);
    }
  };

  const fetchTeacherClasses = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");

      const response = await axios.get(API_URL_TEACHER_CLASSES, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(response.data);
    } catch (error) {
      console.error("Error fetching teacher classes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your assigned classes. Please check connection or log in again.",
        variant: "destructive",
      });
      setClasses([]);
    }
  };

  const connectWebSocket = () => {
    if (ws.current || (userRole !== "admin" && userRole !== "registrar")) {
      return;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("Grades WebSocket: No access token found. Cannot connect.");
      return;
    }

    const wsUrlWithToken = `${WS_URL}?token=${encodeURIComponent(token)}`;
    console.log("Attempting to connect WebSocket:", wsUrlWithToken);
    try {
      ws.current = new WebSocket(wsUrlWithToken);
    } catch (error) {
      console.error("WebSocket connection failed:", error);
      ws.current = null;
      attemptReconnect();
      return;
    }

    ws.current.onopen = () => {
      console.log("Grades WebSocket connected ✅");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WS Message Received:", data);
        const { action, student } = data;

        if (!student || typeof student.id === 'undefined') {
          console.warn("Received WS message without valid student data:", data);
          return;
        }

        setStudents((prev) => {
          let updated: Student[] = [...prev];
          const studentIndex = updated.findIndex((s) => s.id === student.id);

          if (action === "updated" || action === "status_changed") {
            if (studentIndex !== -1) {
              updated[studentIndex] = { ...updated[studentIndex], ...student };
            } else {
              updated.push(student as Student);
            }
          } else if (action === "created") {
            if (studentIndex === -1) {
              updated.push(student as Student);
            }
          } else if (action === "deleted") {
            updated = updated.filter((s) => s.id !== student.id);
          } else {
            console.warn("Unknown WS action:", action);
          }

          if (student?.id) {
            setHighlightedId(student.id);
            setTimeout(() => setHighlightedId(null), 2000);
          }
          return updated;
        });
      } catch (e) {
        console.error("Error processing WS message:", event.data, e);
      }
    };

    ws.current.onclose = (event) => {
      console.warn(`Grades WebSocket disconnected (Code: ${event.code}, Clean: ${event.wasClean}) ❌`);
      ws.current = null;
      if (!event.wasClean && (userRole === "admin" || userRole === "registrar")) {
        attemptReconnect();
      }
    };

    ws.current.onerror = (err) => {
      console.error("Grades WebSocket error:", err);
    };
  };

  const attemptReconnect = () => {
    if (!reconnectTimer.current && (userRole === "admin" || userRole === "registrar")) {
      console.log("Attempting WebSocket reconnect in 5 seconds...");
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        connectWebSocket();
      }, 5000);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`.toLowerCase().trim();
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        !searchTerm ||
        fullName.includes(searchLower) ||
        (student.lrn && student.lrn.toLowerCase().includes(searchLower)) ||
        (student.email && student.email.toLowerCase().includes(searchLower));

      const matchesGrade = gradeFilter === "all" || student.grade === gradeFilter;
      const matchesSection = sectionFilter === "all" || (student.section && student.section.name === sectionFilter);

      return matchesSearch && matchesGrade && matchesSection;
    });
  }, [students, searchTerm, gradeFilter, sectionFilter]);


  const maleStudents = useMemo(() => {
    return filteredStudents.filter(s => s.gender?.toLowerCase() === "male")
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [filteredStudents]);
  
  const femaleStudents = useMemo(() => {
    return filteredStudents.filter(s => s.gender?.toLowerCase() === "female")
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [filteredStudents]);

  const renderAdminStudentTable = (studentsList: Student[]) => (
    <div className="overflow-x-auto rounded-md border">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">LRN</TableHead>
            <TableHead className="text-center">Full Name</TableHead>
            <TableHead className="text-center">Grade & Section</TableHead>
            <TableHead className="text-center">Email</TableHead>
            <TableHead className="text-center">Phone</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentsList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No students found matching filters.
              </TableCell>
            </TableRow>
          ) : (
            studentsList.map((student) => (
              <TableRow
                key={student.id}
                className={`hover:bg-muted/30 transition-colors ${
                  highlightedId === student.id ? "bg-yellow-100 dark:bg-yellow-900/30" : ""
                }`}
              >
                <TableCell className="text-center">{student.lrn}</TableCell>
                <TableCell className="text-center">
                  {student.last_name}, {student.first_name} {student.middle_name || ""}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">
                    {student.grade ? `Grade ${student.grade}` : 'N/A'} - {student.section?.name || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{student.email || "N/A"}</TableCell>
                <TableCell className="text-center">{student.phone || "N/A"}</TableCell>
                <TableCell className="text-center flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/students/${student.id}/grades`)}
                    aria-label={`View grades for ${student.first_name} ${student.last_name}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Grades
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderAdminDashboard = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, LRN, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search students"
              />
            </div>
            
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full md:w-[180px]" aria-label="Filter by grade level">
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {[7, 8, 9, 10].map((g) => (
                  <SelectItem key={g} value={g.toString()}>
                    Grade {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full md:w-[180px]" aria-label="Filter by section">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {[...new Set(students
                  .filter(s => gradeFilter === 'all' || s.grade === gradeFilter)
                  .map(s => s.section?.name)
                  .filter(Boolean)
                )]
                  .sort()
                  .map((sName) => (
                    <SelectItem key={sName} value={sName!}>
                      Section {sName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button onClick={fetchStudents} disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Search</>
              )}
            </Button>

          </div>
        </CardContent>
      </Card>

      {maleStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <CardTitle>Male Students</CardTitle>
              <Badge variant="secondary">{maleStudents.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>{renderAdminStudentTable(maleStudents)}</CardContent>
        </Card>
      )}

      {femaleStudents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pink-600" />
              <CardTitle>Female Students</CardTitle>
              <Badge variant="secondary">{femaleStudents.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>{renderAdminStudentTable(femaleStudents)}</CardContent>
        </Card>
      )}

      {filteredStudents.length === 0 && students.length > 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No students found matching your current search, grade, and section filters.
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderTeacherDashboard = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" />
          <CardTitle>My Classes</CardTitle>
        </div>
        <CardDescription>
          Select one of your assigned classes to view the roster and manage grades.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>School Year</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    You have not been assigned to any classes. Contact admin if this is incorrect.
                  </TableCell>
                </TableRow>
              ) : (
                classes.map((cls) => (
                  <TableRow key={cls.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{cls.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cls.section}</Badge>
                    </TableCell>
                    <TableCell>{cls.academic_year}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => navigate(`/grades/class-roster/${cls.id}`)}
                        aria-label={`Open grade sheet for ${cls.subject} ${cls.section}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Open Grade Sheet
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grades Management</h1>
            <p className="text-muted-foreground">
              {userRole === "teacher"
                ? "View your assigned classes and manage student grades."
                : userRole === "admin" || userRole === "registrar"
                ? "Manage and view all student grade records."
                : "Grade information"}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {(userRole === "admin" || userRole === "registrar") && (
              <>
                <Button onClick={() => navigate("/admin/manage-classes")}>
                  <Settings className="w-4 h-4 mr-2" /> Manage Classes
                </Button>
              </>
            )}
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground flex items-center justify-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading...
            </CardContent>
          </Card>
        )}

        {!loading && (userRole === "admin" || userRole === "registrar") && renderAdminDashboard()}
        
        {!loading && userRole === "teacher" && renderTeacherDashboard()}

        {!loading && !userRole && (
          <Card>
            <CardContent className="p-6 text-center text-destructive">
              Error: User role not found or recognized. Please log in again or contact support.
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
};

export default GradesPage;