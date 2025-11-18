// src/pages/AddEditBehaviorRecord.tsx
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
import { Loader2 } from "lucide-react"; // ⭐️ ADDED

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

// Interface for what /api/behavior-records/{id}/ returns (from BehaviorRecordSerializer)
interface BehaviorRecordData {
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
  date: string;
  category: string;
  offense_type: string;
  offense_count: number;
  description: string;
  action_taken: string;
  action_taken_details: string;
  reported_by: string;
}

// A new, UNIFIED interface to store student info in our state
interface StudentDisplay {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  section_name: string | null;
}
// --- ⭐️ END OF UPDATED INTERFACES ⭐️ ---

// (Offense categories and actions are unchanged and correct)
const MINOR_OFFENSES = [
  "Maliit na away sa pagitan ng magkaka-klase",
  "Nakatatlong (3) beses na pagliban (unexcused absences)",
  "Nakatatlong (3) beses na tardiness",
  "Pagkakalat ng basura",
  "Pagsisigaw/pagsasalita ng malakas",
  "Hindi awtorisadong pagpasok sa silid-aralan",
  "Hindi pagsunod sa dress code",
  "Paglalaro na nagdulot ng physical injury",
  "Paggamit ng electronic devices sa panahon ng klase",
  "Hindi pakikinig/pagtulog sa klase",
  "Loitering",
  "Pag-iingay sa panahon ng uwian",
  "Pagsira ng school property",
  "Hindi pagsunod sa toilet etiquette",
  "Pagsisinungaling",
];
const MAJOR_OFFENSES = [
  "Disrespect/Insubordination sa persons in authority",
  "Acts of defiance",
  "Pagmumura",
  "Paninirang-puri",
  "Pagkagambala sa pagkaklase",
  "Physical/Sexual intimacy",
  "Academic dishonesty/Cheating",
  "Pagnanakaw",
  "Pakikipag-away/Pakikipagsuntukan",
  "Hindi awtorisadong paggamit ng cellphone",
  "Hindi pagbibigay-galang sa flag ceremony",
  "Cutting classes",
  "Maling pag-uugali sa public places",
  "Pananakit na nagdulot ng physical injury",
  "Vandalism",
  "Pornographic materials",
  "Pagbebenta ng walang pahintulot",
  "Pagdadala/paggamit ng sigarilyo at vape",
  "Pag-inom ng alcoholic beverages",
  "Pagdadala ng deadly weapons",
  "Extortion/Pangingikil",
  "Pagsusugal",
  "Bullying (RA 10627)",
  "Violation of RA 9165 (Dangerous Drugs)",
  "Violation of RA 11313 (Safe Spaces Act)",
  "Other major violations",
];
const ACTION_TAKEN_OPTIONS = [
  "Oral reprimand with adviser-learner conference",
  "First warning with parent conference",
  "Last warning with parent conference",
  "Referral for counseling",
  "In-school suspension (ISS)",
  "Out-of-school suspension (OSS)",
  "Community service",
  "Referral to CODI",
  "Referral to DSWD",
  "Referral to PNP",
  "Other intervention",
];

