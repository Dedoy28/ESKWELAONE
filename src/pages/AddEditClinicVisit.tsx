// src/pages/AddEditClinicVisit.tsx
// ⭐️ FULLY UPDATED AND FINALIZED FILE ⭐️

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { Loader2 } from "lucide-react"; // Import Loader

// ⭐️ --- UPDATED INTERFACES --- ⭐️

// Interface for what /api/students/?search=... returns (from StudentSerializer)
interface StudentSearchResult {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  section: { name: string } | null;
  // We only need these fields for the search
}

// Interface for what /api/clinic-visits/{id}/ returns (from ClinicVisitSerializer)
interface ClinicVisitData {
  id: number;
  student: { // This is the nested SimpleStudentSerializer
    id: number;
    lrn: string;
    first_name: string;
    last_name: string;
    current_grade: string | null;
    current_section_name: string | null;
  };
  grade: string; // This is the top-level field from the serializer
  section_name: string; // This is the top-level field from the serializer
  illness: string;
  treatment: string;
  treatment_details: string;
  notes: string;
  attended_by: string;
}

// A new, UNIFIED interface to store student info in our state
// This ensures our component logic is simple
interface StudentDisplay {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  section_name: string | null;
}

// --- Options for Clinic dropdowns (Unchanged) ---
const ILLNESS_CATEGORIES = [
  "Headache",
  "Stomachache",
  "Dizziness",
  "Fever",
  "Colds / Cough",
  "Minor Cut / Wound",
  "Sprain / Injury",
  "Dysmenorrhea",
  "Medication",
  "Rest",
  "Other",
];

const TREATMENT_OPTIONS = [
  "Gave Medicine (Paracetamol)",
  "Gave Medicine (Mefenamic)",
  "Gave Medicine (Antacid)",
  "Gave Medicine (Other)",
  "First Aid Applied",
  "Allowed to Rest",
  "Sent Home",
  "Referred to Hospital",
  "Contacted Parent/Guardian",
  "Observation",
  "Other",
];
// --- END NEW ---

const AddEditClinicVisit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = Boolean(id);

  const [studentSearch, setStudentSearch] = useState("");
  // ⭐️ FIX: Use the unified StudentDisplay interface
  const [studentResults, setStudentResults] = useState<StudentDisplay[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDisplay | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false); // ⭐️ ADDED: Loading state for submit

  const [formData, setFormData] = useState({
    illness: "",
    treatment: "",
    treatment_details: "", // (Your update was correct)
    notes: "",
    attended_by: "",
  });

  // Fetch clinic visit for editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchVisitData(id);
    }
  }, [id, isEditMode]);

  // ⭐️ --- UPDATED FETCH FUNCTION (FOR EDIT MODE) --- ⭐️
  const fetchVisitData = async (visitId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/clinic-visits/${visitId}/`);
      const visitData = res.data as ClinicVisitData; // ⬅️ Use new, correct interface

      // Set form data (Your code was correct)
      setFormData({
        illness: visitData.illness || "",
        treatment: visitData.treatment || "",
        treatment_details: visitData.treatment_details || "",
        notes: visitData.notes || "",
        attended_by: visitData.attended_by || "",
      });

      // ⭐️ FIX: Adapt the nested SimpleStudent into our unified StudentDisplay state
      const simpleStudent = visitData.student;
      if (simpleStudent) {
        const studentForState: StudentDisplay = {
          id: simpleStudent.id,
          lrn: simpleStudent.lrn,
          first_name: simpleStudent.first_name,
          last_name: simpleStudent.last_name,
          grade: visitData.grade, // Use the top-level grade/section from ClinicVisitSerializer
          section_name: visitData.section_name,
        };
        setSelectedStudent(studentForState);
        setStudentSearch(
          `${studentForState.last_name}, ${studentForState.first_name} - ${studentForState.lrn}` // ⬅️ FIX: Use .lrn
        );
      }
      setLoading(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to load clinic visit data.",
        variant: "destructive",
      });
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
      }
      setLoading(false);
    }
  };

  // ⭐️ --- UPDATED STUDENT SEARCH (FOR ADD MODE) --- ⭐️
  useEffect(() => {
    if (isEditMode) return; // Don't search if we are editing

    const fetchStudents = async () => {
      if (studentSearch.length < 2) {
        setStudentResults([]);
        return;
      }
      try {
        // This endpoint returns StudentData[] (from StudentManagement)
        const res = await api.get(`/students/?search=${studentSearch}&is_active=true`);
        const searchData = res.data as StudentSearchResult[]; // ⬅️ Use new interface

        // ⭐️ FIX: Map the search results to our unified StudentDisplay interface
        setStudentResults(
          searchData.map((s) => ({
            id: s.id,
            lrn: s.lrn,
            first_name: s.first_name,
            last_name: s.last_name,
            grade: s.grade,
            section_name: s.section?.name || null,
          }))
        );
      } catch (err: any) {
        console.error("Failed to search students", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          navigate("/login");
        }
      }
    };

    const delayDebounce = setTimeout(fetchStudents, 400);
    return () => clearTimeout(delayDebounce);
  }, [studentSearch, isEditMode, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> // ⬅️ FIX: Added HTMLSelectElement
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // ⭐️ FIX: Use the same `handleChange` for select, just ensure `id` matches state key
  // const handleSelectChange = (field: string, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };

  // ⭐️ --- UPDATED STUDENT SELECT --- ⭐️
  const handleStudentSelect = (student: StudentDisplay) => { // ⬅️ Use new interface
    setSelectedStudent(student);
    setStudentSearch(
      `${student.last_name}, ${student.first_name} - ${student.lrn}` // ⬅️ FIX: Use .lrn
    );
    setStudentResults([]);
  };

  // ⭐️ --- UPDATED SUBMIT FUNCTION --- ⭐️
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // ⭐️ ADDED

    if (!selectedStudent?.id) {
      toast({
        title: "Error",
        description: "Please select a student first.",
        variant: "destructive",
      });
      setIsSubmitting(false); // ⭐️ ADDED
      return;
    }

    const payload = {
      // ⭐️ FIX: The serializer expects the key 'student_id'
      student_id: Number(selectedStudent.id), 
      // visit_date is only set on create, not edit
      ...(!isEditMode && { visit_date: new Date().toISOString() }),
      illness: formData.illness.trim(),
      treatment: formData.treatment.trim() || null,
      treatment_details: formData.treatment_details.trim() || null,
      notes: formData.notes.trim() || null,
      attended_by: formData.attended_by.trim() || null,
    };

    try {
      if (isEditMode) {
        await api.put(`/clinic-visits/${id}/`, payload);
        toast({
          title: "Success",
          description: "Clinic visit updated successfully.",
        });
      } else {
        await api.post("/clinic-visits/", payload);
        toast({
          title: "Success",
          description: "Clinic visit added successfully.",
        });
      }

      navigate("/clinic");
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
        return;
      }
      console.error("Error response:", err.response?.data);
      toast({
        title: "Error",
        description: err.response?.data
          ? JSON.stringify(err.response.data)
          : `Failed to ${isEditMode ? "update" : "add"} clinic visit.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); // ⭐️ ADDED
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit" : "Add"} Clinic Visit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ⭐️ --- UPDATED STUDENT SEARCH --- ⭐️ */}
            <div className="relative">
              <Label htmlFor="student">Student *</Label>
              <Input
                id="student-search" // Use a different ID from state keys
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (!isEditMode) setSelectedStudent(null);
                }}
                placeholder="Type student name or LRN..." // ⬅️ FIX: Updated placeholder
                required
                disabled={isEditMode} // Lock student on edit mode
                autoComplete="off"
              />

              {/* Search Results Dropdown (Only in Add mode) */}
              {!isEditMode && studentResults.length > 0 && (
                <ul className="absolute z-10 border rounded mt-1 max-h-40 overflow-y-auto bg-card w-full shadow-md">
                  {studentResults.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="p-2 hover:bg-muted cursor-pointer"
                    >
                      {s.last_name}, {s.first_name} ({s.lrn}) {/* ⬅️ FIX: Use .lrn */}
                    </li>
                  ))}
                </ul>
              )}

              {/* ⭐️ --- UPDATED RENDER --- ⭐️ */}
              {selectedStudent && (
                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                  <p className="font-semibold text-foreground">
                    {selectedStudent.last_name}, {selectedStudent.first_name}
                  </p>
                  <p>
                    <strong>LRN:</strong> {selectedStudent.lrn}
                  </p>
                  <p>
                    <strong>Grade:</strong> {selectedStudent.grade || "N/A"}
                  </p>
                  <p>
                    <strong>Section:</strong>{" "}
                    {selectedStudent.section_name || "N/A"} {/* ⬅️ FIX: Use .section_name */}
                  </p>
                </div>
              )}
            </div>

            {/* Illness */}
            <div>
              <Label htmlFor="illness">Illness / Symptoms *</Label>
              <select
                id="illness"
                value={formData.illness}
                onChange={handleChange} // ⬅️ FIX: Use standard handler
                className="border rounded-md px-3 py-2 w-full h-10 bg-transparent" // ⬅️ FIX: Use standard shadcn styling
                required
              >
                <option value="">Select illness/symptom</option>
                {ILLNESS_CATEGORIES.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {/* ⭐️ --- UPDATED TREATMENT SECTION --- ⭐️ */}
            <div>
              <Label htmlFor="treatment">Treatment Given</Label>
              <select
                id="treatment"
                value={formData.treatment}
                onChange={handleChange} // ⬅️ FIX: Use standard handler
                className="border rounded-md px-3 py-2 w-full h-10 bg-transparent mb-2" // ⬅️ FIX: Use standard shadcn styling
              >
                <option value="">Select treatment/action</option>
                {TREATMENT_OPTIONS.map((item, idx) => (
                  <option key={idx} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <Label htmlFor="treatment_details" className="text-sm text-muted-foreground">
                Additional Details (on treatment or "Other")
              </Label>
              <Textarea
                id="treatment_details"
                placeholder="Additional details about the treatment..."
                value={formData.treatment_details}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes / Diagnosis</Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes or diagnosis..."
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>

            {/* Attended By */}
            <div>
              <Label htmlFor="attended_by">Attended By</Label>
              <Input
                id="attended_by"
                placeholder="Name of nurse/teacher"
                value={formData.attended_by}
                onChange={handleChange}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-3 mt-6 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isEditMode ? "Update" : "Save"} Visit
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate("/clinic")}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AddEditClinicVisit;