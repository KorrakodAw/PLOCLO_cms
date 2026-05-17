import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import {
  getCloScorePerStudentPerCourse,
  getCloScorePerCourse,
  getCloScoreAllStudentPerCourse,
  getCloPercentageAllStudentPerCourse,
  getCloStatsPerCourse,
  getCloStatsPercentagePerCourse,
  getCloGradeSummaryPerCourse,
} from "../service/cloCal";

import {
   getTotalScoreAndGradePerStudentPerCourse,
   getTotalScoreAndGradeAllStudentPerCourse
} from "../service/realScore";

// PLO
//---------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student 1 คนใน 1 course
/////////////////////////////////////////////////////////////////////////

export async function getPloScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  CsemesterId: number,
  courseId: number,
) {
  // 1. หาว่า student อยู่ program ไหน
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true },
  });
  if (!student) throw new Error("Student not found");

  const studentProgramId = student.program_id;

  // 2. ดึง CLO scores ของนักเรียน
  const cloResult = await getCloScorePerStudentPerCourse(
    tx,
    studentId,
    CsemesterId,
  );

  type CloMapping = {
    clo: { code: string };
    plo: { id: number; code: string; program_id: number };
    weight: number;
  };

  // 3. ดึง CLO → PLO mapping ของ course
  const cloMappings: CloMapping[] = await tx.cloPloMapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { id: true, code: true, program_id: true } },
      weight: true,
    },
  });

  // 4. คำนวณ contribution และ group ตาม program_id + ploCode
  const ploGroups: Record<string, number> = {};

  cloMappings.forEach((map: CloMapping) => {
    // ข้ามถ้าไม่ใช่ program ของนักเรียน
    if (map.plo.program_id !== studentProgramId) return;

    const cloScore = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code),
    );
    if (!cloScore) return;

    const contribution = Number(cloScore.cloScore) * (Number(map.weight) / 100);

    const key = `${map.plo.program_id}_${map.plo.code}`;
    ploGroups[key] = (ploGroups[key] ?? 0) + contribution;
  });

  // 5. คืนค่าเฉพาะ program ของนักเรียน
  const ploScores = Object.entries(ploGroups).map(([key, ploScore]) => {
    const [programId, ploCode] = key.split("_");
    return {
      programId: Number(programId),
      ploCode,
      ploScore,
    };
  });

  return { ploScores };
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number,
) {
  const students = await tx.studentScore.findMany({
    where: {
      assignment: {
        semester_id: Number(CsemesterId),
      },
    },
    distinct: ["student_id"],
    select: { student_id: true },
  });

  const results = [];
  for (const s of students) {
    const ploResult = await getPloScorePerStudentPerCourse(
      tx,
      s.student_id,
      CsemesterId,
      courseId,
    );
    results.push({
      student_id: s.student_id,
      programId:
        ploResult.ploScores.length > 0
          ? ploResult.ploScores[0].programId
          : null,
      //ploScores: ploResult.ploScores,
      ploScores: ploResult.ploScores.map(({ ploCode, ploScore }) => ({
        ploCode,
        ploScore,
      })),
    });
  }
  // เรียงตาม student_id เพื่อให้ง่ายต่อการอ่านผลลัพธ์
  results.sort((a, b) => a.student_id - b.student_id);
  return results;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ PLO ของนักเรียนแต่ละคนออกมาเป็น percentage เทียบกับ highestPossible
/////////////////////////////////////////////////////////////////////////
// กำหนด type ของ stat ที่อยู่ใน plos
type PloStat = {
  min: number;
  max: number;
  mean: number;
  median: number;
  highestPossible: number;
};

export async function getPloPercentageAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนน PLO ของนักเรียนแต่ละคน
    const perStudent = await getPloScoreAllStudentPerCourse(
      tx,
      CsemesterId,
      courseId,
    );

    // 2) ดึงค่า highestPossible ของแต่ละ PLO แยกตาม programId
    const { ploStats } = await getPloStatsPerCourse(tx, CsemesterId, courseId);

    // สร้าง map: programId + ploCode → highestPossible
    const highestPloMap: Record<string, number> = {};
    ploStats.forEach((programStat) => {
      Object.entries(programStat.plos).forEach(([ploCode, stat]) => {
        const s = stat as PloStat; // ✅ cast type ให้ชัดเจน
        const key = `${programStat.programId}_${ploCode}`;
        highestPloMap[key] = s.highestPossible;
      });
    });

    // 3) คำนวณเปอร์เซ็นต์ต่อ student ต่อ PLO
    const results: {
      studentId: number;
      programId: number | null; // ✅ รองรับ null ตาม schema
      ploPercentages: { ploCode: string; percentage: number }[];
    }[] = [];

    perStudent.forEach((student) => {
      const ploPercentages: { ploCode: string; percentage: number }[] = [];

      student.ploScores.forEach((plo) => {
        const key = `${student.programId}_${plo.ploCode}`;
        const highest = highestPloMap[key] ?? 0;
        const percentage = highest > 0 ? (plo.ploScore / highest) * 100 : 0;

        ploPercentages.push({
          ploCode: plo.ploCode,
          percentage: Number(percentage.toFixed(4)),
        });
      });

      results.push({
        studentId: student.student_id,
        programId: student.programId,
        ploPercentages,
      });
    });

    return { ploPercentagePerStudent: results };
  });

  return result;
}

/**
 * สรุปจำนวน student ต่อเกรด และค่าเฉลี่ยคะแนน PLO แต่ละตัวแยกตามเกรด
 * โดยอาศัยผลลัพธ์คะแนน PLO จากฟังก์ชัน getPloScoreAllStudentPerCourse
 */
export async function getPloGradeSummary(
  tx: any,
  CsemesterId: number,
  courseId: number
) {
  // 1. ดึงคะแนน PLO ของนักเรียนทุกคนใน Course นี้
  const ploStudents = await getPloScoreAllStudentPerCourse(tx, CsemesterId, courseId);

  // 2. ดึงเกรดจริงและคะแนนรวมจริงของนักเรียนในวิชานี้มาทำเป็น Map เพื่อใช้จับคู่ความถูกต้อง
  const { studentResults } = await getTotalScoreAndGradeAllStudentPerCourse(tx, CsemesterId);
  
  const studentInfoMap = new Map<number, { grade: string; totalScore: number }>();
  studentResults.forEach((s: any) => {
    studentInfoMap.set(s.student_id, { grade: s.grade, totalScore: s.totalScore });
  });

  // 3. เตรียมโครงสร้างข้อมูลสำหรับจัดกลุ่มเกรด
  const gradeSummary: Record<
    string,
    {
      count: number;
      categoryAverages: Record<string, number>; // ในที่นี้จะเก็บค่าเฉลี่ยแยกตาม ploCode
      totalAverage: number;                    // ค่าเฉลี่ยคะแนนรวมจริงรายวิชาของเด็กกลุ่มเกรดนี้
    }
  > = {};

  // 4. จัดกลุ่มคะแนน PLO ลงตามเกรดจริงของนักเรียน
  for (const student of ploStudents) {
    const info = studentInfoMap.get(student.student_id) || { grade: "F", totalScore: 0 };
    const grade = info.grade;

    if (!gradeSummary[grade]) {
      gradeSummary[grade] = {
        count: 0,
        categoryAverages: {},
        totalAverage: 0,
      };
    }

    gradeSummary[grade].count += 1;
    gradeSummary[grade].totalAverage += info.totalScore;

    // สะสมคะแนนดิบของแต่ละ PLO
    for (const plo of student.ploScores) {
      if (!gradeSummary[grade].categoryAverages[plo.ploCode]) {
        gradeSummary[grade].categoryAverages[plo.ploCode] = 0;
      }
      gradeSummary[grade].categoryAverages[plo.ploCode] += plo.ploScore;
    }
  }

  // 5. คำนวณหาค่าเฉลี่ย PLO และค่าเฉลี่ยคะแนนรวมจริงต่อเกรด
  for (const grade in gradeSummary) {
    const summary = gradeSummary[grade];
    
    for (const ploCode in summary.categoryAverages) {
      summary.categoryAverages[ploCode] = 
        Number((summary.categoryAverages[ploCode] / summary.count).toFixed(2));
    }
    
    summary.totalAverage = Number((summary.totalAverage / summary.count).toFixed(2));
  }

  // 6. เรียงลำดับผลลัพธ์ตามตัวอักษรของเกรด (A-Z)
  const gradeSummarySorted = Object.keys(gradeSummary)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = gradeSummary[key];
      return acc;
    }, {} as typeof gradeSummary);

  return gradeSummarySorted;
}

/**
 * สรุปจำนวน student ต่อเกรด โดยแปลงค่าเฉลี่ย PLO เป็นเปอร์เซ็นต์
 * อ้างอิงคะแนนเต็ม (highestPossible) แยกตาม programId และ ploCode จาก getPloStatsPerCourse
 * และเปลี่ยน totalAverage เป็นผลรวมของเปอร์เซ็นต์เหล่านั้น
 */
export async function getPloGradeSummaryPercentage(
  tx: any,
  CsemesterId: number,
  courseId: number
) {
  // 🛠️ 0) ดึงค่า highestPossible จาก getPloStatsPerCourse และแตกโครงสร้างออกมาเป็น Map เพื่อใช้ค้นหา
  const statsResult = await getPloStatsPerCourse(tx, CsemesterId, courseId);
  const highestPloMap = new Map<string, number>(); // key: "programId_ploCode"
  
  statsResult.ploStats.forEach((prog: any) => {
    if (prog.plos) {
      Object.entries(prog.plos).forEach(([ploCode, stat]: [string, any]) => {
        highestPloMap.set(`${prog.programId}_${ploCode}`, stat.highestPossible);
      });
    }
  });

  // 1) ดึงคะแนน PLO ของนักเรียนทุกคนใน Course นี้ (โค้ดเดิม ไม่แตะต้อง)
  const ploStudents = await getPloScoreAllStudentPerCourse(tx, CsemesterId, courseId);

  // 2) ดึงเกรดจริงและคะแนนรวมจริงของนักเรียนในวิชานี้มาทำเป็น Map (โค้ดเดิม ไม่แตะต้อง)
  const { studentResults } = await getTotalScoreAndGradeAllStudentPerCourse(tx, CsemesterId);
  
  const studentInfoMap = new Map<number, { grade: string; totalScore: number }>();
  studentResults.forEach((s: any) => {
    studentInfoMap.set(s.student_id, { grade: s.grade, totalScore: s.totalScore });
  });

  // 3) เตรียมโครงสร้างข้อมูลสำหรับจัดกลุ่มเกรด (โค้ดเดิม ไม่แตะต้อง)
  const gradeSummary: Record<
    string,
    {
      count: number;
      categoryAverages: Record<string, number>;
      totalAverage: number;
    }
  > = {};

  for (const student of ploStudents) {
    const info = studentInfoMap.get(student.student_id) || { grade: "F", totalScore: 0 };
    const grade = info.grade;

    if (!gradeSummary[grade]) {
      gradeSummary[grade] = {
        count: 0,
        categoryAverages: {},
        totalAverage: 0,
      };
    }

    gradeSummary[grade].count += 1;
    gradeSummary[grade].totalAverage += info.totalScore; // ปล่อยให้สะสมไปก่อน แล้วเราจะไปคำนวณทับในพาสสุดท้าย

    // รวมคะแนน PLO ต่อ grade
    for (const plo of student.ploScores) {
      if (!gradeSummary[grade].categoryAverages[plo.ploCode]) {
        gradeSummary[grade].categoryAverages[plo.ploCode] = 0;
      }

      // 🛠️ [แก้ไขจุดที่ 1]: ดึงค่า highestPossible โดยใช้ความสัมพันธ์ของ programId ของเด็กคนนั้น + ploCode
      const key = `${student.programId}_${plo.ploCode}`;
      const highest = highestPloMap.get(key) || 1; // ใส่ || 1 กันการหารด้วยศูนย์ (Divide by Zero)
      
      // แปลงคะแนนดิบของนักเรียนคนนี้ให้เป็นเปอร์เซ็นต์ทันที ก่อนนำไปบวกรวมสะสมในกลุ่มเกรด
      const studentPloPercentage = (plo.ploScore / highest) * 100;
      
      gradeSummary[grade].categoryAverages[plo.ploCode] += studentPloPercentage;
    }
  }

  // 🛠️ 4) แก้ไขจุดคำนวณค่าเฉลี่ยต่อ grade ให้เป็น เปอร์เซ็นต์ และ ผลรวมเปอร์เซ็นต์
  for (const grade in gradeSummary) {
    const summary = gradeSummary[grade];
    let totalPercentSum = 0; // ตัวแปรสำหรับสะสมผลรวมเปอร์เซ็นต์ของเกรดนี้

    for (const ploCode in summary.categoryAverages) {
      // เนื่องจากเราบวกสะสมในรูปแบบเปอร์เซ็นต์มาแล้ว การหารด้วย count จะได้ค่าเฉลี่ยเปอร์เซ็นต์ที่ถูกต้อง
      const avgPercentage = summary.categoryAverages[ploCode] / summary.count;
      summary.categoryAverages[ploCode] = Number(avgPercentage.toFixed(2));
      
      // นำเปอร์เซ็นต์ของ PLO แต่ละตัวมาบวกสะสมรวมกันใน totalAverage
      totalPercentSum += avgPercentage;
    }
    
    // เปลี่ยนมาเก็บผลรวมของเปอร์เซ็นต์แทนคะแนนเฉลี่ยดิบรวมรายวิชา
    summary.totalAverage = Number(totalPercentSum.toFixed(2));
  }

  // 5) เรียงผลลัพธ์ตามตัวอักษรของ grade (โค้ดเดิม ไม่แตะต้อง)
  const gradeSummarySorted = Object.keys(gradeSummary)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = gradeSummary[key];
      return acc;
    }, {} as typeof gradeSummary);

  return gradeSummarySorted;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ PLO ของนักเรียนแต่ละคนใน 1 semester (รวมทุก course ที่เรียน)
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerSemester(
  tx: any,
  programId: number,
  year: number,
  semester: number,
) {
  // 1. ดึง courseSemester ทั้งหมดในเทอมนี้
  const courseSemesters = await tx.courseSemester.findMany({
    where: { semester, year },
    select: {
      id: true,
      course_id: true,
      course: { select: { credits: true } },
    }, // ดึง credits ของ course
  });

  // 2. ดึงนักเรียนทั้งหมดที่มีคะแนนในเทอมนี้ และอยู่ใน program ที่กำหนด
  const students = await tx.studentScore.findMany({
    where: {
      assignment: { semester: { semester, year } },
      student: { program_id: programId }, // กรอง programId ตั้งแต่ query
    },
    distinct: ["student_id"],
    select: { student_id: true },
  });

  const results = [];

  for (const s of students) {
    const ploAggregate: Record<string, number[]> = {};

    // 3. รวมผลลัพธ์จากทุก courseSemester
    for (const cs of courseSemesters) {
      const ploResult = await getPloScorePerStudentPerCourse(
        tx,
        s.student_id,
        cs.id,
        cs.course_id,
      );

      const credits = Number(cs.course.credits);

      for (const { ploCode, ploScore } of ploResult.ploScores) {
        if (!ploAggregate[ploCode]) ploAggregate[ploCode] = [];
        ploAggregate[ploCode].push(Number(ploScore) * credits); // คูณคะแนน PLO ด้วย credits ของ course
      }
    }

    // 4. รวมค่า (เช่น average)
    if (Object.keys(ploAggregate).length > 0) {
      const finalScores = Object.entries(ploAggregate).map(
        ([ploCode, scores]) => ({
          ploCode,
          ploScore: scores.reduce((a, b) => a + b, 0),
        }),
      );

      results.push({
        student_id: s.student_id,
        programId,
        ploScores: finalScores,
      });
    }
  }

  results.sort((a, b) => a.student_id - b.student_id);
  return results;
}

/////////////////////////////////////////////////////////////////////////
// getPloScoreAllStudentPerSemester แบบที่แปลงคะแนนเป็น percentage เทียบกับ highestPossible ของแต่ละ PLO ในเทอมนี้
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerSemesterPercentage(
  tx: any,
  programId: number,
  year: number,
  semester: number,
) {
  // 1. ดึงข้อมูลคะแนนดิบรายบุคคล (ที่คูณ credits มาแล้ว)
  const studentResults = await getPloScoreAllStudentPerSemester(
    tx,
    programId,
    year,
    semester,
  );

  // 2. คำนวณหา Highest Possible ของแต่ละ PLO สำหรับ Semester นี้
  // (ต้องใช้ Logic เดียวกับที่ใช้ใน Summary เพื่อให้ฐานเปอร์เซ็นต์ตรงกัน)
  const courseSemesters = await tx.courseSemester.findMany({
    where: { year, semester },
    select: {
      id: true,
      course_id: true,
      course: { select: { credits: true } },
    },
  });

  const semesterPloHighest: Record<string, number> = {};

  for (const cs of courseSemesters) {
    const { cloStats } = await getCloStatsPerCourse(tx, cs.id);
    const mappings = await tx.cloPloMapping.findMany({
      where: {
        clo: { course_id: cs.course_id },
        plo: { program_id: programId },
      },
      select: {
        clo: { select: { code: true } },
        plo: { select: { code: true } },
        weight: true,
      },
    });

    const credits = Number(cs.course.credits);

    mappings.forEach((map: any) => {
      const cloHighest =
        cloStats.find((c: any) => c.cloCode === map.clo.code)
          ?.highestPossible ?? 0;
      const contribution = cloHighest * (Number(map.weight) / 100) * credits;
      const ploCode = map.plo.code;
      semesterPloHighest[ploCode] =
        (semesterPloHighest[ploCode] ?? 0) + contribution;
    });
  }

  // 3. แปลงคะแนนของนักเรียนทุกคนให้เป็น Percentage
  const results = studentResults.map((student) => {
    const percentageScores = student.ploScores.map((item) => {
      const highest = semesterPloHighest[item.ploCode] || 0;
      const denominator = highest > 0 ? highest : 1;

      return {
        ploCode: item.ploCode,
        ploScore: Number(((item.ploScore / denominator) * 100).toFixed(4)),
        highestPossible: 100, // แสดงเป็น 100%
      };
    });

    return {
      student_id: student.student_id,
      programId: student.programId,
      ploScores: percentageScores,
    };
  });

  return results;
}

//////////////////////////////////////////////////////////////////////////////////
/**
 * คำนวณ PLO ของนักเรียนแต่ละคนใน 1 ปีการศึกษา (รวมทุก Semester ในปีนั้น)
 * @param tx - Prisma Transaction Client
 * @param programId - ID ของหลักสูตร
 * @param year - ปีการศึกษา (เช่น 2024)
 */
////////////////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerYear(
  tx: any,
  programId: number,
  year: number,
) {
  // 1. ดึงข้อมูล Semester ทั้งหมดที่มีในปีการศึกษานี้ (เช่น เทอม 1, 2, 3)
  const semestersInYear = await tx.courseSemester.findMany({
    where: { year },
    distinct: ["semester"],
    select: { semester: true },
  });

  if (semestersInYear.length === 0) return [];

  // 2. ดึงข้อมูลคะแนนของนักเรียนทุกคนในแต่ละ Semester มาเก็บไว้
  // โครงสร้าง: allSemesterResults = [[student1_sem1, student2_sem1], [student1_sem2, ...]]
  const allSemesterResults = await Promise.all(
    semestersInYear.map((s: any) =>
      getPloScoreAllStudentPerSemester(tx, programId, year, s.semester),
    ),
  );

  // 3. ยุบรวมข้อมูล (Flatten) และจัดกลุ่มตาม student_id
  const studentYearlyMap: Record<number, Record<string, number[]>> = {};

  allSemesterResults.flat().forEach((studentResult) => {
    const sId = studentResult.student_id;
    if (!studentYearlyMap[sId]) {
      studentYearlyMap[sId] = {};
    }

    studentResult.ploScores.forEach((plo: any) => {
      if (!studentYearlyMap[sId][plo.ploCode]) {
        studentYearlyMap[sId][plo.ploCode] = [];
      }
      // เก็บคะแนนที่คูณ Credits มาแล้ว (จากผลลัพธ์ของ getPloScoreAllStudentPerSemester)
      studentYearlyMap[sId][plo.ploCode].push(plo.ploScore);
    });
  });

  // 4. คำนวณผลรวมคะแนน PLO ตลอดทั้งปีของนักเรียนแต่ละคน
  const results = Object.entries(studentYearlyMap).map(([studentId, plos]) => {
    const finalPloScores = Object.entries(plos).map(([ploCode, scores]) => ({
      ploCode,
      // รวมคะแนนจากทุกเทอมเข้าด้วยกัน
      ploScore: Number(scores.reduce((a, b) => a + b, 0).toFixed(4)),
    }));

    return {
      student_id: Number(studentId),
      programId,
      year,
      ploScores: finalPloScores,
    };
  });

  // เรียงลำดับตามรหัสนักเรียน
  return results.sort((a, b) => a.student_id - b.student_id);
}

/////////////////////////////////////////////////////////////////////////////////
// getPloScoreAllStudentPerYear แบบที่แปลงคะแนนเป็น percentage เทียบกับ highestPossible ของแต่ละ PLO ในปีการศึกษานั้น
/////////////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerYearPercentage(
  tx: any,
  programId: number,
  year: number,
) {
  // 1. ดึงคะแนนดิบรายปี
  const yearlyRaw = await getPloScoreAllStudentPerYear(tx, programId, year);

  // 2. คำนวณ Highest Possible รวมทั้งปี (ต้องรวมทุกเทอม)
  const semestersInYear = await tx.courseSemester.findMany({
    where: { year },
    select: { semester: true },
    distinct: ["semester"],
  });

  const yearlyPloHighest: Record<string, number> = {};

  // วนลูปหาค่าสูงสุดของแต่ละเทอมแล้วนำมาบวกกัน
  for (const s of semestersInYear) {
    const stats = await getPloStatsPerSemester(tx, programId, year, s.semester);
    const plos = stats.ploSemesterStats[0]?.plos || {};

    Object.entries(plos).forEach(([code, detail]: [string, any]) => {
      yearlyPloHighest[code] =
        (yearlyPloHighest[code] ?? 0) + detail.highestPossible;
    });
  }

  // 3. แปลงเป็น Percentage
  return yearlyRaw.map((student) => ({
    ...student,
    ploScores: student.ploScores.map((p) => {
      const highest = yearlyPloHighest[p.ploCode] || 1;
      return {
        ploCode: p.ploCode,
        ploScore: Number(((p.ploScore / highest) * 100).toFixed(2)),
        highestPossible: 100,
      };
    }),
  }));
}

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 course
/////////////////////////////////////////////////////////////
export async function getPloStatsPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number,
) {
  // 1) ดึงผลลัพธ์ PLO ของนักเรียนทุกคนใน course นี้
  const allStudentResults = await getPloScoreAllStudentPerCourse(
    tx,
    CsemesterId,
    courseId,
  );

  // 2) รวมคะแนน PLO ของนักเรียนทุกคนตาม programId + ploCode
  const ploScoresByProgram: Record<string, number[]> = {};
  allStudentResults.forEach(({ programId, ploScores }) => {
    ploScores.forEach(({ ploCode, ploScore }) => {
      const key = `${programId}_${ploCode}`;
      if (!ploScoresByProgram[key]) {
        ploScoresByProgram[key] = [];
      }
      ploScoresByProgram[key].push(ploScore);
    });
  });

  // 3) คำนวณ min, max, mean, median
  const ploStats = Object.entries(ploScoresByProgram).map(([key, scores]) => {
    const [programId, ploCode] = key.split("_");
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

    let median = 0;
    if (scores.length > 0) {
      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      median =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
    }

    return {
      programId: Number(programId),
      ploCode,
      min,
      max,
      mean,
      median,
    };
  });

  // 4) ดึง CLO highestPossible จาก function เดิม
  const { cloStats } = await getCloStatsPerCourse(tx, CsemesterId);

  // 5) ดึง CloPloMapping ของ course นี้
  const cloPloMappings = await tx.cloPloMapping.findMany({
    where: {
      clo: { course_id: Number(courseId) },
    },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true, program_id: true } },
      weight: true,
    },
  });

  // สร้าง type สำหรับ CloPloMapping ที่ query ออกมา
  type CloPloMappingResult = {
    clo: { code: string };
    plo: { code: string; program_id: number };
    weight: number | null;
  };

  // 6) รวม CLO highestPossible → PLO highestPossible แยกตาม programId
  const highestPloMap: Record<string, number> = {};
  cloPloMappings.forEach((mapping: CloPloMappingResult) => {
    const cloCode = mapping.clo.code;
    const ploCode = mapping.plo.code;
    const programId = mapping.plo.program_id;
    const cloHighest =
      cloStats.find((c) => c.cloCode === cloCode)?.highestPossible ?? 0;

    const contribution = cloHighest * (Number(mapping.weight) / 100);
    const key = `${programId}_${ploCode}`;
    highestPloMap[key] = (highestPloMap[key] ?? 0) + contribution;
  });

  // 7) merge highestPossible เข้าไปใน stats
  const ploStatsWithHighest = ploStats.map((stat) => ({
    programId: stat.programId,
    ploCode: stat.ploCode,
    min: Number(stat.min.toFixed(2)),
    max: Number(stat.max.toFixed(2)),
    mean: Number(stat.mean.toFixed(2)),
    median: Number(stat.median.toFixed(2)),
    highestPossible: Number(
      (highestPloMap[`${stat.programId}_${stat.ploCode}`] ?? 0).toFixed(4),
    ),
  }));

  // 8) จัดกลุ่มตาม programId → ploCode
  const groupedByProgram: Record<number, any> = {};
  ploStatsWithHighest.forEach((stat) => {
    if (!groupedByProgram[stat.programId]) {
      groupedByProgram[stat.programId] = {
        programId: stat.programId,
        plos: {},
      };
    }
    groupedByProgram[stat.programId].plos[stat.ploCode] = {
      min: stat.min,
      max: stat.max,
      mean: stat.mean,
      median: stat.median,
      highestPossible: stat.highestPossible,
    };
  });

  return { ploStats: Object.values(groupedByProgram) };
}

/////////////////////////////////////////////////////////////////////////
// แปลง getPloStatsPercentagePerCourse ให้เป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
/////////////////////////////////////////////////////////////////////////

export async function getPloStatsPercentagePerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number,
) {
  const { ploStats } = await getPloStatsPerCourse(tx, CsemesterId, courseId);

  // กำหนด type ของ stat ที่อยู่ใน plos
  type PloStat = {
    min: number;
    max: number;
    mean: number;
    median: number;
    highestPossible: number;
  };

  // ploStats เป็น array ของ { programId, plos: { [ploCode]: {...} } }
  const ploStatsPercentage = ploStats.map((programStat) => {
    const plosPercentage: Record<string, any> = {};

    Object.entries(programStat.plos).forEach(([ploCode, stat]) => {
      const s = stat as PloStat; // ✅ cast type ให้ชัดเจน
      const highest = s.highestPossible || 1; // กัน division by zero
      const toPercent = (value: number) => (value / highest) * 100;

      plosPercentage[ploCode] = {
        min: Number(toPercent(s.min).toFixed(4)),
        max: Number(toPercent(s.max).toFixed(4)),
        mean: Number(toPercent(s.mean).toFixed(4)),
        median: Number(toPercent(s.median).toFixed(4)),
        highestPossible: 100, // กำหนดให้เป็น 100% เสมอ
      };
    });

    return {
      programId: programStat.programId,
      plos: plosPercentage,
    };
  });

  return { ploStatsPercentage };
}

///////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 semester (รวมทุก course ที่เรียน)
///////////////////////////////////////////////////////////////
export async function getPloStatsPerSemester(
  tx: any,
  programId: number,
  year: number,
  semester: number,
) {
  // 1. ดึงคะแนนนักเรียนทุกคน (ที่คำนวณรายวิชาและคูณ credits มาแล้ว)
  const studentResults = await getPloScoreAllStudentPerSemester(
    tx,
    programId,
    year,
    semester,
  );

  // 2. ดึงข้อมูล Course ในเทอมนี้เพื่อหา highestPossible
  const courseSemesters = await tx.courseSemester.findMany({
    where: { year, semester },
    select: {
      id: true,
      course_id: true,
      course: { select: { credits: true } },
    },
  });

  // --- ส่วนการคำนวณ highestPossible (รวมทุกวิชาในเทอม) ---
  const highestPloMap: Record<string, number> = {};

  for (const cs of courseSemesters) {
    const { cloStats } = await getCloStatsPerCourse(tx, cs.id);
    const mappings = await tx.cloPloMapping.findMany({
      where: {
        clo: { course_id: cs.course_id },
        plo: { program_id: programId },
      },
      select: {
        clo: { select: { code: true } },
        plo: { select: { code: true } },
        weight: true,
      },
    });

    const credits = Number(cs.course.credits);

    mappings.forEach((map: any) => {
      const cloHighest =
        cloStats.find((c: any) => c.cloCode === map.clo.code)
          ?.highestPossible ?? 0;
      // สูตร: (CLO Potential * Weight%) * Credits
      const contribution = cloHighest * (Number(map.weight) / 100) * credits;
      const ploCode = map.plo.code;
      highestPloMap[ploCode] = (highestPloMap[ploCode] ?? 0) + contribution;
    });
  }

  // --- ส่วนการจัดกลุ่มคะแนนนักเรียนเพื่อหาค่าสถิติ ---
  const ploGroups: Record<string, number[]> = {};
  studentResults.forEach((s) => {
    s.ploScores.forEach((p) => {
      if (!ploGroups[p.ploCode]) ploGroups[p.ploCode] = [];
      ploGroups[p.ploCode].push(p.ploScore);
    });
  });

  // --- ส่วนการสร้าง Result Object ตาม Format ที่ต้องการ ---
  const plosObj: Record<string, any> = {};

  // วนลูปตาม ploCode ที่พบในกลุ่มคะแนน (เพื่อให้ข้อมูลสถิติกับคะแนนเต็มตรงกัน)
  Object.entries(ploGroups).forEach(([ploCode, scores]) => {
    const sorted = [...scores].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    // คำนวณ Median
    const mid = Math.floor(count / 2);
    const median =
      count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    // ใส่ข้อมูลลงใน Object โดยใช้ ploCode เป็น Key
    plosObj[ploCode] = {
      min: Number(sorted[0].toFixed(4)),
      max: Number(sorted[count - 1].toFixed(4)),
      mean: Number((sum / count).toFixed(4)),
      median: Number(median.toFixed(4)),
      highestPossible: Number((highestPloMap[ploCode] ?? 0).toFixed(4)),
    };
  });

  // ส่งค่ากลับตามโครงสร้างที่ระบุ
  return {
    ploSemesterStats: [
      {
        programId,
        plos: plosObj,
      },
    ],
  };
}

///////////////////////////////////////////////////////////////
// getPloStatsPerSemester แบบแปลงเป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
///////////////////////////////////////////////////////////////
// 1. กำหนด Interface เพื่อบอกโครงสร้างข้อมูล
interface PloStatDetail {
  min: number;
  max: number;
  mean: number;
  median: number;
  highestPossible: number;
}

