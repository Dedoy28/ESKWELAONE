// src/pages/ManageClasses.tsx
import React, { useState, useEffect, useMemo } from "react";
// ❌ REMOVED: import axios from "axios";
import api from "@/lib/axios"; // ✅ ADDED: Your central API client
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
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Plus, Trash2, Loader2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ❌ REMOVED ALL HARDCODED 'localhost' API ENDPOINTS

// --- Interfaces ---
interface Subject {
  id: number;
  name: string;
}

interface Section {
  id: number;
  name: string;
  grade: string;
  school_year: string;
  adviser_name?: string | null;
}

interface TeacherClass {
  id: number;
  teacher: string;
  subject: string;
  section: string;
  academic_year: string;
  total_students_in_section: number;
  enrolled_students_count: number;
  is_fully_enrolled: boolean;
}

interface Teacher {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

// --- Subjects to EXCLUDE from the assignment dropdown ---
const SUBJECTS_TO_EXCLUDE_FROM_ASSIGNMENT = [
  "Music",
  "Arts",
  "Physical Education",
  "Health",
];

// --- CONSTANT for None Value ---
const NO_ADVISER_VALUE = "__NONE__";

const ManageClasses = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // --- Form States ---
  const currentYear = new Date().getFullYear();
  const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;

  const [newSection, setNewSection] = useState({
    name: "A",
    grade: "7",
    school_year: defaultSchoolYear,
    adviser_name: NO_ADVISER_VALUE,
  });
  const [newTeacherClass, setNewTeacherClass] = useState({
    teacher_id: "",
    subject_id: "",
    section_id: "",
    academic_year: defaultSchoolYear,
  });

  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [isSubmittingClass, setIsSubmittingClass] = useState(false);
  const [deletingStates, setDeletingStates] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [enrollingStates, setEnrollingStates] = useState<{
    [key: string]: boolean;
  }>({});

