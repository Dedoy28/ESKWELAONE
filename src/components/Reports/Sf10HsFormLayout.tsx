// src/components/reports/Sf10HsFormLayout.tsx
// ⭐️ FINAL FIXED VERSION: Correctly Maps History to Grade Levels ⭐️

import React from "react";
import DepEdLogo from "@/assets/deped.png"; 
import DepEdLogoRight from "@/assets/depedlogo.png"; 

// Import Grade type only
import { Grade } from "@/pages/Reports"; 

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define Interfaces locally to ensure safety
interface SectionHistory {
  id: number;
  school_year: string;
  section: {
    name: string;
    grade: string;
    adviser_name: string | null;
  };
  is_active: boolean;
}

export interface Student {
  id: number;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  nameExtension?: string;
  birth_date?: string;
  sex: string;
  
  grade: string;
  section: string;
  adviser?: string;
  general_average?: string;

  elementarySchool?: string;
  elementarySchoolId?: string;
  elementarySchoolAddress?: string;
  elementaryGenAve?: string | number;

  gradesByYear?: Record<string, Grade[]>;
  section_history?: SectionHistory[];
}

interface Sf10HsFormLayoutProps {
  student: Student | null; 
}

// Helper functions
const formatGrade = (gradeValue: string | number | null | undefined, decimalPlaces: number = 0): string => {
    if (gradeValue === null || gradeValue === undefined || gradeValue === '') return '';
    const num = Number(gradeValue);
    if (isNaN(num)) return '';
    return num.toFixed(decimalPlaces);
};

const parseGrade = (gradeValue: string | number | null | undefined): number | null => {
    if (gradeValue === null || gradeValue === undefined || gradeValue === '') return null;
    const num = Number(gradeValue);
    return isNaN(num) ? null : num;
}

const Sf10HsFormLayout: React.FC<Sf10HsFormLayoutProps> = ({ student }) => {
  if (!student) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 border text-gray-500 text-center print:hidden">
        Search for and select a student to view their SF10.
      </div>
    );
  }

  const studentInfo = {
    lastName: student.lastName || 'N/A',
    firstName: student.firstName || 'N/A',
    nameExtension: student.nameExtension || '',
    middleName: student.middleName || '',
    lrn: student.lrn || 'N/A',
    birthDate: student.birth_date ? new Date(student.birth_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A',
    sex: student.sex || 'N/A',
    elemSchool: student.elementarySchool || 'N/A',
    elemSchoolId: student.elementarySchoolId || 'N/A',
    elemSchoolAddress: student.elementarySchoolAddress || 'N/A',
    elemGenAve: student.elementaryGenAve !== null && student.elementaryGenAve !== undefined ? String(student.elementaryGenAve) : 'N/A',
  };

  const coreLearningAreas = [
    "Filipino", "English", "Mathematics", "Science", "Araling Panlipunan (AP)",
    "Edukasyon sa Pagpapakatao (EsP)", "Technology and Livelihood Education (TLE)",
  ];
  const mapehComponents = ["Music", "Arts", "Physical Education", "Health"];

  const findGrade = (year: string, subject: string): Grade | undefined => {
      return student?.gradesByYear?.[year]?.find(g => g.subject_name === subject);
  }

  const calculateMapehAverage = (year: string, field: keyof Omit<Grade, 'subject_name'>): number | null => {
      if (!year || !student.gradesByYear?.[year]) return null;
      const componentGrades = mapehComponents
          .map(comp => findGrade(year, comp)?.[field])
          .map(parseGrade)
          .filter(gradeNum => gradeNum !== null) as number[];
      if (componentGrades.length === 0) return null;
      const sum = componentGrades.reduce((acc, val) => acc + val, 0);
      return sum / componentGrades.length;
  }

  // Helper: Get Historical Section & Adviser
  const getHistoricalSectionData = (targetSchoolYear: string | undefined) => {
      if (!targetSchoolYear) return { section: 'N/A', adviser: 'N/A' };
      
      if (student.section_history && Array.isArray(student.section_history)) {
          const historyRecord = student.section_history.find(h => h.school_year === targetSchoolYear);
          if (historyRecord) {
              return {
                  section: historyRecord.section.name,
                  adviser: historyRecord.section.adviser_name || 'N/A'
              };
          }
      }
      return { section: 'N/A', adviser: 'N/A' };
  };

  // --- ⭐️ FIXED: LOGIC TO MAP GRADES TO YEARS ⭐️ ---
  // Instead of guessing based on array index, we look at the actual Enrollment History.
  const gradeToYearMap: Record<string, string> = {};
  const availableYears: string[] = []; // Track years for dropdowns/display

  if (student.section_history && Array.isArray(student.section_history)) {
      student.section_history.forEach(record => {
          if (record.section && record.section.grade) {
              // Map "7" -> "2024-2025"
              gradeToYearMap[record.section.grade] = record.school_year;
              if (!availableYears.includes(record.school_year)) {
                  availableYears.push(record.school_year);
              }
          }
      });
      // Sort years for display logic
      availableYears.sort();
  }
  // ---------------------------------------------------

  const renderGradeLevelRecord = (gradeLevel: string, schoolYear: string | undefined) => {
    const displayYear = schoolYear || ''; 
    
    let sectionName = 'N/A';
    let adviserName = 'N/A';

    if (displayYear) {
        const historyData = getHistoricalSectionData(displayYear);
        if (historyData.section !== 'N/A') {
            sectionName = historyData.section;
            adviserName = historyData.adviser;
        }
    }

    return (
        <div className="mb-4 border border-black p-2 break-inside-avoid">
          <div className="grid grid-cols-4 gap-x-2 gap-y-0 text-xs mb-2">
            <div><span className="font-semibold">School:</span> Sindalan National High School</div>
            <div><span className="font-semibold">School ID:</span> 3009</div>
            <div><span className="font-semibold">District:</span> San Fernando North</div>
            <div><span className="font-semibold">Division:</span> City of San Fernando (P)</div>
            <div><span className="font-semibold">Region:</span> III</div>
            <div><span className="font-semibold">Classified as Grade:</span> {gradeLevel}</div>
            <div><span className="font-semibold">Section:</span> {sectionName}</div>
            <div><span className="font-semibold">School Year:</span> {displayYear || '____________'}</div>
            <div className="col-span-2"><span className="font-semibold">Name of Adviser/Teacher:</span> {adviserName}</div>
            <div className="col-span-2"><span className="font-semibold">Signature:</span> _________________________</div>
          </div>

          <table className="w-full border-collapse border border-black text-xs mb-2">
            <thead className="bg-gray-100 font-semibold text-center">
              <tr>
                <th rowSpan={2} className="border border-black px-1 py-0.5 w-1/4">Learning Areas</th>
                <th colSpan={4} className="border border-black px-1 py-0.5">Quarterly Rating</th>
                <th rowSpan={2} className="border border-black px-1 py-0.5 w-[10%]">Final Rating</th>
                <th rowSpan={2} className="border border-black px-1 py-0.5 w-[10%]">Remarks</th>
              </tr>
              <tr>
                <th className="border border-black px-1 py-0.5 w-[8%]">1</th>
                <th className="border border-black px-1 py-0.5 w-[8%]">2</th>
                <th className="border border-black px-1 py-0.5 w-[8%]">3</th>
                <th className="border border-black px-1 py-0.5 w-[8%]">4</th>
              </tr>
            </thead>
            <tbody>
              {coreLearningAreas.map((area) => {
                  const gradeData = displayYear ? findGrade(displayYear, area) : undefined;
                  const q1Formatted = formatGrade(gradeData?.q1);
                  const q2Formatted = formatGrade(gradeData?.q2);
                  const q3Formatted = formatGrade(gradeData?.q3);
                  const q4Formatted = formatGrade(gradeData?.q4);
                  const finalFormatted = formatGrade(gradeData?.final);
                  const finalNumeric = parseGrade(gradeData?.final);
                  const remarks = finalNumeric !== null ? (finalNumeric >= 75 ? "Passed" : "Failed") : "";

                  return (
                    <tr key={`${gradeLevel}-${area}`}>
                      <td className="border border-black px-1 py-0.5 font-medium">{area}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q1Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q2Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q3Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q4Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-semibold">{finalFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{remarks}</td>
                    </tr>
                  );
              })}
              {(() => {
                  const mapehQ1AvgNum = displayYear ? calculateMapehAverage(displayYear, 'q1') : null;
                  const mapehQ2AvgNum = displayYear ? calculateMapehAverage(displayYear, 'q2') : null;
                  const mapehQ3AvgNum = displayYear ? calculateMapehAverage(displayYear, 'q3') : null;
                  const mapehQ4AvgNum = displayYear ? calculateMapehAverage(displayYear, 'q4') : null;
                  const mapehFinalAvgNum = displayYear ? calculateMapehAverage(displayYear, 'final') : null;
                  const mapehQ1AvgFormatted = formatGrade(mapehQ1AvgNum);
                  const mapehQ2AvgFormatted = formatGrade(mapehQ2AvgNum);
                  const mapehQ3AvgFormatted = formatGrade(mapehQ3AvgNum);
                  const mapehQ4AvgFormatted = formatGrade(mapehQ4AvgNum);
                  const mapehFinalAvgFormatted = formatGrade(mapehFinalAvgNum);
                  const mapehRemarks = mapehFinalAvgNum !== null ? (mapehFinalAvgNum >= 75 ? "Passed" : "Failed") : "";

                  return (
                    <tr key={`${gradeLevel}-MAPEH`}>
                      <td className="border border-black px-1 py-0.5 font-medium">MAPEH</td>
                      <td className="border border-black px-1 py-0.5 text-center">{mapehQ1AvgFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{mapehQ2AvgFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{mapehQ3AvgFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{mapehQ4AvgFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-semibold">{mapehFinalAvgFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{mapehRemarks}</td>
                    </tr>
                  );
              })()}
              {mapehComponents.map((component) => {
                  const gradeData = displayYear ? findGrade(displayYear, component) : undefined;
                  const q1Formatted = formatGrade(gradeData?.q1);
                  const q2Formatted = formatGrade(gradeData?.q2);
                  const q3Formatted = formatGrade(gradeData?.q3);
                  const q4Formatted = formatGrade(gradeData?.q4);
                  const finalFormatted = formatGrade(gradeData?.final);
                  return (
                    <tr key={`${gradeLevel}-${component}`}>
                      <td className="border border-black pl-4 pr-1 py-0.5">{component}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q1Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q2Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q3Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{q4Formatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{finalFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center"></td>
                    </tr>
                  );
              })}
              <tr><td className="border border-black px-1 py-0.5 h-[18px]">&nbsp;</td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
              {(() => {
                  const coreFinals = coreLearningAreas
                          .map(area => parseGrade(displayYear ? findGrade(displayYear, area)?.final : null))
                          .filter(f => f !== null) as number[];
                  const mapehFinalAvgNum = displayYear ? calculateMapehAverage(displayYear, 'final') : null;
                  const allFinalRatings = mapehFinalAvgNum !== null ? [...coreFinals, mapehFinalAvgNum] : coreFinals;
                  let yearAverageFormatted: string = '';
                  let yearRemarks = '';
                  if (allFinalRatings.length > 0 ) {
                        const sum = allFinalRatings.reduce((acc, val) => acc + val, 0);
                        const yearAverageNum = sum / allFinalRatings.length;
                        yearAverageFormatted = formatGrade(yearAverageNum, 2);
                        yearRemarks = yearAverageNum >= 75 ? "Promoted" : "Retained";
                  }
                  return (
                    <tr className="font-semibold bg-gray-50">
                      <td colSpan={5} className="text-right px-1 py-0.5 border border-black">General Average</td>
                      <td className="border border-black px-1 py-0.5 text-center">{yearAverageFormatted}</td>
                      <td className="border border-black px-1 py-0.5 text-center">{yearRemarks}</td>
                    </tr>
                  );
              })()}
            </tbody>
          </table>

          <div className="text-[10px] print:text-[9px] font-semibold mb-0.5">Remedial Classes</div>
          <table className="w-full border-collapse border border-black text-xs mb-1">
            <thead className="bg-gray-100 font-semibold text-center">
              <tr><th className="border border-black px-1 py-0.5 w-[30%]">Learning Areas</th><th className="border border-black px-1 py-0.5 w-[15%]">Final Rating</th><th className="border border-black px-1 py-0.5 w-[15%]">Remedial Class Mark</th><th className="border border-black px-1 py-0.5 w-[20%]">Recomputed Final Grade</th><th className="border border-black px-1 py-0.5 w-[20%]">Remarks</th></tr>
            </thead>
            <tbody>
              <tr><td className="border border-black px-1 py-0.5 text-[10px] print:text-[9px]">Conducted from: __________</td><td className="border border-black px-1 py-0.5 text-[10px] print:text-[9px]">to: __________</td><td className="border border-black px-1 py-0.5"></td><td className="border border-black px-1 py-0.5"></td><td className="border border-black px-1 py-0.5"></td></tr>
              <tr><td className="border border-black px-1 py-0.5 h-[18px]">&nbsp;</td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>
            </tbody>
          </table>
        </div>
      );
  };

  const renderMobileGradeTable = (schoolYear: string) => {
    const coreGrades = coreLearningAreas.map(area => {
      const gradeData = findGrade(schoolYear, area);
      const finalNumeric = parseGrade(gradeData?.final);
      const remarks = finalNumeric !== null ? (finalNumeric >= 75 ? "Passed" : "Failed") : "";
      return {
        name: area,
        final: formatGrade(finalNumeric),
        remarks: remarks
      };
    });

    const mapehFinalAvgNum = calculateMapehAverage(schoolYear, 'final');
    const mapehRemarks = mapehFinalAvgNum !== null ? (mapehFinalAvgNum >= 75 ? "Passed" : "Failed") : "";
    const mapehAvgGrade = {
      name: "MAPEH (Average)",
      final: formatGrade(mapehFinalAvgNum),
      remarks: mapehRemarks
    };

    const mapehComponentGrades = mapehComponents.map(area => {
      const gradeData = findGrade(schoolYear, area);
      const finalNumeric = parseGrade(gradeData?.final);
      return {
        name: `  • ${area}`, 
        final: formatGrade(finalNumeric),
        remarks: "" 
      };
    });

    const allFinals = [...coreGrades.map(g => parseGrade(g.final)), parseGrade(mapehAvgGrade.final)]
      .filter(f => f !== null) as number[];
    
    let genAveStr = "";
    let genAveRemarks = "";
    if (allFinals.length > 0) {
      const sum = allFinals.reduce((acc, val) => acc + val, 0);
      const avg = sum / allFinals.length;
      genAveStr = formatGrade(avg, 2);
      genAveRemarks = avg >= 75 ? "Promoted" : "Retained";
    }
    
    const genAveGrade = {
      name: "General Average",
      final: genAveStr,
      remarks: genAveRemarks
    };

    const allRows = [
      ...coreGrades,
      mapehAvgGrade,
      ...mapehComponentGrades,
      genAveGrade
    ];

    return (
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Subject</TableHead>
            <TableHead className="text-center font-semibold">Final</TableHead>
            <TableHead className="text-center font-semibold">Remarks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRows.map(row => (
            <TableRow key={row.name}>
              <TableCell className={`py-1 ${row.name.startsWith('  •') ? 'pl-6' : 'font-medium'}`}>
                {row.name}
              </TableCell>
              <TableCell className={`py-1 text-center ${row.name === 'General Average' ? 'font-bold' : ''}`}>
                {row.final}
              </TableCell>
              <TableCell className={`py-1 text-center ${row.remarks === 'Failed' ? 'text-red-600' : ''} ${row.name === 'General Average' ? 'font-bold' : ''}`}>
                {row.remarks}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };
  
  // --- Main Component Render ---
  return (
    <>
      <div className="hidden md:block print:block bg-white shadow-lg rounded-lg p-4 border text-gray-900 text-[10px] print:text-[9px] print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-2 relative print:mb-1">
          <img src={DepEdLogo} alt="DepEd Logo" className="w-40 h-20 absolute top-0 left-2" />
          <img src={DepEdLogoRight} alt="DepEd Logo Right" className="w-30 h-20 absolute top-0 right-2" /> 
          <p className="text-[10px] print:text-[9px]">Republic of the Philippines</p>
          <p className="text-sm font-semibold print:text-xs">Department of Education</p>
          <p className="text-base font-bold uppercase mt-1 print:text-sm">Learner Permanent Record for Junior High School</p>
          <p className="text-sm font-bold uppercase print:text-xs">(SF10-JHS)</p>
          <p className="text-[9px] font-semibold print:text-[8px]">(Formerly Form 137)</p>
        </div>

        <hr className="border-black my-1" />

        <h3 className="font-bold text-center text-xs mb-0.5 uppercase print:text-[10px]">Learner's Information</h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-0 text-[10px] print:text-[9px] mb-1 border border-black p-1">
            <div><span className="font-semibold">LAST NAME:</span> {studentInfo.lastName}</div>
            <div><span className="font-semibold">FIRST NAME:</span> {studentInfo.firstName}</div>
            <div className="col-span-2"><span className="font-semibold">EXT NAME:</span> {studentInfo.nameExtension}</div>
            <div className="col-span-2"><span className="font-semibold">MIDDLE NAME:</span> {studentInfo.middleName}</div>
            <div><span className="font-semibold">LRN:</span> {studentInfo.lrn}</div>
            <div><span className="font-semibold">Birthdate:</span> {studentInfo.birthDate}</div>
            <div className="col-span-2"><span className="font-semibold">Sex:</span> {studentInfo.sex}</div>
        </div>

        <h3 className="font-bold text-center text-xs mb-0.5 uppercase print:text-[10px]">Eligibility for JHS Enrolment</h3>
        <div className="border border-black p-1 text-[10px] print:text-[9px] mb-1">
          <div className="flex items-center mb-0.5">
              <input type="checkbox" className="mr-1 scale-75" checked={!!studentInfo.elemSchool && studentInfo.elemSchool !== 'N/A'} readOnly />
              <span>Elementary School Completer</span>
              <span className="ml-2 font-semibold">Gen Ave:</span> {studentInfo.elemGenAve}
              <span className="ml-2 font-semibold">Citation:</span> _________________________
          </div>
          <div className="grid grid-cols-3 gap-x-2">
              <div><span className="font-semibold">School:</span> {studentInfo.elemSchool}</div>
              <div><span className="font-semibold">School ID:</span> {studentInfo.elemSchoolId}</div>
              <div><span className="font-semibold">Address:</span> {studentInfo.elemSchoolAddress}</div>
          </div>
        </div>

        <h3 className="font-bold text-center text-xs mb-0.5 uppercase print:text-[10px]">Other Credential Presented</h3>
         <div className="border border-black p-1 text-[10px] print:text-[9px] mb-2">
             <div className="flex items-center mb-0.5 space-x-2">
                 <div className="flex items-center"> <input type="checkbox" className="mr-1 scale-75" readOnly /> <span>PEPT Passer</span> <span className="ml-1 font-semibold">Rating:</span> ______ </div>
                 <div className="flex items-center"> <input type="checkbox" className="mr-1 scale-75" readOnly /> <span>ALS A&E Passer</span> <span className="ml-1 font-semibold">Rating:</span> ______ </div>
                 <div className="flex items-center flex-grow"> <input type="checkbox" className="mr-1 scale-75" readOnly /> <span>Others:</span> <span className="underline flex-grow ml-1">________________</span> </div>
             </div>
             <div className="grid grid-cols-2 gap-x-2">
                 <div><span className="font-semibold">Date Exam/Assess:</span> _____________</div>
                 <div><span className="font-semibold">Testing Center:</span> _________________________</div>
             </div>
         </div>

         <h3 className="font-bold text-center text-xs mb-1 uppercase print:text-[10px]">Scholastic Record</h3>

        {renderGradeLevelRecord("7", gradeToYearMap["7"])}
        {renderGradeLevelRecord("8", gradeToYearMap["8"])}
        {renderGradeLevelRecord("9", gradeToYearMap["9"])}
        {renderGradeLevelRecord("10", gradeToYearMap["10"])}

         <div className="border border-black p-2 mt-1 text-[10px] print:text-[9px] break-inside-avoid">
             <h3 className="font-bold text-center text-[11px] print:text-[10px] mb-0.5 uppercase">Certification</h3>
             <p className="mb-0.5 text-center">
                 I CERTIFY that this is a true record of <span className="font-semibold underline">{studentInfo.firstName} {studentInfo.middleName || ''} {studentInfo.lastName} {studentInfo.nameExtension || ''}</span> with LRN <span className="font-semibold underline">{studentInfo.lrn}</span>
             </p>
             {(() => { 
                 const currentGrade = parseInt(student.grade || '0');
                 const nextGrade = currentGrade + 1;
                 const relevantAverageNum = parseGrade(student.general_average);
                 const isEligible = relevantAverageNum !== null && relevantAverageNum >= 75 && nextGrade <= 11;
                 const admissionGrade = isEligible ? (nextGrade > 10 ? 'Grade 11' : `Grade ${nextGrade}`) : '_____';
                 return ( <p className="mb-1 text-center">and that he/she is eligible for admission to {admissionGrade}.</p> );
             })()}
             <div className="grid grid-cols-3 gap-x-2 mb-1">
                 <div><span className="font-semibold">School:</span> Sindalan NHS</div>
                 <div><span className="font-semibold">School ID:</span> 3009</div>
                 <div><span className="font-semibold">Last SY Attended:</span> {availableYears[availableYears.length - 1] ?? '__________'}</div>
             </div>
             <div className="grid grid-cols-2 mt-3">
                 <div className="text-center">
                     <p className="mb-0.5">_________________________</p>
                     <p className="font-semibold">Date</p>
                 </div>
                 <div className="text-center relative">
                     <p className="mb-0.5">_________________________</p>
                     <p className="font-semibold">Name of Principal/School Head over Printed Name</p>
                     <p className="absolute bottom-[-6px] right-[10%] text-gray-400 text-[8px]">(Affix School Seal)</p>
                 </div>
             </div>
        </div>

      </div>

      <div className="md:hidden print:hidden space-y-4">
        <div className="bg-white shadow-lg rounded-lg border">
          <h3 className="font-bold text-center text-sm p-3 bg-gray-50 rounded-t-lg">Learner's Information</h3>
          <div className="p-4 space-y-2 text-sm">
            <div><span className="font-semibold text-gray-600">Name:</span> {studentInfo.lastName}, {studentInfo.firstName} {studentInfo.nameExtension}</div>
            <div><span className="font-semibold text-gray-600">Middle:</span> {studentInfo.middleName || 'N/A'}</div>
            <div><span className="font-semibold text-gray-600">LRN:</span> {studentInfo.lrn}</div>
            <div><span className="font-semibold text-gray-600">Birthdate:</span> {studentInfo.birthDate}</div>
            <div><span className="font-semibold text-gray-600">Sex:</span> {studentInfo.sex}</div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg border">
            <h3 className="font-bold text-center text-sm p-3 bg-gray-50 rounded-t-lg">Eligibility for JHS</h3>
            <div className="p-4 space-y-2 text-sm">
            <div><span className="font-semibold text-gray-600">School:</span> {studentInfo.elemSchool}</div>
            <div><span className="font-semibold text-gray-600">School ID:</span> {studentInfo.elemSchoolId}</div>
            <div><span className="font-semibold text-gray-600">Address:</span> {studentInfo.elemSchoolAddress}</div>
            <div><span className="font-semibold text-gray-600">Gen. Ave:</span> {studentInfo.elemGenAve}</div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg border">
          <h3 className="font-bold text-center text-sm p-3 bg-gray-50 rounded-t-lg">Scholastic Record</h3>
          {availableYears.length > 0 ? (
            <Accordion type="single" collapsible className="w-full" defaultValue={`grade-${parseInt(student.grade || '0')}`}>
              {["7", "8", "9", "10"].map(gradeLevel => {
                const year = gradeToYearMap[gradeLevel];
                if (!year) {
                  return (
                    <AccordionItem value={`grade-${gradeLevel}`} key={gradeLevel} disabled>
                        <AccordionTrigger className="px-4 text-gray-400">
                          Grade {gradeLevel} (No Data)
                        </AccordionTrigger>
                    </AccordionItem>
                  );
                }
                
                return (
                  <AccordionItem value={`grade-${gradeLevel}`} key={gradeLevel}>
                    <AccordionTrigger className="px-4 text-base">
                      Grade {gradeLevel} (S.Y. {year})
                    </AccordionTrigger>
                    <AccordionContent className="px-1">
                      {renderMobileGradeTable(year)}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <p className="text-center text-gray-500 p-4">No scholastic records found.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Sf10HsFormLayout;