const AddEditBehaviorRecord = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = Boolean(id);

  const [studentSearch, setStudentSearch] = useState("");
  // ⭐️ FIX: Use the new unified interface
  const [studentResults, setStudentResults] = useState<StudentDisplay[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDisplay | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false); // ⭐️ ADDED

  const [formData, setFormData] = useState({
    category: "",
    offense_type: "Minor",
    offense_count: "1",
    description: "",
    action_taken: "",
    action_taken_details: "", // (Your update was correct)
    reported_by: "",
  });

  // Fetch behavior record for editing
  useEffect(() => {
    if (isEditMode && id) {
      fetchBehaviorRecord(id);
    }
  }, [id, isEditMode]);

  // ⭐️ --- UPDATED FETCH FUNCTION (FOR EDIT MODE) --- ⭐️
  const fetchBehaviorRecord = async (recordId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/behavior-records/${recordId}/`);
      const recordData = res.data as BehaviorRecordData; // ⬅️ Use new, correct interface

      // Set form data (Your code was correct)
      setFormData({
        category: recordData.category || "",
        offense_type: recordData.offense_type || "Minor",
        offense_count: recordData.offense_count?.toString() || "1",
        description: recordData.description || "",
        action_taken: recordData.action_taken || "",
        action_taken_details: recordData.action_taken_details || "",
        reported_by: recordData.reported_by || "",
      });

      // ⭐️ FIX: Adapt the nested SimpleStudent into our unified StudentDisplay state
      const simpleStudent = recordData.student;
      if (simpleStudent) {
        const studentForState: StudentDisplay = {
          id: simpleStudent.id,
          lrn: simpleStudent.lrn,
          first_name: simpleStudent.first_name,
          last_name: simpleStudent.last_name,
          grade: recordData.grade, // Use the top-level grade/section
          section_name: recordData.section_name,
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
        description: "Failed to load behavior record.",
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
  }, [studentSearch, navigate, isEditMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> // ⬅️ FIX: Added HTMLSelectElement
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
      // date is only set on create, not edit
      ...(!isEditMode && { date: new Date().toISOString() }), // Send full ISO string
      behavior_type: "Negative", // This seems hardcoded, which is fine
      category: formData.category.trim(),
      offense_type: formData.offense_type,
      offense_count: Number(formData.offense_count),
      description: formData.description.trim(),
      action_taken: formData.action_taken.trim(),
      action_taken_details: formData.action_taken_details.trim(),
      reported_by: formData.reported_by.trim(),
    };

    try {
      if (isEditMode) {
        await api.put(`/behavior-records/${id}/`, payload);
        toast({
          title: "Success",
          description: "Behavior record updated successfully.",
        });
      } else {
        await api.post("/behavior-records/", payload);
        toast({
          title: "Success",
          description: "Behavior record added successfully.",
        });
      }

      navigate("/behavior");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data
          ? JSON.stringify(err.response.data)
          : `Failed to ${isEditMode ? "update" : "add"} behavior record.`,
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

  const currentOffenseList =
    formData.offense_type === "Minor" ? MINOR_OFFENSES : MAJOR_OFFENSES;

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit" : "Add"} Behavior Record</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ⭐️ --- UPDATED STUDENT SEARCH --- ⭐️ */}
            <div className="relative">
              <Label htmlFor="student-search">Student *</Label>
              <Input
                id="student-search" // Use a different ID from state keys
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  if (!isEditMode) setSelectedStudent(null);
                }}
                placeholder="Type student name or LRN..." // ⬅️ FIX: Updated placeholder
                required
                disabled={isEditMode}
                autoComplete="off"
              />

              {/* Search Results Dropdown */}
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

            {/* Offense Type / Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offense_type">Offense Type *</Label>
                <select
                  id="offense_type"
                  value={formData.offense_type}
                  onChange={(e) => {
                    handleChange(e); // ⬅️ FIX: Use standard handler
                    setFormData((prev) => ({ ...prev, category: "" })); // Reset category
                  }}
                  className="border rounded-md px-3 py-2 w-full h-10 bg-transparent" // ⬅️ FIX: Use standard shadcn styling
                  required
                >
                  <option value="Minor">Minor Offense</option>
                  <option value="Major">Major Offense</option>
                </select>
              </div>

              <div>
                <Label htmlFor="offense_count">Offense Count *</Label>
                <select
                  id="offense_count"
                  value={formData.offense_count}
                  onChange={handleChange} // ⬅️ FIX: Use standard handler
                  className="border rounded-md px-3 py-2 w-full h-10 bg-transparent" // ⬅️ FIX: Use standard shadcn styling
                  required
                >
                  <option value="1">1st Offense</option>
                  <option value="2">2nd Offense</option>
                  <option value="3">3rd Offense</option>
                  <option value="4">4th Offense</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Note: 4th minor offense = 1 major offense
                </p>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">
                Category/Violation * ({formData.offense_type} Offense)
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={handleChange} // ⬅️ FIX: Use standard handler
                className="border rounded-md px-3 py-2 w-full h-10 bg-transparent" // ⬅️ FIX: Use standard shadcn styling
                required
              >
                <option value="">Select violation</option>
                {currentOffenseList.map((offense, idx) => (
                  <option key={idx} value={offense}>
                    {offense}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Incident Description *</Label>
              <Textarea
                id="description"
                placeholder="Provide detailed description of the incident..."
                value={formData.description}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            {/* ⭐️ --- UPDATED ACTION TAKEN --- ⭐️ */}
            <div>
              <Label htmlFor="action_taken">Action Taken / Intervention *</Label>
              <select
                id="action_taken"
                value={formData.action_taken}
                onChange={handleChange} // ⬅️ FIX: Use standard handler
                className="border rounded-md px-3 py-2 w-full h-10 bg-transparent mb-2" // ⬅️ FIX: Use standard shadcn styling
                required
              >
                <option value="">Select action taken</option>
                {ACTION_TAKEN_OPTIONS.map((action, idx) => (
                  <option key={idx} value={action}>
                    {action}
                  </option>
                ))}
              </select>
              
              <Label htmlFor="action_taken_details" className="text-sm text-muted-foreground">
                Additional Details
              </Label>
              <Textarea
                id="action_taken_details"
                placeholder="Additional details about the action taken (if any)..."
                value={formData.action_taken_details}
                onChange={handleChange} 
                rows={3}
              />
            </div>

            {/* Reported By */}
            <div>
              <Label htmlFor="reported_by">Reported By *</Label>
              <Input
                id="reported_by"
                placeholder="e.g. Mr. Santos, Ms. Reyes"
                value={formData.reported_by}
                onChange={handleChange}
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-3 mt-6 pt-4 border-t">
              <Button type="submit" className="flex-1" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {isEditMode ? "Update" : "Save"} Record
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate("/behavior")}
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

export default AddEditBehaviorRecord;