  // --- Fetch Data ---
  useEffect(() => {
    // ✅ SIMPLIFIED: No token or headers logic needed.
    // The 'api' client handles it automatically.
    const fetchData = async () => {
      setLoadingSubjects(true);
      try {
        const res = await api.get("/subjects/"); // ✅ CHANGED
        setSubjects(res.data);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        toast({ variant: "destructive", title: "Error fetching subjects" });
      } finally {
        setLoadingSubjects(false);
      }
      setLoadingSections(true);
      try {
        const res = await api.get("/sections/"); // ✅ CHANGED
        setSections(res.data);
      } catch (err) {
        console.error("Failed to fetch sections:", err);
        toast({ variant: "destructive", title: "Error fetching sections" });
      } finally {
        setLoadingSections(false);
      }
      setLoadingClasses(true);
      try {
        const res = await api.get("/teacher-classes/"); // ✅ CHANGED
        setTeacherClasses(res.data);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        toast({ variant: "destructive", title: "Error fetching classes" });
      } finally {
        setLoadingClasses(false);
      }
      setLoadingTeachers(true);
      try {
        const res = await api.get("/users/?profile__role=teacher"); // ✅ CHANGED
        setTeachers(res.data);
      } catch (err) {
        console.error("Failed to fetch teachers:", err);
        toast({ variant: "destructive", title: "Error fetching teachers" });
      } finally {
        setLoadingTeachers(false);
      }
    };

    fetchData().catch((err) => {
      // Handle auth errors (like 401) from the interceptor
      if (err.response?.status === 401) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again.",
        });
        navigate("/login");
      }
    });
  }, [toast, navigate]);

  // --- Filtered Subjects for Dropdown ---
  const filteredSubjectsForAssignment = useMemo(() => {
    return subjects.filter(
      (s) => !SUBJECTS_TO_EXCLUDE_FROM_ASSIGNMENT.includes(s.name)
    );
  }, [subjects]);

  // --- Filtered Sections for Dropdown ---
  const filteredSectionsForAssignment = useMemo(() => {
    const allowedNames = ["a", "b", "c"];
    return sections.filter((s) => allowedNames.includes(s.name.toLowerCase()));
  }, [sections]);

  // --- Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    formSetter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const { name, value } = e.target;
    formSetter((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (
    name: string,
    value: string,
    formSetter: React.Dispatch<React.SetStateAction<any>>
  ) => {
    formSetter((prev: any) => ({ ...prev, [name]: value }));
  };

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.school_year.trim()) return;
    setIsSubmittingSection(true);
    // ❌ REMOVED: token logic
    try {
      const payload = {
        ...newSection,
        adviser_name:
          newSection.adviser_name === NO_ADVISER_VALUE
            ? null
            : newSection.adviser_name,
      };
      const response = await api.post("/sections/", payload); // ✅ CHANGED
      setSections(
        [...sections, response.data].sort((a, b) =>
          `${a.school_year}-${a.grade}-${a.name}`.localeCompare(
            `${b.school_year}-${b.grade}-${b.name}`
          )
        )
      );
      setNewSection({
        name: "A",
        grade: "7",
        school_year: newSection.school_year,
        adviser_name: NO_ADVISER_VALUE,
      });
      toast({ title: "Section Added" });
    } catch (err: any) {
      console.error("Failed to add section:", err);
      toast({
        variant: "destructive",
        title: "Failed to add section",
        description:
          err.response?.data?.detail ||
          err.response?.data?.non_field_errors?.[0] ||
          "Error",
      });
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const addTeacherClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newTeacherClass.teacher_id ||
      !newTeacherClass.subject_id ||
      !newTeacherClass.section_id
    ) {
      toast({
        variant: "destructive",
        title: "Please select Teacher, Subject, and Section.",
      });
      return;
    }
    setIsSubmittingClass(true);
    // ❌ REMOVED: token logic

    const payload = {
      teacher_id: parseInt(newTeacherClass.teacher_id, 10),
      subject_id: parseInt(newTeacherClass.subject_id, 10),
      section_id: parseInt(newTeacherClass.section_id, 10),
      academic_year: newTeacherClass.academic_year,
    };

    try {
      await api.post("/teacher-classes/", payload); // ✅ CHANGED

      // --- RE-FETCH THE LIST ---
      setLoadingClasses(true);
      const res = await api.get("/teacher-classes/"); // ✅ CHANGED
      setTeacherClasses(res.data);
      // --- END RE-FETCH ---

      setNewTeacherClass({
        teacher_id: "",
        subject_id: "",
        section_id: "",
        academic_year: newTeacherClass.academic_year,
      });
      toast({ title: "Class Assignment Added" });
    } catch (err: any) {
      console.error("Failed to add class:", err);
      const errorDetail = err.response?.data?.detail;
      const nonFieldErrors = err.response?.data?.non_field_errors?.[0];
      const teacherError = err.response?.data?.teacher_id?.[0];
      const subjectError = err.response?.data?.subject_id?.[0];
      const sectionError = err.response?.data?.section_id?.[0];
      const yearError = err.response?.data?.academic_year?.[0];
      const errorMessage =
        teacherError ||
        subjectError ||
        sectionError ||
        yearError ||
        nonFieldErrors ||
        errorDetail ||
        "Error assigning class";
      toast({
        variant: "destructive",
        title: "Failed to add class assignment",
        description: errorMessage,
      });
    } finally {
      setIsSubmittingClass(false);
      setLoadingClasses(false); // Make sure loading is set to false
    }
  };

  const deleteItem = async (
    type: "subject" | "section" | "class",
    id: number
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete this ${type}? This might affect related records.`
      )
    )
      return;
    const key = `${type}-${id}`;
    setDeletingStates((prev) => ({ ...prev, [key]: true }));
    // ❌ REMOVED: token logic

    let url = "";
    switch (type) {
      case "subject":
        url = `/subjects/${id}/`; // ✅ CHANGED
        break;
      case "section":
        url = `/sections/${id}/`; // ✅ CHANGED
        break;
      case "class":
        url = `/teacher-classes/${id}/`; // ✅ CHANGED
        break;
    }
    try {
      await api.delete(url); // ✅ CHANGED
      if (type === "subject") setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (type === "section") setSections((prev) => prev.filter((s) => s.id !== id));
      if (type === "class")
        setTeacherClasses((prev) => prev.filter((tc) => tc.id !== id));
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted` });
    } catch (err: any) {
      console.error(`Failed to delete ${type}:`, err);
      toast({
        variant: "destructive",
        title: `Failed to delete ${type}`,
        description: err.response?.data?.detail || "Error",
      });
    } finally {
      setDeletingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleEnrollAll = async (classId: number) => {
    if (
      !confirm(
        "Are you sure you want to enroll all active students from this section into this class? This will not create duplicates."
      )
    )
      return;

    const key = `class-${classId}`;
    setEnrollingStates((prev) => ({ ...prev, [key]: true }));
    // ❌ REMOVED: token logic
    const url = `/teacher-classes/${classId}/enroll-all/`; // ✅ CHANGED

    try {
      const response = await api.post(url, {}); // ✅ CHANGED
      toast({
        title: "Enrollment Successful",
        description: response.data.detail,
      });

      // --- RE-FETCH THE LIST to update the button state ---
      setLoadingClasses(true);
      const res = await api.get("/teacher-classes/"); // ✅ CHANGED
      setTeacherClasses(res.data);
      // --- END RE-FETCH ---
    } catch (err: any) {
      console.error("Failed to enroll all students:", err);
      toast({
        variant: "destructive",
        title: "Enrollment Failed",
        description: err.response?.data?.detail || "An error occurred.",
      });
    } finally {
      setEnrollingStates((prev) => ({ ...prev, [key]: false }));
      setLoadingClasses(false); // Make sure loading is set to false
    }
  };

  // ... (No changes to the JSX return) ...
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="outline" onClick={() => navigate("/grades")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Grades Overview
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          Manage Classes & Subjects
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              View and manage the list of available subjects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-md max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSubjects ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : subjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-muted-foreground"
                      >
                        No subjects found. Add them via Django admin or
                        database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subjects.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteItem("subject", s.id)}
                            disabled={deletingStates[`subject-${s.id}`]}
                          >
                            {deletingStates[`subject-${s.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
        <Card>
          <CardHeader>
            <CardTitle>Sections</CardTitle>
            <CardDescription>
              Manage sections (A, B, or C) for each grade level and school
              year.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={addSection}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end"
            >
              <div className="space-y-1">
                <Label htmlFor="section-name">Section Name</Label>
                <Select
                  name="name"
                  value={newSection.name}
                  onValueChange={(val) =>
                    handleSelectChange("name", val, setNewSection)
                  }
                  required
                >
                  <SelectTrigger id="section-name">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="section-grade">Grade Level</Label>
                <Select
                  name="grade"
                  value={newSection.grade}
                  onValueChange={(val) =>
                    handleSelectChange("grade", val, setNewSection)
                  }
                >
                  <SelectTrigger id="section-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["7", "8", "9", "10"].map((g) => (
                      <SelectItem key={g} value={g}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="section-sy">School Year</Label>
                <Input
                  id="section-sy"
                  name="school_year"
                  placeholder="e.g., 2024-2025"
                  value={newSection.school_year}
                  onChange={(e) => handleInputChange(e, setNewSection)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="section-adviser">Adviser</Label>
                <Select
                  name="adviser_name"
                  value={newSection.adviser_name || NO_ADVISER_VALUE}
                  onValueChange={(val) =>
                    handleSelectChange("adviser_name", val, setNewSection)
                  }
                >
                  <SelectTrigger
                    id="section-adviser"
                    className={
                      !newSection.adviser_name ||
                      newSection.adviser_name === NO_ADVISER_VALUE
                        ? "text-muted-foreground"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select Adviser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ADVISER_VALUE}>-- None --</SelectItem>
                    {loadingTeachers ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : teachers.length === 0 ? (
                      <SelectItem value="no-teachers" disabled>
                        No teachers found
                      </SelectItem>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem
                          key={t.id}
                          value={`${t.last_name}, ${t.first_name}`}
                        >
                          {t.last_name}, {t.first_name} ({t.username})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSubmittingSection}>
                {isSubmittingSection ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}{" "}
                Add Section
              </Button>
            </form>
            <div className="overflow-x-auto border rounded-md max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>School Year</TableHead>
                    <TableHead>Adviser</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSections ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : sections.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No sections found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sections.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>Grade {s.grade}</TableCell>
                        <TableCell>{s.school_year}</TableCell>
                        <TableCell>{s.adviser_name || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteItem("section", s.id)}
                            disabled={deletingStates[`section-${s.id}`]}
                          >
                            {deletingStates[`section-${s.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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

        <Card>
          <CardHeader>
            <CardTitle>Teacher Class Assignments (Load)</CardTitle>
            <CardDescription>
              Assign teachers to handle specific subjects in sections (A, B,
              or C only).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={addTeacherClass}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end"
            >
              <div className="space-y-1">
                <Label htmlFor="class-teacher">Teacher</Label>
                <Select
                  name="teacher_id"
                  value={newTeacherClass.teacher_id}
                  onValueChange={(val) =>
                    handleSelectChange("teacher_id", val, setNewTeacherClass)
                  }
                  required
                >
                  <SelectTrigger id="class-teacher">
                    <SelectValue placeholder="Select Teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTeachers ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : teachers.length === 0 ? (
                      <SelectItem value="no-teachers" disabled>
                        No teachers found
                      </SelectItem>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.last_name}, {t.first_name} ({t.username})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="class-subject">Subject</Label>
                <Select
                  name="subject_id"
                  value={newTeacherClass.subject_id}
                  onValueChange={(val) =>
                    handleSelectChange("subject_id", val, setNewTeacherClass)
                  }
                  required
                >
                  <SelectTrigger id="class-subject">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSubjects ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : filteredSubjectsForAssignment.length === 0 ? (
                      <SelectItem value="no-subjects" disabled>
                        No assignable subjects found
                      </SelectItem>
                    ) : (
                      filteredSubjectsForAssignment.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="class-section">Section</Label>
                <Select
                  name="section_id"
                  value={newTeacherClass.section_id}
                  onValueChange={(val) =>
                    handleSelectChange("section_id", val, setNewTeacherClass)
                  }
                  required
                >
                  <SelectTrigger id="class-section">
                    <SelectValue placeholder="Select Section (A/B/C)" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSections ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : filteredSectionsForAssignment.length === 0 ? (
                      <SelectItem value="no-sections" disabled>
                        No sections named A, B, or C found
                      </SelectItem>
                    ) : (
                      filteredSectionsForAssignment.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          Grade {s.grade} - {s.name} ({s.school_year})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="class-acad-year">Academic Year</Label>
                <Input
                  id="class-acad-year"
                  name="academic_year"
                  placeholder="e.g., 2024-2025"
                  value={newTeacherClass.academic_year}
                  onChange={(e) => handleInputChange(e, setNewTeacherClass)}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmittingClass}>
                {isSubmittingClass ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}{" "}
                Assign Class
              </Button>
            </form>
            <div className="overflow-x-auto border rounded-md max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-right w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingClasses ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : teacherClasses.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No class assignments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teacherClasses.map((tc) => (
                      <TableRow key={tc.id}>
                        <TableCell>{tc.teacher}</TableCell>
                        <TableCell>{tc.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tc.section}</Badge>
                        </TableCell>
                        <TableCell>{tc.academic_year}</TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className={
                              tc.is_fully_enrolled
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:text-blue-600 mr-2"
                            }
                            onClick={() => handleEnrollAll(tc.id)}
                            disabled={
                              tc.is_fully_enrolled ||
                              enrollingStates[`class-${tc.id}`] ||
                              deletingStates[`class-${tc.id}`]
                            }
                            title={
                              tc.is_fully_enrolled
                                ? `Fully Enrolled (${tc.enrolled_students_count}/${tc.total_students_in_section})`
                                : `Enroll All Students (${tc.enrolled_students_count}/${tc.total_students_in_section} enrolled)`
                            }
                          >
                            {enrollingStates[`class-${tc.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteItem("class", tc.id)}
                            disabled={
                              enrollingStates[`class-${tc.id}`] ||
                              deletingStates[`class-${tc.id}`]
                            }
                            title="Delete Class Assignment"
                          >
                            {deletingStates[`class-${tc.id}`] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
      </div>
    </DashboardLayout>
  );
};

export default ManageClasses;