interface ProgramPloSummary {
  programId: number;
  plos: Record<string, PloStatDetail>;
}

/**
 * ฟังก์ชันเวอร์ชันแก้ Error TypeScript
 */
export async function getPloStatsPerSemesterPercentage(
  tx: any,
  programId: number,
  year: number,
  semester: number,
) {
  // ระบุ type ให้กับ rawData ที่ได้จากฟังก์ชันก่อนหน้า
  const rawData = (await getPloStatsPerSemester(
    tx,
    programId,
    year,
    semester,
  )) as {
    ploSemesterStats: ProgramPloSummary[];
  };

  if (!rawData.ploSemesterStats || rawData.ploSemesterStats.length === 0) {
    return { ploSemesterStatsPercentage: [] };
  }

  // ระบุ Type ให้ programStat ตรงนี้
  const result = rawData.ploSemesterStats.map(
    (programStat: ProgramPloSummary) => {
      const percentagePlos: Record<string, PloStatDetail> = {};

      Object.entries(programStat.plos).forEach(([ploCode, stats]) => {
        const { min, max, mean, median, highestPossible } = stats;
        const denominator = highestPossible > 0 ? highestPossible : 1;

        percentagePlos[ploCode] = {
          min: Number(((min / denominator) * 100).toFixed(4)),
          max: Number(((max / denominator) * 100).toFixed(4)),
          mean: Number(((mean / denominator) * 100).toFixed(4)),
          median: Number(((median / denominator) * 100).toFixed(4)),
          highestPossible: 100,
        };
      });

      return {
        programId: programStat.programId,
        plos: percentagePlos,
      };
    },
  );

  return {
    ploSemesterStatsPercentage: result,
  };
}

/////////////////////////////////////////////////////////////////////////////////////
/**
 * คำนวณสรุปสถิติ PLO ประจำปีการศึกษา (Min, Max, Mean, Median, HighestPossible)
 * โดยรวมผลลัพธ์จากทุก Semester ในปีนั้น
 */
/////////////////////////////////////////////////////////////////////////////////////
export async function getPloStatsPerYear(
  tx: any,
  programId: number,
  year: number,
) {
  // 1. ดึงคะแนนรายบุคคลแบบสะสมทั้งปี (Sum of ploScore * credits จากทุกเทอม)
  const studentYearlyResults = await getPloScoreAllStudentPerYear(
    tx,
    programId,
    year,
  );

  if (!studentYearlyResults || studentYearlyResults.length === 0) {
    return { ploYearlyStats: [] };
  }

  // 2. คำนวณหา Highest Possible รวมของทั้งปี (เทอม 1 + เทอม 2 + ...)
  const semestersInYear = await tx.courseSemester.findMany({
    where: { year },
    select: { semester: true },
    distinct: ["semester"],
  });

  const yearlyPloHighest: Record<string, number> = {};

  for (const s of semestersInYear) {
    // ดึงค่าสูงสุดของแต่ละเทอมจาก function ที่เราทำไว้ก่อนหน้า
    const stats = await getPloStatsPerSemester(tx, programId, year, s.semester);
    const plos = stats.ploSemesterStats[0]?.plos || {};

    Object.entries(plos).forEach(([code, detail]: [string, any]) => {
      yearlyPloHighest[code] =
        (yearlyPloHighest[code] ?? 0) + detail.highestPossible;
    });
  }

  // 3. จัดกลุ่มคะแนนนักเรียนรายปีตาม ploCode เพื่อหาค่าสถิติ
  const ploGroups: Record<string, number[]> = {};
  studentYearlyResults.forEach((student) => {
    student.ploScores.forEach((p) => {
      if (!ploGroups[p.ploCode]) ploGroups[p.ploCode] = [];
      ploGroups[p.ploCode].push(p.ploScore);
    });
  });

  // 4. คำนวณค่าสถิติและจัด Format ผลลัพธ์
  const plosObj: Record<string, any> = {};

  Object.entries(ploGroups).forEach(([ploCode, scores]) => {
    const sorted = [...scores].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    // Median Logic
    const mid = Math.floor(count / 2);
    const median =
      count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    plosObj[ploCode] = {
      min: Number(sorted[0].toFixed(4)),
      max: Number(sorted[count - 1].toFixed(4)),
      mean: Number((sum / count).toFixed(4)),
      median: Number(median.toFixed(4)),
      highestPossible: Number((yearlyPloHighest[ploCode] ?? 0).toFixed(4)),
    };
  });

  return {
    ploYearlyStats: [
      {
        programId,
        year,
        plos: plosObj,
      },
    ],
  };
}

/////////////////////////////////////////////////////////////////////////////////////
/**
 * แปลงค่าสถิติ PLO รายปี (Yearly) ให้เป็นรูปแบบเปอร์เซ็นต์ (0-100%)
 * โดยคำนวณจากผลลัพธ์ของ getPloYearlySummaryFormatted
 */
/////////////////////////////////////////////////////////////////////////////////////
export async function getPloStatsPerYearPercentage(
  tx: any,
  programId: number,
  year: number,
) {
  // 1. เรียกใช้ function สรุปสถิติรายปีแบบ Raw Score
  const rawData = await getPloStatsPerYear(tx, programId, year);

  if (!rawData.ploYearlyStats || rawData.ploYearlyStats.length === 0) {
    return { ploYearlyStatsPercentage: [] };
  }

  // 2. แปลงค่าในแต่ละ Program และแต่ละ PLO ให้เป็นเปอร์เซ็นต์
  const result = rawData.ploYearlyStats.map((yearStat: any) => {
    const percentagePlos: Record<string, any> = {};

    Object.entries(yearStat.plos).forEach(([ploCode, stats]: [string, any]) => {
      const { min, max, mean, median, highestPossible } = stats;

      // ป้องกัน Division by zero
      const denominator = highestPossible > 0 ? highestPossible : 1;

      percentagePlos[ploCode] = {
        min: Number(((min / denominator) * 100).toFixed(4)),
        max: Number(((max / denominator) * 100).toFixed(4)),
        mean: Number(((mean / denominator) * 100).toFixed(4)),
        median: Number(((median / denominator) * 100).toFixed(4)),
        highestPossible: 100, // ฐานเปอร์เซ็นต์คือ 100
      };
    });

    return {
      programId: yearStat.programId,
      year: yearStat.year,
      plos: percentagePlos,
    };
  });

  // 3. ส่งกลับใน format ที่ระบุ (ploYearlyStatsPercentage)
  return {
    ploYearlyStatsPercentage: result,
  };
}

/////////////////////////////////////////////////////////////////////////////////////
/**
 * ดึงผลการเรียน PLO สะสมทั้งหมดของนักเรียนรายบุคคล (Cumulative PLO Transcript)
 * @param tx - Prisma Transaction Client
 * @param studentId - ID ของนักเรียน
 */
/////////////////////////////////////////////////////////////////////////////////////
// 1. สร้าง Interface สำหรับข้อมูล Semester จาก Prisma
interface SemesterInfo {
  year: number;
  semester: number;
}

// 2. สร้าง Interface สำหรับผลลัพธ์จากฟังก์ชันอื่น (ถ้ามี)
interface PloScore {
  ploCode: string;
  ploScore: number;
}

export async function getStudentPloCumulative(tx: any, studentId: number) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true },
  });

  if (!student) throw new Error("Student not found");

  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: {
      assignment: {
        select: { semester: { select: { year: true, semester: true } } },
      },
    },
  });

  const uniqueSemesters = Array.from(
    new Map<string, SemesterInfo>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`,
        s.assignment.semester as SemesterInfo,
      ]),
    ).values(),
  );

  const ploResults = [];
  const cumulativeHighestMap: Record<string, number> = {}; // เก็บค่าเต็มสะสม
  const cumulativeScoreMap: Record<string, number> = {}; // เก็บค่าคะแนนสะสม

  for (const sem of uniqueSemesters) {
    const { year, semester } = sem;

    // ดึงข้อมูลสรุปของเทอมนั้นเพื่อเอา highestPossible
    const statsData = await getPloStatsPerSemester(
      tx,
      student.program_id,
      year,
      semester,
    );
    const semesterPlos = statsData.ploSemesterStats[0]?.plos || {};

    // ดึงคะแนนรายบุคคล
    const semesterData = await getPloScoreAllStudentPerSemester(
      tx,
      student.program_id,
      year,
      semester,
    );
    const studentRecord = semesterData.find(
      (s: any) => s.student_id === studentId,
    );

    // บันทึกค่าสะสม
    Object.entries(semesterPlos).forEach(([ploCode, detail]: [string, any]) => {
      cumulativeHighestMap[ploCode] =
        (cumulativeHighestMap[ploCode] ?? 0) + detail.highestPossible;
    });

    if (studentRecord) {
      studentRecord.ploScores.forEach((p: any) => {
        cumulativeScoreMap[p.ploCode] =
          (cumulativeScoreMap[p.ploCode] ?? 0) + p.ploScore;
      });

      ploResults.push({
        year,
        semester,
        plos: studentRecord.ploScores,
      });
    }
  }

  return {
    studentId,
    programId: student.program_id,
    cumulativePloScores: Object.keys(cumulativeHighestMap).map((ploCode) => ({
      ploCode,
      ploScore: Number((cumulativeScoreMap[ploCode] ?? 0).toFixed(2)),
      highestPossible: Number((cumulativeHighestMap[ploCode] ?? 0).toFixed(2)),
    })),

    semesterHistory: ploResults.sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.semester - b.semester,
    ),
  };
}

/////////////////////////////////////////////////////////////////////////////////////
/**
 * Cumulative PLO Transcript แบบละเอียด
 */
/////////////////////////////////////////////////////////////////////////////////////
export async function getStudentPloDetailedCumulative(
  tx: any,
  studentId: number,
) {
  // 1. เตรียมข้อมูลพื้นฐาน (เพิ่มการดึงชื่อและรหัสนักศึกษา)
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: {
      program_id: true,
      student_code: true, // หรือชื่อฟิลด์ตาม Schema ของคุณ
      first_name: true, // หรือชื่อฟิลด์ตาม Schema ของคุณ
      last_name: true, // หรือชื่อฟิลด์ตาม Schema ของคุณ
    },
  });

  if (!student) throw new Error("Student not found");

  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: {
      assignment: {
        select: {
          semester: { select: { year: true, semester: true } },
        },
      },
    },
  });

  // สร้างรายการเทอมที่ไม่ซ้ำกัน
  const uniqueSemesters = Array.from(
    new Map<string, any>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`,
        s.assignment.semester,
      ]),
    ).values(),
  ).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.semester - b.semester,
  );

  const tempPloData: Record<
    string,
    {
      totalHighest: number;
      totalRaw: number;
      terms: {
        year: number;
        semester: number;
        rawScore: number;
        termHighest: number;
      }[];
    }
  > = {};

  // 2. ดึงข้อมูลแบบ Parallel เพื่อป้องกัน Timeout
  const allSemestersResults = await Promise.all(
    uniqueSemesters.map(async (sem) => {
      const [statsData, semesterData] = await Promise.all([
        getPloStatsPerSemester(tx, student.program_id, sem.year, sem.semester),
        getPloScoreAllStudentPerSemester(
          tx,
          student.program_id,
          sem.year,
          sem.semester,
        ),
      ]);
      return {
        year: sem.year,
        semester: sem.semester,
        statsData,
        semesterData,
      };
    }),
  );

  // 3. สะสมข้อมูล
  for (const res of allSemestersResults) {
    const { year, semester, statsData, semesterData } = res;
    const semesterPlos = statsData.ploSemesterStats[0]?.plos || {};
    const studentRecord = semesterData.find(
      (s: any) => s.student_id === studentId,
    );

    Object.entries(semesterPlos).forEach(([ploCode, detail]: [string, any]) => {
      if (!tempPloData[ploCode]) {
        tempPloData[ploCode] = { totalHighest: 0, totalRaw: 0, terms: [] };
      }
      const rawScore =
        studentRecord?.ploScores.find((p: any) => p.ploCode === ploCode)
          ?.ploScore || 0;
      const termHighest = detail.highestPossible || 0;

      tempPloData[ploCode].totalHighest += termHighest;
      tempPloData[ploCode].totalRaw += rawScore;
      tempPloData[ploCode].terms.push({
        year,
        semester,
        rawScore,
        termHighest,
      });
    });
  }

  const totalHighestAll = Object.values(tempPloData).reduce(
    (sum, data) => sum + data.totalHighest,
    0,
  );
  const grandTotal = totalHighestAll || 1;

  // 4. จัด Format และคำนวณ Cumulative
  const ploResults = Object.entries(tempPloData).map(([ploCode, data]) => {
    const totalHighestPercentage = Number(
      ((data.totalHighest / grandTotal) * 100).toFixed(2),
    );
    const ploAchievementPercentage = Number(
      ((data.totalRaw / grandTotal) * 100).toFixed(2),
    );

    let runningRawScore = 0;
    let runningHighestPossible = 0;

    const breakdown = data.terms.map((t) => {
      runningRawScore += t.rawScore;
      runningHighestPossible += t.termHighest;
      return {
        year: t.year,
        semester: t.semester,
        termHighestPossible: Number(runningHighestPossible.toFixed(2)),
        termHighestPossiblePercentage: Number(
          ((runningHighestPossible / grandTotal) * 100).toFixed(2),
        ),
        rawScore: Number(runningRawScore.toFixed(2)),
        contributionPercentage: Number(
          ((runningRawScore / grandTotal) * 100).toFixed(2),
        ),
      };
    });

    return {
      ploCode,
      totalHighest: Number(data.totalHighest.toFixed(2)),
      totalHighestPercentage,
      ploAchievementRaw: Number(data.totalRaw.toFixed(2)),
      ploAchievementPercentage,
      breakdown,
    };
  });

  // 5. ส่งค่ากลับพร้อมข้อมูลนักศึกษา
  return {
    studentId,
    studentCode: student.student_code,
    studentName: `${student.first_name} ${student.last_name}`,
    totalHighestAll: Number(totalHighestAll.toFixed(2)),
    ploDetailedStats: ploResults,
  };
}

export async function getStudentPloAchievementSummary(
  tx: any,
  studentId: number,
) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true },
  });
  if (!student) throw new Error("Student not found");

  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: {
      assignment: {
        select: { semester: { select: { year: true, semester: true } } },
      },
    },
  });

  const uniqueSemesters = Array.from(
    new Map<string, SemesterInfo>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`,
        s.assignment.semester as SemesterInfo,
      ]),
    ).values(),
  );

  const ploSummary: Record<string, { totalRaw: number; totalHighest: number }> = {};

  for (const sem of uniqueSemesters) {
    const { year, semester } = sem;
    const statsData = await getPloStatsPerSemester(
      tx,
      student.program_id,
      year,
      semester,
    );
    const semesterPlos = statsData.ploSemesterStats[0]?.plos || {};
    const semesterData = await getPloScoreAllStudentPerSemester(
      tx,
      student.program_id,
      year,
      semester,
    );
    const studentRecord = semesterData.find(
      (s: any) => s.student_id === studentId,
    );

    Object.entries(semesterPlos).forEach(([ploCode, detail]: [string, any]) => {
      if (!ploSummary[ploCode]) {
        ploSummary[ploCode] = { totalRaw: 0, totalHighest: 0 };
      }
      const rawScore = studentRecord?.ploScores.find((p: any) => p.ploCode === ploCode)?.ploScore || 0;
      const termHighest = detail.highestPossible || 0;

      ploSummary[ploCode].totalRaw += rawScore;
      ploSummary[ploCode].totalHighest += termHighest;
    });
  }

  // --- จุดสำคัญ: คำนวณหาคะแนนเต็มรวมของทุก PLO ก่อน ---
  const totalHighestAll = Object.values(ploSummary).reduce((sum, data) => sum + data.totalHighest, 0);
  const grandTotal = totalHighestAll || 1;

  const result = Object.entries(ploSummary).map(([ploCode, data]) => {
    return {
      ploCode,
      ploAchievementRaw: Number(data.totalRaw.toFixed(2)),
      // เปอร์เซ็นต์ความสำเร็จเทียบกับ Grand Total (วิธีเดียวกับ Detailed Transcript)
      ploAchievementPercentage: Number(((data.totalRaw / grandTotal) * 100).toFixed(2))
    };
  });

  return {
    studentId,
    ploDetailedStats: result,
  };
}

/**
 * คำนวณค่าสถิติ (Min, Max, Mean, Median) ของแต่ละ PLO ทั้งแบบ Raw และ Percentage
 * โดยใช้ข้อมูลจากนักเรียนทุกคนใน programId ที่กำหนด
 */
export async function getProgramPloDetailedStatistics(
  tx: any,
  programId: number,
) {
  // 1. ดึงรายชื่อนักเรียนทุกคนใน Program นี้
  const students = await tx.student.findMany({
    where: { program_id: programId },
    select: { id: true },
  });

  if (students.length === 0) {
    return { programId, ploProgramStats: [], message: "No students found" };
  }

  // 2. เตรียมโครงสร้างเก็บกลุ่มข้อมูลคะแนน
  // { "PLO1": { raws: [120, 150...], percentages: [30, 37.5...] } }
  const ploDataGroup: Record<
    string,
    { raws: number[]; percentages: number[] }
  > = {};

  // แทนที่ loop เดิมด้วยวิธีนี้
  const studentIds = students.map((s: { id: number }) => s.id);

  // รัน summary ของทุกคนพร้อมกัน
  const summaries = await Promise.all(
    studentIds.map((id: number) => getStudentPloAchievementSummary(tx, id)),
  );

  // นำผลลัพธ์ที่ได้มารวมร่าง (Aggregate)
  summaries.forEach((summary) => {
    summary.ploDetailedStats.forEach((stat: any) => {
      if (!ploDataGroup[stat.ploCode]) {
        ploDataGroup[stat.ploCode] = { raws: [], percentages: [] };
      }
      ploDataGroup[stat.ploCode].raws.push(stat.ploAchievementRaw);
      ploDataGroup[stat.ploCode].percentages.push(
        stat.ploAchievementPercentage,
      );
    });
  });

  // 4. Helper Function สำหรับคำนวณสถิติ
  const calculateStats = (values: number[]) => {
    if (values.length === 0)
      return { lowest: 0, highest: 0, mean: 0, median: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    // คำนวณ Median
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      lowest: Number(Math.min(...values).toFixed(2)),
      highest: Number(Math.max(...values).toFixed(2)),
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
    };
  };

  // 5. สรุปผลลัพธ์แยกตาม PLO
  const ploProgramStats = Object.entries(ploDataGroup).map(
    ([ploCode, data]) => {
      return {
        ploCode,
        studentCount: data.raws.length,
        rawStats: calculateStats(data.raws),
        percentageStats: calculateStats(data.percentages),
      };
    },
  );

  return {
    programId,
    ploProgramStats,
  };
}
