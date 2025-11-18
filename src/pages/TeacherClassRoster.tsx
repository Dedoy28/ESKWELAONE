// src/pages/TeacherClassRoster.tsx
// ⭐️ FULLY UPDATED AND FINALIZED FILE ⭐️

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

// --- Interfaces ---
interface EnrollmentRow {
  id: number;
  student_lrn: string;
  student_name: string;
  q1: number | null;
  q2: number | null;
  q3: number | null;
  q4: number | null;
  pre_final: number | null;
  is_finalized: boolean;
}

interface ClassInfo {
  subject_name: string;
  section_name: string;
  academic_year: string;
}

interface QuarterLocks {
  q1_open: boolean;
  q2_open: boolean;
  q3_open: boolean;
  q4_open: boolean;
}

// --- Component ---
const TeacherClassRoster = () => {
  const { classId } = useParams<{ classId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roster, setRoster] = useState<EnrollmentRow[]>([]);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<{ [key: number]: boolean }>({});
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [globalLocks, setGlobalLocks] = useState<QuarterLocks>({
    q1_open: false,
    q2_open: false,
    q3_open: false,
    q4_open: false,
  });
  const [loadingLocks, setLoadingLocks] = useState(true);

  // --- Data Fetching: Quarter Locks ---
  useEffect(() => {
    const fetchGlobalLocks = async () => {
      try {
        const response = await api.get("/settings/grade-locks/");
        const locksData = response.data[0] || response.data;

        if (locksData && typeof locksData.q1_open === "boolean") {
          setGlobalLocks(locksData);
        } else {
          console.warn("Unexpected lock data structure:", locksData);
        }
      } catch (error) {
        console.error("Error fetching global quarter locks:", error);
        setGlobalLocks({
          q1_open: false,
          q2_open: false,
          q3_open: false,
          q4_open: false,
        });
      } finally {
        setLoadingLocks(false);
      }
    };
    fetchGlobalLocks();
  }, [toast]);

  // --- Data Fetching: Class Roster ---
  useEffect(() => {
    if (!classId) {
      toast({
        title: "Error",
        description: "No class ID specified.",
        variant: "destructive",
      });
      navigate("/grades");
      return;
    }

    const fetchRoster = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/teacher/class-roster/${classId}/`);
        const data: EnrollmentRow[] = response.data;
        setRoster(data);

        if (data.length > 0) {
          const firstRow: any = data[0];
          setClassInfo({
            subject_name: firstRow.subject_name,
            section_name: firstRow.section_name,
            academic_year: firstRow.academic_year,
          });
        } else {
          toast({
            title: "Empty Roster",
            description: "This class has no students enrolled yet.",
          });
          fetchClassDetailsSeparately(classId);
        }
      } catch (error: any) {
        console.error("Error fetching class roster:", error);
        toast({
          title: "Error",
          description:
            error.response?.data?.detail || "Failed to fetch class roster.",
          variant: "destructive",
        });
        navigate("/grades");
      } finally {
        setLoading(false);
      }
    };

    const fetchClassDetailsSeparately = async (id: string) => {
      try {
        const detailsResponse = await api.get(`/teacher-classes/${id}/`);
        setClassInfo({
          subject_name: detailsResponse.data.subject,
          section_name: detailsResponse.data.section,
          academic_year: detailsResponse.data.academic_year,
        });
      } catch (detailsError) {
        console.error("Could not fetch class details separately:", detailsError);
      }
    };

    fetchRoster();
  }, [classId, navigate, toast]);

  // --- Helpers ---
  const isQuarterInputLocked = (
    row: EnrollmentRow,
    quarter: keyof QuarterLocks
  ): boolean => {
    if (!globalLocks[quarter]) return true;
    if (row.is_finalized) return true;
    return false;
  };

  // --- Grade Change Handler ---
  const handleGradeChange = (
    enrollmentId: number,
    quarter: "q1" | "q2" | "q3" | "q4",
    value: string
  ) => {
    const quarterKey = (quarter + "_open") as keyof QuarterLocks;
    const currentRow = roster.find((row) => row.id === enrollmentId);
    if (currentRow && isQuarterInputLocked(currentRow, quarterKey)) {
      toast({
        title: "Grade Input Locked",
        description:
          "This quarter is locked by the Administration or has been finalized.",
        variant: "destructive",
      });
      return;
    }

    setRoster((prev) =>
      prev.map((row) =>
        row.id === enrollmentId
          ? {
              ...row,
              [quarter]:
                value === ""
                  ? null
                  : Math.min(100, Math.max(0, Number(value))),
            }
          : row
      )
    );
  };

  // --- Save Single Row (Auto-Save on Blur) ---
  const handleSave = async (enrollmentId: number) => {
    const rowToSave = roster.find((row) => row.id === enrollmentId);
    if (!rowToSave || savingState[enrollmentId] || isBatchSaving) return;

    setSavingState((prev) => ({ ...prev, [enrollmentId]: true }));

    const payload: { [key: string]: number | null } = {};
    if (!isQuarterInputLocked(rowToSave, "q1_open")) payload.q1 = rowToSave.q1;
    if (!isQuarterInputLocked(rowToSave, "q2_open")) payload.q2 = rowToSave.q2;
    if (!isQuarterInputLocked(rowToSave, "q3_open")) payload.q3 = rowToSave.q3;
    if (!isQuarterInputLocked(rowToSave, "q4_open")) payload.q4 = rowToSave.q4;

    if (Object.keys(payload).length === 0) {
      setSavingState((prev) => ({ ...prev, [enrollmentId]: false }));
      return;
    }

    try {
      const response = await api.patch(`/enrollments/${enrollmentId}/`, payload);
      setRoster((prev) =>
        prev.map((row) => (row.id === enrollmentId ? response.data : row))
      );
      toast({
        title: "Auto-Saved!",
        description: `Grades for ${rowToSave.student_name} have been updated.`,
      });
    } catch (error: any) {
      console.error("Error saving grades:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.detail ||
          "Failed to save grades. Check if the quarter is open.",
        variant: "destructive",
      });
    } finally {
      setSavingState((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  // --- Batch Save ---
  const handleBatchSave = async () => {
    setIsBatchSaving(true);

    const payload = roster.map((row) => {
      const rowPayload: { [key: string]: number | null | number } = { id: row.id };
      if (!isQuarterInputLocked(row, "q1_open")) rowPayload.q1 = row.q1;
      if (!isQuarterInputLocked(row, "q2_open")) rowPayload.q2 = row.q2;
      if (!isQuarterInputLocked(row, "q3_open")) rowPayload.q3 = row.q3;
      if (!isQuarterInputLocked(row, "q4_open")) rowPayload.q4 = row.q4;
      return rowPayload;
    });

    try {
      const response = await api.patch("/enrollments/batch-update/", payload);
      const updatedRosterData = response.data.updated;

      setRoster((prev) =>
        prev.map((oldRow) => {
          const updated = updatedRosterData.find(
            (newRow: EnrollmentRow) => newRow.id === oldRow.id
          );
          return updated ? { ...oldRow, ...updated } : oldRow;
        })
      );

      toast({
        title: "All Grades Saved!",
        description: `${updatedRosterData.length} student records updated.`,
      });

      if (response.data.errors?.length) {
        console.error("Batch save errors:", response.data.errors);
        toast({
          title: "Some grades had errors",
          description: "Not all grades could be saved. Check console for details.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error batch saving grades:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to save all grades.",
        variant: "destructive",
      });
    } finally {
      setIsBatchSaving(false);
    }
  };

  // --- Render ---
  if (loading || loadingLocks) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading Class Roster and Lock Status...
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ⭐️ REVISION #11 FIX: Remove arrows from number inputs ⭐️ */}
      <style>
        {`
          /* Hide spin buttons on Chrome, Safari, Edge, Opera */
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          /* Hide spin buttons on Firefox */
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>
      {/* ⭐️ END OF REVISION #11 FIX ⭐️ */}

      <div className="space-y-6 animate-fade-in">
        <Button variant="outline" onClick={() => navigate("/grades")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Classes
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">
              {classInfo?.subject_name || "Grade Sheet"}
            </CardTitle>
            <CardDescription className="text-lg">
              {classInfo
                ? `${classInfo.section_name}`
                : "Manage grades for your class."}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Class Roster</CardTitle>
                <CardDescription>
                  Grades auto-save when you click away from an input. Use
                  "Save All" to save all changes at once.
                </CardDescription>
              </div>
              <Button onClick={handleBatchSave} disabled={isBatchSaving || loading}>
                {isBatchSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All Changes
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">LRN</TableHead>
                    <TableHead className="w-[200px]">Student Name</TableHead>
                    {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                      <TableHead key={q} className="w-[100px] text-center">
                        {q.toUpperCase()}
                        {globalLocks[`${q}_open` as keyof QuarterLocks] ? (
                          <Badge variant="secondary" className="ml-1">
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="ml-1">
                            Locked
                          </Badge>
                        )}
                      </TableHead>
                    ))}
                    <TableHead className="w-[100px] text-center">Final</TableHead>
                    <TableHead className="w-[120px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {roster.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No students are currently enrolled in this class.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roster.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.student_lrn}
                        </TableCell>
                        <TableCell>{row.student_name}</TableCell>

                        {(["q1", "q2", "q3", "q4"] as const).map((q) => (
                          <TableCell key={q}>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              placeholder="-"
                              value={row[q] ?? ""}
                              onChange={(e) =>
                                handleGradeChange(row.id, q, e.target.value)
                              }
                              onBlur={() => handleSave(row.id)}
                              disabled={
                                isBatchSaving ||
                                isQuarterInputLocked(row, `${q}_open` as keyof QuarterLocks) ||
                                savingState[row.id]
                              }
                              className="text-center"
                            />
                          </TableCell>
                        ))}

                        <TableCell
                          className={`text-center font-semibold ${
                            row.pre_final !== null && row.pre_final < 75
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {row.pre_final ?? "-"}
                        </TableCell>

                        <TableCell className="text-center">
                          {row.is_finalized ? (
                            <Badge variant="outline">Finalized</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(row.id)}
                              disabled={
                                isBatchSaving ||
                                savingState[row.id] ||
                                (isQuarterInputLocked(row, "q1_open") &&
                                  isQuarterInputLocked(row, "q2_open") &&
                                  isQuarterInputLocked(row, "q3_open") &&
                                  isQuarterInputLocked(row, "q4_open"))
                              }
                              aria-label={`Save grades for ${row.student_name}`}
                            >
                              {savingState[row.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherClassRoster;