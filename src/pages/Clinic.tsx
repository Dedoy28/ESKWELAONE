// src/pages/Clinic.tsx
// ⭐️ FULLY UPDATED AND FINALIZED FILE ⭐️

import React, { useEffect, useState, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ArrowLeft, User, Printer, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { useNavigate, useParams } from "react-router-dom";

// Get the base WebSocket URL from environment variables
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
// Use the correct Clinic WebSocket URL from your config
const WS_URL_PATH = "/ws/clinic/";


// --- ⭐️ UPDATED INTERFACES ⭐️ ---

// This is the nested student object, from SimpleStudentSerializer
interface SimpleStudent {
  id: number;
  lrn: string; // ⬅️ FIX: Was student_id
  first_name: string;
  last_name: string;
  current_grade: string | null;
  current_section_name: string | null;
}

// This is the main ClinicVisit object from ClinicVisitSerializer
interface ClinicVisit {
  id: number;
  student: SimpleStudent; // ⬅️ FIX: Uses new SimpleStudent interface
  grade: string; // ⬅️ FIX: This is sent at the top level
  section_name: string; // ⬅️ FIX: This is sent at the top level
  visit_date: string; // This is a DateTime string
  illness: string;
  treatment?: string;
  treatment_details?: string;
  notes?: string;
  attended_by?: string;
}

// This interface is built from the correct ClinicVisit
interface GroupedClinicVisit {
  student_id: number;
  student_lrn: string; // ⬅️ FIX: Added LRN
  student_display: string;
  grade: string;
  section_name: string;
  visits: ClinicVisit[];
}

// This is used for the StudentHistory page header
interface StudentInfo {
  id: number;
  lrn: string;
  display: string;
  grade: string | null;
  section_name: string | null;
}
// --- ⭐️ END OF UPDATED INTERFACES ⭐️ ---


// =========================================================================
// --- VIEW 1: MAIN CLINIC LIST ---
// =========================================================================
const ClinicList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatedRow, setUpdatedRow] = useState<number | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch clinic data
  const fetchClinicData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clinic-visits/");
      setVisits(res.data);
    } catch (err: any) {
      console.error("Error fetching clinic visits:", err);
      toast({
        title: "Error fetching visits",
        description: err.response?.data?.detail || err.message || "Failed to fetch clinic visits.",
        variant: "destructive",
      });
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket connection (Your fix was correct)
  const setupWebSocket = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No auth token found, cannot connect WebSocket.");
      return;
    }
    
    // This now uses the WS_BASE_URL from the top of the file
    const fullWsUrl = `${WS_BASE_URL}${WS_URL_PATH}?token=${token}`;
    ws.current = new WebSocket(fullWsUrl);

    ws.current.onopen = () => console.log("✅ Clinic WebSocket connected");
    ws.current.onclose = (event) => {
      if (!event.wasClean && event.code !== 1000) {
        console.warn(`❌ WebSocket disconnected (Code: ${event.code}) — reconnecting...`);
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(setupWebSocket, 5000 + Math.random() * 2000);
        }
      } else {
        console.log("WebSocket closed cleanly or intentionally.");
      }
      ws.current = null;
    };
    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      if (ws.current) ws.current.close();
      ws.current = null;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { action, clinic_visit } = data as { action: string, clinic_visit: ClinicVisit }; 
        
        if (!action || !clinic_visit || !clinic_visit.id || !clinic_visit.student) {
          console.warn("Received invalid WS message structure:", data);
          return;
        }

        setVisits((prev) => {
          let updatedVisits = [...prev];
          const index = updatedVisits.findIndex((v) => v.id === clinic_visit.id);

          if (action === "create") {
            if (index === -1) {
              updatedVisits = [clinic_visit, ...updatedVisits];
            } else {
              updatedVisits[index] = { ...updatedVisits[index], ...clinic_visit };
            }
          } else if (action === "update") {
            if (index !== -1) {
              updatedVisits[index] = { ...updatedVisits[index], ...clinic_visit };
            }
          } else if (action === "delete") {
            updatedVisits = updatedVisits.filter((v) => v.id !== clinic_visit.id);
          }
          return updatedVisits;
        });

        if (action === "update" || action === "create") {
          setUpdatedRow(clinic_visit.id);
        }
      } catch (e) {
        console.error("Error processing WebSocket message:", event.data, e);
      }
    };
  };
  
  // Connect on mount
  useEffect(() => {
    fetchClinicData();
    setupWebSocket();
    return () => {
      console.log("Clinic component unmounting, closing WebSocket cleanly.");
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
        ws.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, []);

  // Highlight updated row
  useEffect(() => {
    if (updatedRow !== null) {
      const timer = setTimeout(() => setUpdatedRow(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [updatedRow]);

  // ⭐️ --- UPDATED Grouping Logic --- ⭐️
  const groupedVisits = useMemo(() => {
    const map: Record<number, GroupedClinicVisit> = {};
    visits.forEach((v) => {
      // ⬅️ FIX: Check the new, correct data structure
      if (!v || !v.student || !v.student.id) {
        console.warn("Skipping incomplete visit in grouping:", v);
        return;
      }
      const studentId = v.student.id;
      if (!map[studentId]) {
        map[studentId] = {
          student_id: studentId,
          student_lrn: v.student.lrn, // ⬅️ FIX: Get LRN
          student_display: `${v.student.last_name}, ${v.student.first_name}`,
          grade: v.grade || "N/A", // ⬅️ FIX: Get grade from top level
          section_name: v.section_name || "N/A", // ⬅️ FIX: Get section_name from top level
          visits: [],
        };
      }
      map[studentId].visits.push(v);
    });
    return Object.values(map).sort((a, b) =>
      a.student_display.localeCompare(b.student_display)
    );
  }, [visits]);

  // ⭐️ --- UPDATED Search Filter --- ⭐️
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedVisits;
    const searchLower = search.toLowerCase().trim();
    return groupedVisits.filter((g) => {
      if (g.student_display.toLowerCase().includes(searchLower)) return true;
      if (g.student_lrn.toLowerCase().includes(searchLower)) return true; // ⬅️ FIX: Search by LRN
      return g.visits.some(
        (v) =>
          (v.illness?.toLowerCase() || "").includes(searchLower) ||
          (v.treatment?.toLowerCase() || "").includes(searchLower) ||
          (v.notes?.toLowerCase() || "").includes(searchLower) ||
          (v.attended_by?.toLowerCase() || "").includes(searchLower) ||
          (g.grade?.toLowerCase() || "").includes(searchLower) ||
          (g.section_name?.toLowerCase() || "").includes(searchLower)
      );
    });
  }, [groupedVisits, search]);

  if (loading)
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading clinic visits...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clinic Visits</h1>
            <p className="text-muted-foreground">
              Track and manage student health records and clinic visits
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Input
            placeholder="Search by student, LRN, illness, grade..." // ⬅️ FIX: Updated placeholder
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md"
          />
          <Button onClick={() => navigate("/clinic/add")}>+ Add Visit</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clinic Visit Records</CardTitle>
            <CardDescription>
              Grouped by student with visit history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGroups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {search ? "No clinic visits found matching your search." : "No clinic visits recorded."}
              </p>
            ) : (
              <>
                {/* ⭐️ --- 1. DESKTOP TABLE (HIDDEN ON MOBILE) --- ⭐️ */}
                <div className="overflow-x-auto">
                  <table className="w-full border text-sm min-w-[700px] hidden md:table">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-semibold">Student</th>
                        <th className="p-2 text-left font-semibold">LRN</th> {/* ⬅️ FIX: Added LRN Column */}
                        <th className="p-2 text-center font-semibold">Grade & Section</th>
                        <th className="p-2 text-center font-semibold">Visits</th>
                        <th className="p-2 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGroups.map((g) => (
                        <tr
                          key={g.student_id}
                          className={`border-t hover:bg-muted/30 ${
                            updatedRow && g.visits.some((v) => v.id === updatedRow)
                              ? "bg-yellow-100 dark:bg-yellow-900/20 transition-colors duration-300"
                              : ""
                          }`}
                        >
                          <td className="p-2">
                            <span className="font-medium">{g.student_display}</span>
                          </td>
                          <td className="p-2 text-left text-muted-foreground">
                            {g.student_lrn} {/* ⬅️ FIX: Render LRN */}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline">{g.grade} - {g.section_name || "N/A"}</Badge> {/* ⬅️ FIX: Render new fields */}
                          </td>
                          <td className="p-2 text-center">{g.visits.length}</td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/clinic/history/${g.student_id}`)}
                              aria-label={`View history for ${g.student_display}`}
                            >
                              View History
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ⭐️ --- 2. MOBILE CARD LIST (HIDDEN ON DESKTOP) --- ⭐️ */}
                <div className="space-y-4 md:hidden">
                  {filteredGroups.map((g) => (
                    <div
                      key={g.student_id}
                      className={`border rounded-lg p-4 ${
                        updatedRow && g.visits.some((v) => v.id === updatedRow)
                          ? "bg-yellow-100 dark:bg-yellow-900/20"
                          : "bg-white dark:bg-card"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold">{g.student_display}</span>
                          <p className="text-sm text-muted-foreground">{g.student_lrn}</p> {/* ⬅️ FIX: Added LRN */}
                        </div>
                        <Badge variant="outline">{g.grade} - {g.section_name || "N/A"}</Badge> {/* ⬅️ FIX: Render new fields */}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Visits: {g.visits.length}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/clinic/history/${g.student_id}`)}
                          aria-label={`View history for ${g.student_display}`}
                        >
                          View History
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// =========================================================================
// --- VIEW 2: STUDENT HISTORY VIEW (MODIFIED) ---
// =========================================================================
const StudentHistory: React.FC<{ student_pk: string }> = ({ student_pk }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (!student_pk) {
      toast({ title: "Error", description: "No student ID provided.", variant: "destructive" });
      navigate("/clinic");
      return;
    }

    const fetchStudentHistory = async () => {
      setLoading(true);
      try {
        // ⬅️ FIX: Fetch visits AND student data in parallel
        const visitsPromise = api.get(`/clinic-visits/?student=${student_pk}`);
        const studentPromise = api.get(`/students/${student_pk}/`);
        
        const [visitsResponse, studentResponse] = await Promise.all([visitsPromise, studentPromise]);
        
        const visitsData: ClinicVisit[] = visitsResponse.data || [];
        const studentData = studentResponse.data; // This is StudentData from StudentManagement

        setVisits(visitsData);

        // ⬅️ FIX: Set student info from the reliable /students/ endpoint
        if (studentData) {
           setStudentInfo({
            id: studentData.id,
            lrn: studentData.lrn,
            display: `${studentData.last_name}, ${studentData.first_name}`,
            grade: studentData.grade, // Uses the dynamic field
            section_name: studentData.section?.name || null, // Uses the dynamic field
          });
        } else if (visitsData.length > 0) {
          // Fallback just in case /students/ fails but /clinic-visits/ works
          const firstVisit = visitsData[0];
          setStudentInfo({
            id: firstVisit.student.id,
            lrn: firstVisit.student.lrn,
            display: `${firstVisit.student.last_name}, ${firstVisit.student.first_name}`,
            grade: firstVisit.grade,
            section_name: firstVisit.section_name,
          });
        } else {
           toast({ title: "No Records", description: "No student or clinic visits found." });
        }

      } catch (err: any) {
        console.error("Error fetching student clinic history:", err);
        toast({
          title: "Error fetching history",
          description: err.response?.data?.detail || err.message || "Failed to fetch visits.",
          variant: "destructive",
        });
        if (err.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentHistory();
  }, [student_pk, navigate, toast]);

  // Helper for formatting date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper for formatting time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading student history...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body > * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
              box-shadow: none;
              border: none;
            }
            .no-print {
              display: none !important;
            }
            .print-table {
              display: table !important;
              width: 100% !important;
              min-width: 0 !important;
            }
            .print-table th, .print-table td {
              padding: 8px 4px !important;
              font-size: 10pt !important;
              text-align: left !important;
              border-bottom: 1px solid #ccc;
            }
            .print-table th {
              font-weight: 600 !important;
              background-color: #f4f4f4 !important;
            }
            .print-hidden {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="space-y-6 no-print">
        {/* Header and Back Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Clinic Visit History
              </h1>
              {studentInfo ? (
                <div className="text-muted-foreground text-lg">
                  {studentInfo.display} (LRN: {studentInfo.lrn}) {/* ⬅️ FIX: Added LRN */}
                  <Badge variant="outline" className="ml-2">
                    {studentInfo.grade} - {studentInfo.section_name} {/* ⬅️ FIX: Use new fields */}
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">Student Info Not Found</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-auto">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" onClick={() => navigate("/clinic")} className="flex-1 sm:flex-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Visits
            </Button>
          </div>
        </div>
      </div>

      <Card className="printable-area mt-6">
        <CardHeader>
          {/* This header will show on the printed report */}
          {studentInfo && (
            <div className="pb-4 border-b">
              <h2 className="text-xl font-bold">{studentInfo.display}</h2>
              <p className="text-base text-muted-foreground">
                LRN: {studentInfo.lrn} {/* ⬅️ FIX: Added LRN */}
              </p>
              <p className="text-base text-muted-foreground">
                {studentInfo.grade} - {studentInfo.section_name} {/* ⬅️ FIX: Use new fields */}
              </p>
              <h1 className="text-2xl font-bold text-center mt-4">
                Clinic Visit Report
              </h1>
            </div>
          )}

          {/* This part will be hidden on print */}
          <div className="no-print pt-4">
            <CardTitle>All Visits</CardTitle>
            <CardDescription>
              A complete log of all clinic visits for this student.
            </CardDescription> 
          </div>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No clinic visits found for this student.
            </p>
          ) : (
            <>
              {/* DESKTOP/PRINT TABLE (Hidden on Mobile) */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px] hidden md:table print-table">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left font-semibold">Date</th>
                      <th className="p-2 text-left font-semibold">Time</th>
                      <th className="p-2 text-left font-semibold">Illness / Symptoms</th>
                      <th className="p-2 text-left font-semibold">Treatment</th>
                      <th className="p-2 text-left font-semibold">Notes</th>
                      <th className="p-2 text-left font-semibold">Attended By</th>
                      <th className="p-2 text-center font-semibold no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits
                      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
                      .map((v) => (
                        <tr key={v.id} className="border-t hover:bg-muted/20">
                          <td className="p-2 whitespace-nowrap">{formatDate(v.visit_date)}</td>
                          <td className="p-2 whitespace-nowrap">{formatTime(v.visit_date)}</td>
                          <td className="p-2 min-w-[150px]">{v.illness || "-"}</td>
                          <td className="p-2 min-w-[150px]">
                            <p className="font-medium">{v.treatment || "-"}</p>
                            {v.treatment_details && (
                              <p className="text-xs text-muted-foreground mt-1">{v.treatment_details}</p>
                            )}
                          </td>
                          <td className="p-2 min-w-[150px]">{v.notes || "-"}</td>
                          <td className="p-2">{v.attended_by || "-"}</td>
                          <td className="p-2 text-center no-print">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => navigate(`/clinic/edit/${v.id}`)}
                              aria-label={`Edit visit ${v.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST (Hidden on Desktop & Print) */}
              <div className="md:hidden space-y-4 print-hidden">
                {visits
                  .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime())
                  .map((v) => (
                    <div key={v.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-bold">{formatDate(v.visit_date)}</p>
                          <p className="text-sm text-muted-foreground">{formatTime(v.visit_date)}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/clinic/edit/${v.id}`)}
                          aria-label={`Edit visit ${v.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="font-medium text-muted-foreground">Illness</p>
                          <p>{v.illness || "-"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Treatment</p>
                          <p>{v.treatment || "-"}</p>
                          {v.treatment_details && (
                            <p className="text-xs text-muted-foreground/80 mt-1">{v.treatment_details}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Notes</p>
                          <p>{v.notes || "-"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Attended By</p>
                          <p>{v.attended_by || "-"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>

        {/* --- ADDED SIGNATURE BLOCK --- */}
        <div className="hidden print:flex justify-between mt-24 pt-8 px-12">
          <div className="w-2/5 text-center">
            <p className="border-t border-gray-900 pt-2 font-medium text-sm">
              School Nurse
            </p>
          </div>
          <div className="w-2/5 text-center">
            <p className="border-t border-gray-900 pt-2 font-medium text-sm">
              School Head
            </p>
          </div>
        </div>
        {/* --- END SIGNATURE BLOCK --- */}

      </Card>
    </DashboardLayout>
  );
};

// =========================================================================
// --- MAIN EXPORTED COMPONENT (Router) ---
// =========================================================================
const Clinic = () => {
  const { student_pk } = useParams<{ student_pk: string }>();

  if (student_pk) {
    return <StudentHistory student_pk={student_pk} />;
  }

  return <ClinicList />;
};

export default Clinic;