// src/pages/StudentGradesManager.tsx
// ⭐️ FULL UPDATED FILE (CLEANED) ⭐️

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios"; // Your central API client
import { WS_BASE_URL } from "@/lib/config"; // Your WebSocket config
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// --- Configuration ---
const REQUIRED_SUBJECTS = [
  "Filipino",
  "English",
  "Mathematics",
  "Science",
  "Araling Panlipunan (AP)",
  "Edukasyon sa Pagpapakatao (EsP)",
  "Technology and Livelihood Education (TLE)",
  "MAPEH",
];
// --- End Configuration ---

// --- Interfaces ---
interface Enrollment {
  id: number;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  final_grade?: number | null;
  pre_final?: number | null;
  is_finalized?: boolean;
  subject_name: string;
  teacher_name: string;
  section_name: string;
  academic_year: string;
}

// ⭐️ FIX: This interface is now synced with your backend's StudentGradesSerializer
interface Student {
  id: number;
  lrn: string; // ⬅️ WAS: student_id
  first_name: string;
  last_name: string;
  grade: string | null; // ⬅️ WAS: string (now nullable)
  section: string | null; // ⬅️ WAS: string (now nullable)
  gender: string;
  general_average?: number | null;
  enrollments: Enrollment[];
}
// --- End Interfaces ---

