// src/pages/Behavior.tsx
// ⭐️ FULLY UPDATED AND FINALIZED FILE (Robust Grade/Section Logic) ⭐️

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
import { MessageCircle, ArrowLeft, User, Printer, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { useNavigate, useParams } from "react-router-dom";

// This path is correct
const WS_URL_PATH = "/ws/behavior/";

// Get the base WebSocket URL from environment variables
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

// --- ⭐️ UPDATED INTERFACES ⭐️ ---

interface SimpleStudent {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  current_grade: string | null;       // Data is likely here
  current_section_name: string | null; // Data is likely here
}

interface BehaviorRecord {
  id: number;
  student: SimpleStudent;
  grade: string;        // Might be null from backend
  section_name: string; // Might be null from backend
  date: string;
  category: string;
  offense_type: string;
  offense_count: number;
  description: string;
  action_taken?: string;
  action_taken_details?: string;
  reported_by?: string;
}

interface GroupedBehaviorRecord {
  student_id: number;
  student_lrn: string;
  student_display: string;
  grade: string;
  section_name: string;
  records: BehaviorRecord[];
}

interface StudentInfo {
  id: number;
  lrn: string;
  display: string;
  grade: string | null;
  section_name: string | null;
}
// --- ⭐️ END OF UPDATED INTERFACES ⭐️ ---


// (Offense categories and actions are unchanged and correct)
// ... (omitted for brevity, keep your consts here) ...


// =========================================================================
// --- VIEW 1: MAIN BEHAVIOR LIST ---
// =========================================================================
const BehaviorList = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatedRow, setUpdatedRow] = useState<number | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch behavior data
  const fetchBehaviorData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/behavior-records/");
      setRecords(res.data);
    } catch (err: any) {
      console.error("Error fetching behavior records:", err);
      toast({
        title: "Error fetching records",
        description:
          err.response?.data?.detail ||
          err.message ||
          "Failed to fetch behavior records.",
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

  // Setup WebSocket connection
  const setupWebSocket = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("No auth token found, cannot connect WebSocket.");
      return;
    }

    const fullWsUrl = `${WS_BASE_URL}${WS_URL_PATH}?token=${token}`;
    ws.current = new WebSocket(fullWsUrl);

    ws.current.onopen = () => {
      console.log("✅ Behavior WebSocket connected");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
    ws.current.onclose = (event) => {
      if (!event.wasClean && event.code !== 1000) {
        console.warn(
          `❌ WebSocket disconnected (Code: ${event.code}) — reconnecting...`
        );
        if (!reconnectTimer.current) {
          reconnectTimer.current = setTimeout(
            setupWebSocket,
            5000 + Math.random() * 2000
          );
        }
      } else {
        console.log("WebSocket closed cleanly or intentionally.");
      }
      ws.current = null;
    };
    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { action, behavior_record } = data as { action: string, behavior_record: BehaviorRecord };
        
        if (!action || !behavior_record || typeof behavior_record.id !== 'number' || !behavior_record.student || typeof behavior_record.student.id !== 'number') {
          console.warn("Received invalid WS message structure:", data);
          return;
        }

        setRecords((prev) => {
          let updatedRecords = [...prev];
          const index = updatedRecords.findIndex(
            (r) => r.id === behavior_record.id
          );

          if (action === "create") {
            if (index === -1) {
              updatedRecords = [behavior_record, ...updatedRecords];
            } else {
              updatedRecords[index] = {
                ...updatedRecords[index],
                ...behavior_record,
              };
            }
          } else if (action === "update") {
            if (index !== -1) {
              updatedRecords[index] = {
                ...updatedRecords[index],
                ...behavior_record,
              };
            }
          } else if (action === "delete") {
            updatedRecords = updatedRecords.filter(
              (r) => r.id !== behavior_record.id
            );
          }
          return updatedRecords;
        });

        if (action === "update" || action === "create") {
          setUpdatedRow(behavior_record.id);
        }
      } catch (e) {
        console.error("Error processing WebSocket message:", event.data, e);
      }
    };
  };

  useEffect(() => {
    fetchBehaviorData();
    setupWebSocket();
    return () => {
      console.log("Behavior component unmounting, closing WebSocket cleanly.");
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

  useEffect(() => {
    if (updatedRow !== null) {
      const timer = setTimeout(() => setUpdatedRow(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [updatedRow]);

  // ⭐️ --- UPDATED Grouping Logic (FIXED N/A) --- ⭐️
  const groupedRecords = useMemo(() => {
    const map: Record<number, GroupedBehaviorRecord> = {};
    records.forEach((r) => {
      if (!r || !r.student || !r.student.id) {
        console.warn("Skipping incomplete record in grouping:", r);
        return;
      }
      const studentId = r.student.id;
      if (!map[studentId]) {
        // ⭐️ FIX: Check Top Level AND Nested Level for Grade/Section
        const displayGrade = r.grade || r.student.current_grade || "N/A";
        const displaySection = r.section_name || r.student.current_section_name || "N/A";

        map[studentId] = {
          student_id: studentId,
          student_lrn: r.student.lrn,
          student_display: `${r.student.last_name}, ${r.student.first_name}`,
          grade: displayGrade,
          section_name: displaySection,
          records: [],
        };
      }
      map[studentId].records.push(r);
    });
    return Object.values(map).sort((a, b) =>
      a.student_display.localeCompare(b.student_display)
    );
  }, [records]);

  // ⭐️ --- UPDATED Search Filter --- ⭐️
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedRecords;
    const searchLower = search.toLowerCase().trim();
    return groupedRecords.filter((g) => {
      if (g.student_display.toLowerCase().includes(searchLower)) return true;
      if (g.student_lrn.toLowerCase().includes(searchLower)) return true;
      return g.records.some(
        (r) =>
          (r.category?.toLowerCase() || "").includes(searchLower) ||
          (r.offense_type?.toLowerCase() || "").includes(searchLower) ||
          (r.description?.toLowerCase() || "").includes(searchLower) ||
          (r.action_taken?.toLowerCase() || "").includes(searchLower) ||
          (r.reported_by?.toLowerCase() || "").includes(searchLower) ||
          (g.grade?.toLowerCase() || "").includes(searchLower) ||
          (g.section_name?.toLowerCase() || "").includes(searchLower)
      );
    });
  }, [groupedRecords, search]);

  if (loading)
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading behavior records...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Behavior Records
            </h1>
            <p className="text-muted-foreground">
              Track and manage student behavior incidents and actions
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <Input
            placeholder="Search by student, LRN, offense, grade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md"
          />
          <Button onClick={() => navigate("/behavior/add")}>+ Add Record</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Behavior Record List</CardTitle>
            <CardDescription>
              Grouped by student with incident history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredGroups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {search
                  ? "No behavior records found matching your search."
                  : "No behavior records found."}
              </p>
            ) : (
              <>
                {/* ⭐️ --- 1. DESKTOP TABLE (HIDDEN ON MOBILE) --- ⭐️ */}
                <div className="overflow-x-auto">
                  <table className="w-full border text-sm min-w-[700px] hidden md:table">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-semibold">Student</th>
                        <th className="p-2 text-left font-semibold">LRN</th>
                        <th className="p-2 text-center font-semibold">Grade & Section</th>
                        <th className="p-2 text-center font-semibold">Records</th>
                        <th className="p-2 text-center font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>{filteredGroups.map((g) => (
                      <React.Fragment key={g.student_id}>
                        <tr
                          className={`border-t hover:bg-muted/30 ${
                            updatedRow &&
                            g.records.some((r) => r.id === updatedRow)
                              ? "bg-yellow-100 dark:bg-yellow-900/20 transition-colors duration-300"
                              : ""
                          }`}
                        >
                          <td className="p-2">
                            <span className="font-medium">{g.student_display}</span>
                          </td>
                          <td className="p-2 text-left text-muted-foreground">
                            {g.student_lrn}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant="outline">
                              {g.grade} - {g.section_name || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">{g.records.length}</td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/behavior/history/${g.student_id}`)}
                              aria-label={`View history for ${g.student_display}`}
                            >
                              View History
                            </Button>
                          </td>
                        </tr>
                      </React.Fragment>
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
                        updatedRow && g.records.some((r) => r.id === updatedRow)
                          ? "bg-yellow-100 dark:bg-yellow-900/20"
                          : "bg-white dark:bg-card"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold">{g.student_display}</span>
                          <p className="text-sm text-muted-foreground">{g.student_lrn}</p>
                        </div>
                        <Badge variant="outline">{g.grade} - {g.section_name || "N/A"}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Records: {g.records.length}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/behavior/history/${g.student_id}`)}
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
// --- VIEW 2: STUDENT HISTORY "EXCEL TEMPLATE" VIEW ---
// =========================================================================
const StudentHistory: React.FC<{ student_pk: string }> = ({ student_pk }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = () => {
    window.print();
  };
  
  // Date/Time Formatters
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!student_pk) {
      toast({
        title: "Error",
        description: "No student ID provided.",
        variant: "destructive",
      });
      navigate("/behavior");
      return;
    }

    const fetchStudentHistory = async () => {
      setLoading(true);
      try {
        // ⬅️ FIX: Fetch records AND student data in parallel
        const recordsPromise = api.get(`/behavior-records/?student=${student_pk}`);
        const studentPromise = api.get(`/students/${student_pk}/`);
        
        const [recordsResponse, studentResponse] = await Promise.all([recordsPromise, studentPromise]);

        const recordsData: BehaviorRecord[] = recordsResponse.data || [];
        const studentData = studentResponse.data;

        setRecords(recordsData);
        
        // Prioritize data from /students/, otherwise try to get it from records
        if (studentData) {
           setStudentInfo({
            id: studentData.id,
            lrn: studentData.lrn,
            display: `${studentData.last_name}, ${studentData.first_name}`,
            grade: studentData.grade,
            section_name: studentData.section?.name || null,
          });
        } else if (recordsData.length > 0) {
          // Fallback logic for History view as well
          const firstRecord = recordsData[0];
          setStudentInfo({
            id: firstRecord.student.id,
            lrn: firstRecord.student.lrn,
            display: `${firstRecord.student.last_name}, ${firstRecord.student.first_name}`,
            // ⭐️ FIX: Check both top level and nested
            grade: firstRecord.grade || firstRecord.student.current_grade,
            section_name: firstRecord.section_name || firstRecord.student.current_section_name,
          });
        } else {
           toast({ title: "No Records", description: "No student or behavior records found." });
        }

      } catch (err: any) {
        console.error("Error fetching student behavior history:", err);
        toast({
          title: "Error fetching history",
          description: err.response?.data?.detail || err.message || "Failed to fetch records.",
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
            
            .print-offense-badge {
                color: #000 !important;
                font-weight: 500 !important;
                padding: 2px 6px !important;
                border-radius: 0px !important;
                border: none !important;
            }
            .print-offense-badge.minor {
                background-color: #e0e0e0 !important;
            }
            .print-offense-badge.major {
                background-color: #fce2e2 !important;
            }
          }
        `}
      </style>

      {/* Header (No Print) */}
      <div className="space-y-6 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Behavior History
              </h1>
              {studentInfo ? (
                <div className="text-muted-foreground text-lg">
                  {studentInfo.display} (LRN: {studentInfo.lrn})
                  <Badge variant="outline" className="ml-2">
                    {studentInfo.grade} - {studentInfo.section_name}
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading student info...</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-auto">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
            <Button variant="outline" onClick={() => navigate("/behavior")} className="flex-1 sm:flex-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to All Records
            </Button>
          </div>
        </div>
      </div>

      {/* Report Card (Printable) */}
      <Card className="printable-area mt-6">
        <CardHeader>
          {studentInfo && (
            <div className="pb-4 border-b">
              <h2 className="text-xl font-bold">{studentInfo.display}</h2>
              <p className="text-base text-muted-foreground">
                LRN: {studentInfo.lrn}
              </p>
              <p className="text-base text-muted-foreground">
                {studentInfo.grade} - {studentInfo.section_name}
              </p>
              <h1 className="text-2xl font-bold text-center mt-4">
                Behavioral Report
              </h1>
            </div>
          )}

          <div className="no-print pt-4">
            <CardTitle>All Incidents</CardTitle>
            <CardDescription>
              A complete log of all behavior incidents for this student.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No behavior records found for this student.
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
                      <th className="p-2 text-left font-semibold">Violation</th>
                      <th className="p-2 text-left font-semibold">Offense Type</th>
                      <th className="p-2 text-left font-semibold">Description</th>
                      <th className="p-2 text-left font-semibold">Action Taken</th>
                      <th className="p-2 text-left font-semibold">Reported By</th>
                      <th className="p-2 text-center font-semibold no-print">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>{records
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-2 whitespace-nowrap">
                          {formatDate(r.date)}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {formatTime(r.date)}
                        </td>
                        <td className="p-2">{r.category || "-"}</td>
                        <td className="p-2">
                          <Badge
                            className={`print-offense-badge rounded-none ${
                              r.offense_type === "Major"
                                ? "bg-destructive text-destructive-foreground major"
                                : "bg-secondary text-secondary-foreground minor"
                            }`}
                          >
                            {r.offense_type} ({r.offense_count})
                          </Badge>
                        </td>
                        <td className="p-2 min-w-[150px]">
                          {r.description || "-"}
                        </td>
                        <td className="p-2 min-w-[150px]">
                          <p className="font-medium">{r.action_taken || "-"}</p>
                          {r.action_taken_details && (
                            <p className="text-xs text-muted-foreground mt-1">{r.action_taken_details}</p>
                          )}
                        </td>
                        <td className="p-2">{r.reported_by || "-"}</td>
                        <td className="p-2 text-center no-print">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/behavior/edit/${r.id}`)}
                            aria-label={`Edit record ${r.id}`}
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
                {records
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((r) => (
                    <div key={r.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">{formatDate(r.date)}</p>
                          <p className="text-sm text-muted-foreground">{formatTime(r.date)}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => navigate(`/behavior/edit/${r.id}`)}
                          aria-label={`Edit record ${r.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="font-medium text-muted-foreground">Violation</p>
                          <p>{r.category || "-"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Offense Type</p>
                          <p>
                            <Badge
                              className={`print-offense-badge rounded-none ${
                                r.offense_type === "Major"
                                  ? "bg-destructive text-destructive-foreground major"
                                  : "bg-secondary text-secondary-foreground minor"
                              }`}
                            >
                              {r.offense_type} ({r.offense_count})
                            </Badge>
                          </p>
                        </div>
                          <div>
                          <p className="font-medium text-muted-foreground">Description</p>
                          <p>{r.description || "-"}</p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Action Taken</p>
                          <p>{r.action_taken || "-"}</p>
                          {r.action_taken_details && (
                            <p className="text-xs text-muted-foreground/80 mt-1">{r.action_taken_details}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Reported By</p>
                          <p>{r.reported_by || "-"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>

        {/* --- SIGNATURE BLOCK --- */}
        <div className="hidden print:flex justify-between mt-24 pt-8 px-12">
          <div className="w-2/5 text-center">
            <p className="border-t border-gray-900 pt-2 font-medium text-sm">
              Guidance Counselor
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

const Behavior = () => {
  const { student_pk } = useParams<{ student_pk: string }>();

  if (student_pk) {
    return <StudentHistory student_pk={student_pk} />;
  }

  return <BehaviorList />;
};

export default Behavior;