// --- Component ---
const StudentGradesManager = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedRow, setUpdatedRow] = useState<number | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // --- WebSocket Setup ---
  const setupWebSocket = (studentId: string) => {
    if (!studentId || ws.current?.readyState === WebSocket.OPEN) return;
    if (ws.current) {
      ws.current.close(1000, "Reconnecting");
      ws.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      console.error("WS: No token.");
      attemptWebSocketReconnect(studentId);
      return;
    }

    const wsUrlWithToken = `${WS_BASE_URL}/ws/students/?token=${encodeURIComponent(
      token
    )}`;
    console.log("WS: Connecting to:", wsUrlWithToken);

    try {
      ws.current = new WebSocket(wsUrlWithToken);
    } catch (error) {
      console.error("WS: Connection failed:", error);
      ws.current = null;
      attemptWebSocketReconnect(studentId);
      return;
    }

    ws.current.onopen = () => {
      console.log(`WS: Connected ✅`);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
    ws.current.onclose = (event) => {
      console.warn(
        `WS: Disconnected (Code: ${event.code}, Clean: ${event.wasClean}) ❌`
      );
      ws.current = null;
      if (id && !event.wasClean) {
        attemptWebSocketReconnect(id);
      }
    };
    ws.current.onerror = (error) => {
      console.error(`WS: Error:`, error);
      if (id) attemptWebSocketReconnect(id);
    };
    ws.current.onmessage = handleWebSocketMessage;
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log("WS: Received:", data);

      if (data.student_id === Number(id)) {
        if (data.type === "enrollment_update" && data.enrollment) {
          updateEnrollmentState(data.enrollment);
          if (data.general_average !== undefined)
            updateStudentAverage(data.general_average);
          highlightRow(data.enrollment.id);
        } else if (data.type === "enrollment_deleted") {
          removeEnrollmentState(data.enrollment_id);
          if (data.general_average !== undefined)
            updateStudentAverage(data.general_average);
        } else if (data.type === "student_update" && data.student) {
          updateStudentState(data.student);
        }
      }
    } catch (e) {
      console.error("WS: Error processing message:", event.data, e);
    }
  };

  const updateEnrollmentState = (updatedEnrollment: Enrollment) => {
    setEnrollments((prev) =>
      prev.map((e) =>
        e.id === updatedEnrollment.id ? { ...e, ...updatedEnrollment } : e
      )
    );
  };

  const removeEnrollmentState = (enrollmentId: number) => {
    setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
  };

  const updateStudentAverage = (average: number | null) => {
    setStudent((prev) => (prev ? { ...prev, general_average: average } : null));
  };

  const updateStudentState = (updatedStudentData: Partial<Student>) => {
    setStudent((prev) => (prev ? { ...prev, ...updatedStudentData } : null));
    if (updatedStudentData.enrollments && Array.isArray(updatedStudentData.enrollments)) {
      setEnrollments(updatedStudentData.enrollments);
    }
  };

  const highlightRow = (enrollmentId: number) => {
    setUpdatedRow(enrollmentId);
    setTimeout(() => setUpdatedRow(null), 2000);
  };

  const attemptWebSocketReconnect = (studentId: string) => {
    if (!reconnectTimer.current && studentId) {
      console.log("WS: Attempting reconnect in 5s...");
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        console.log("WS: Retrying connection...");
        setupWebSocket(studentId);
      }, 5000);
    }
  };

  // --- Initial Data Fetch ---
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      if (!id) {
        toast({
          title: "Error",
          description: "Student ID missing.",
          variant: "destructive",
        });
        if (isMounted) setLoading(false);
        navigate("/grades");
        return;
      }

      try {
        const response = await api.get(`/students/${id}/grades/`);

        if (!isMounted) return;

        const fetchedStudent: Student = response.data;
        if (!fetchedStudent || typeof fetchedStudent !== "object") {
          throw new Error("Invalid student data received");
        }

        setStudent(fetchedStudent);
        setEnrollments(
          Array.isArray(fetchedStudent.enrollments)
            ? fetchedStudent.enrollments
            : []
        );
        setupWebSocket(id);
      } catch (err: any) {
        console.error("Fetch Data Error:", err);
        if (isMounted) {
          toast({
            title: "Error Fetching Data",
            description:
              err.response?.data?.detail || "Could not load student report card.",
            variant: "destructive",
          });
          if (err.response?.status === 404 || err.response?.status === 401) {
            navigate(err.response?.status === 401 ? "/login" : "/grades");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    // Cleanup
    return () => {
      isMounted = false;
      console.log("StudentGradesManager unmounting, closing WebSocket.");
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close(1000, "Component unmounted");
        ws.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [id, navigate, toast]);

  // --- Event Handlers ---
  const handleDelete = async (enrollmentIdToDelete: number) => {
    if (!student?.id || !isAdminOrRegistrar) return;
    if (!confirm(`Permanently delete this grade record? This cannot be undone.`))
      return;

    try {
      await api.delete(`/enrollments/${enrollmentIdToDelete}/`);
      removeEnrollmentState(enrollmentIdToDelete);
      toast({ title: "Success", description: "Enrollment record deleted." });
    } catch (err: any) {
      console.error("Delete Error:", err);
      toast({
        title: "Deletion Failed",
        description:
          err.response?.data?.detail || "Could not delete enrollment record.",
        variant: "destructive",
      });
    }
  };

  // --- Calculations ---
  const computedOverallAverage = useMemo(() => {
    if (!enrollments || enrollments.length === 0) return null;
    
    const subjectsWithFinal = enrollments.filter(
      (e) => e.final_grade !== null && e.final_grade !== undefined
    );
    if (subjectsWithFinal.length === 0) return null;
    const sum = subjectsWithFinal.reduce(
      (acc, e) => acc + (Number(e.final_grade!) || 0),
      0
    );
    return (sum / subjectsWithFinal.length).toFixed(2);
  }, [enrollments]);

  const displayOverallAverage =
    student?.general_average !== null && student?.general_average !== undefined
      ? Number(student.general_average).toFixed(2)
      : computedOverallAverage;

  const canDisplayOverallAverage = displayOverallAverage !== null;
  const isAdminOrRegistrar =
    user && (user.role === "admin" || user.role === "registrar");

  // --- Render ---
  if (loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center flex justify-center items-center">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading...
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  if (!student) {
    return (
      <DashboardLayout>
        <Button
          variant="outline"
          onClick={() => navigate("/grades")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-6 text-center text-destructive">
            Student not found.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="outline" onClick={() => navigate("/grades")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Grades Overview
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-2xl">
              <span>
                {student.last_name}, {student.first_name}
              </span>
              <Badge variant="secondary" className="text-base font-medium">
                {/* ⭐️ FIX: This logic is now safe because 'section' can be null */}
                {student.section || `Grade ${student.grade}` || "No section"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm pt-0">
            <div>
              {/* ⭐️ FIX: Changed student.student_id to student.lrn */}
              <strong>LRN:</strong> {student.lrn}
            </div>
            <div>
              <strong>Gender:</strong> {student.gender}
            </div>
            {!student.section && (
              <div>
                <strong>Grade:</strong> {student.grade || "N/A"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollments & Grades</CardTitle>
            <CardDescription>Grades for enrolled subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">
                No grade records found for this student.
              </p>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left font-semibold">Subject</th>
                      <th className="p-3 text-left font-semibold">Teacher</th>
                      <th className="p-3 text-center font-semibold">
                        Class / S.Y.
                      </th>
                      <th className="p-3 text-center font-semibold">Q1</th>
                      <th className="p-3 text-center font-semibold">Q2</th>
                      <th className="p-3 text-center font-semibold">Q3</th>
                      <th className="p-3 text-center font-semibold">Q4</th>
                      <th className="p-3 text-center font-semibold">
                        Final Rating
                      </th>
                      <th className="p-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr
                        key={e.id}
                        className={`border-t hover:bg-muted/50 dark:hover:bg-muted/20 ${
                          updatedRow === e.id
                            ? "bg-yellow-100 dark:bg-yellow-900/30"
                            : ""
                        }`}
                      >
                        <td className="p-2 px-3 font-medium">
                          {e.subject_name}
                        </td>
                        <td className="p-2 px-3 text-muted-foreground">
                          {e.teacher_name || "N/A"}
                        </td>
                        <td className="p-2 px-3 text-center">
                          {e.section_name}
                        </td>
                        <td className="p-2 px-3 text-center">{e.q1 ?? "-"}</td>
                        <td className="p-2 px-3 text-center">{e.q2 ?? "-"}</td>
                        <td className="p-2 px-3 text-center">{e.q3 ?? "-"}</td>
                        <td className="p-2 px-3 text-center">{e.q4 ?? "-"}</td>

                        <td
                          className={`p-2 px-3 text-center font-semibold ${
                            e.final_grade !== null && e.final_grade < 75
                              ? "text-red-600 dark:text-red-500"
                              : ""
                          }`}
                        >
                          {e.final_grade?.toFixed(2) ?? "-"}
                        </td>

                        <td className="p-2 px-3 text-center">
                          {!e.is_finalized && isAdminOrRegistrar && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive h-8 w-8"
                              onClick={() => handleDelete(e.id)}
                              aria-label={`Delete ${e.subject_name} enrollment`}
                            >
                              {" "}
                              <Trash2 className="w-4 h-4" />{" "}
                            </Button>
                          )}
                          {e.is_finalized && (
                            <Badge variant="outline">Finalized</Badge>
                          )}
                          {!isAdminOrRegistrar && !e.is_finalized && (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Overall Average Row */}
                    {canDisplayOverallAverage && (
                      <tr className="border-t bg-muted font-semibold">
                        <td colSpan={7} className="p-3 text-right">
                          Overall General Average:
                        </td>
                        <td
                          colSpan={2}
                          className={`p-3 text-center text-lg ${
                            displayOverallAverage !== null &&
                            Number(displayOverallAverage) < 75
                              ? "text-red-600 dark:text-red-500"
                              : "text-primary"
                          }`}
                        >
                          {displayOverallAverage}
                        </td>
                      </tr>
                    )}
                    {/* Message if average cannot be computed */}
                    {!canDisplayOverallAverage && enrollments.length > 0 && (
                      <tr className="border-t bg-muted/50">
                        <td
                          colSpan={9}
                          className="p-2 text-center text-muted-foreground italic text-xs"
                        >
                          Overall average calculation requires final ratings
                          for all core subjects (or backend calculation).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentGradesManager;