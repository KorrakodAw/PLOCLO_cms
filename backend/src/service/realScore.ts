
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// realScore
//--------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของ student 1 คน ใน 1 course แยกตาม category
/////////////////////////////////////////////////////////////////////////
export async function getRealScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentScores = await tx.studentScore.findMany({
      where: {
        student_id: Number(studentId),
        assignment: {
          semester: {
            id: Number(CsemesterId),
          },
        },
      },
      select: {
        student_id: true,
        score: true,
        assignment_id: true,
        assignment: {
          select: {
            maxScore: true,
            weight: true,
            category: true,
          },
        },
      },
    });

    // 2. Group by category
    const categoryGroups: Record<string, number[]> = {};

    studentScores.forEach((row) => {
      const category = row.assignment.category;
      const realScore =
        Number(row.score) /
        (Number(row.assignment.maxScore) / Number(row.assignment.weight));

      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(realScore);
    });

    // 3. Sum realScore per category
    const categoryScores = Object.entries(categoryGroups).map(
      ([category, scores]) => {
        const total = scores.reduce((sum, s) => sum + s, 0);
        return { category, realScore: total };
      },
    );

    return { categoryScores };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของนักเรียนทุกคนใน course แยกตาม category
/////////////////////////////////////////////////////////////////////////
export async function getRealScoreAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentScores = await tx.studentScore.findMany({
      where: {
        assignment: {
          semester: {
            id: Number(CsemesterId),
          },
        },
      },
      select: {
        student_id: true,
        score: true,
        assignment_id: true,
        assignment: {
          select: {
            maxScore: true,
            weight: true,
            category: true,
          },
        },
      },
    });

    // 2. Group by student_id -> category
    const studentGroups: Record<string, Record<string, number[]>> = {};

    studentScores.forEach((row) => {
      const studentId = row.student_id;
      const category = row.assignment.category;
      const realScore =
        Number(row.score) /
        (Number(row.assignment.maxScore) / Number(row.assignment.weight));

      if (!studentGroups[studentId]) studentGroups[studentId] = {};
      if (!studentGroups[studentId][category])
        studentGroups[studentId][category] = [];

      studentGroups[studentId][category].push(realScore);
    });

    // 3. Sum realScore per student per category
    const results: {
      student_id: number;
      categoryScores: { category: string; realScore: number }[];
    }[] = [];

    Object.entries(studentGroups).forEach(([student_id, categories]) => {
      const categoryScores = Object.entries(categories).map(
        ([category, scores]) => {
          const total = scores.reduce((sum, s) => sum + s, 0);
          return { category, realScore: total };
        },
      );

      results.push({
        student_id: Number(student_id),
        categoryScores,
      });
    });

    return { realScoresPerStudent: results };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของนักเรียนแต่ละคนออกมาเป็น percentage เทียบกับ highestPossible ต่อ category
/////////////////////////////////////////////////////////////////////////
export async function getRealScorePercentageAllStudentPerCourse(
  tx: any,
  CsemesterId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึง realScore ของนักเรียนแต่ละคน
    const perStudent = await getRealScoreAllStudentPerCourse(tx, CsemesterId);
    const realScoresPerStudent = perStudent.realScoresPerStudent;

    // 2) ดึง highestPossible ต่อ category
    const assignments = await tx.assignment.findMany({
      where: { semester: { id: Number(CsemesterId) } },
      select: {
        weight: true,
        category: true,
      },
    });

    const highestCategoryMap: Record<string, number> = {};
    assignments.forEach((assignment) => {
      const category = assignment.category;
      const contribution = Number(assignment.weight);
      if (!highestCategoryMap[category]) highestCategoryMap[category] = 0;
      highestCategoryMap[category] += contribution;
    });

    // 3) คำนวณ realScore เป็น percentage ต่อ student ต่อ category
    const results: {
      student_id: number;
      categoryPercentages: { category: string; percentage: number }[];
    }[] = [];

    realScoresPerStudent.forEach((student) => {
      const categoryPercentages: { category: string; percentage: number }[] = [];

      student.categoryScores.forEach((cat) => {
        const highest = highestCategoryMap[cat.category] ?? 0;
        const percentage =
          highest > 0 ? (cat.realScore / highest) * 100 : 0;

        categoryPercentages.push({
          category: cat.category,
          percentage,
        });
      });

      results.push({
        student_id: student.student_id,
        categoryPercentages,
      });
    });

    return { realScorePercentagePerStudent: results };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore รวม และเกรดของนักเรียนใน course
/////////////////////////////////////////////////////////////////////////
export async function getTotalScoreAndGradePerStudentPerCourse(
  tx: any,
  studentId: number,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. ใช้ function เดิมเพื่อดึงคะแนนแยกตาม category
    const { categoryScores } = await getRealScorePerStudentPerCourse(
      tx,
      studentId,
      CsemesterId,
    );

    // 2. รวมคะแนนทุก category
    const totalScore = categoryScores.reduce((sum, c) => sum + c.realScore, 0);

    // 3. ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { semester_id: Number(CsemesterId) },
      orderBy: { score: "desc" }, // เรียงจากคะแนนสูงไปต่ำ
    });

    // 4. หา grade ที่ตรงกับคะแนนรวม
    let grade = "F"; // default ถ้าไม่เข้าเงื่อนไข
    for (const gs of gradeSettings) {
      if (totalScore >= Number(gs.score)) {
        grade = gs.grade;
        break; // เจอเกรดที่เหมาะสมแล้ว
      }
    }

    return { totalScore, grade, categoryScores }; // เก็บรายละเอียด category ด้วย
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore รวม ,เกรดของนักเรียนทุกคนใน course และ mean ของทั้ง course
/////////////////////////////////////////////////////////////////////////
export async function getTotalScoreAndGradeAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. ใช้ function เดิมเพื่อดึงคะแนนแยกตาม category ของนักเรียนทุกคน
    const { realScoresPerStudent } = await getRealScoreAllStudentPerCourse(
      tx,
      CsemesterId,
    );

    // 2. ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { semester_id: Number(CsemesterId) },
      orderBy: { score: "desc" }, // เรียงจากคะแนนสูงไปต่ำ
    });

    // 3. รวมคะแนน และหาเกรดของนักเรียนแต่ละคน
    const results = realScoresPerStudent.map((student) => {
      const totalScore = student.categoryScores.reduce(
        (sum, c) => sum + c.realScore,
        0,
      );

      let grade = "F"; // default ถ้าไม่เข้าเงื่อนไข
      for (const gs of gradeSettings) {
        if (totalScore >= Number(gs.score)) {
          grade = gs.grade;
          break;
        }
      }

      return {
        student_id: student.student_id,
        totalScore,
        grade,
        categoryScores: student.categoryScores, // เก็บรายละเอียด category ด้วย
      };
    });

    // 4. คำนวณ mean ของคะแนนนักเรียนทั้งหมด
    const meanScore =
      results.reduce((sum, s) => sum + s.totalScore, 0) / results.length;

    return { studentResults: results, meanScore };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของแต่ละ category ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getRealScoreStatsPerCourse(tx: any, CsemesterId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // -----------------------------
    // 1) คำนวณ min, max, mean จาก student scores (ใช้ getRealScoreAllStudentPerCourse)
    // -----------------------------
    const perStudent = await getRealScoreAllStudentPerCourse(tx, CsemesterId);
    const categoryScoresPerStudent = perStudent.realScoresPerStudent;

    const categoryGroups: Record<string, number[]> = {};

    categoryScoresPerStudent.forEach((student) => {
      student.categoryScores.forEach((cat) => {
        if (!categoryGroups[cat.category]) categoryGroups[cat.category] = [];
        categoryGroups[cat.category].push(cat.realScore);
      });
    });

    const categoryStatsBase = Object.entries(categoryGroups).map(
      ([category, scores]) => {
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;

      // --- คำนวณ median ---
      let median = 0;
      if (scores.length > 0) {
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
          median = (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
          median = sorted[mid];
        }
      }

        return { category, min, max, mean, median };
      }
    );

    // -----------------------------
    // 2) หา highestPossible ต่อ category จาก assignment weight
    // -----------------------------
    const assignments = await tx.assignment.findMany({
      where: { semester: { id: Number(CsemesterId) } },
      select: {
        weight: true,
        category: true,
      },
    });

    const highestCategoryMap: Record<string, number> = {};
    assignments.forEach((assignment) => {
      const category = assignment.category;
      const contribution = Number(assignment.weight);
      if (!highestCategoryMap[category]) highestCategoryMap[category] = 0;
      highestCategoryMap[category] += contribution;
    });

    // -----------------------------
    // 3) merge categoryStatsBase + highestPossible
    // -----------------------------
    const categoryStats = categoryStatsBase.map((stat) => ({
      ...stat,
      highestPossible: highestCategoryMap[stat.category] ?? 0,
    }));

    return { categoryStats };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// แปลง realScoreStats ให้เป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
/////////////////////////////////////////////////////////////////////////

export async function getRealScoreStatsPercentagePerCourse(tx: any, CsemesterId: number) {
  const { categoryStats } = await getRealScoreStatsPerCourse(tx, CsemesterId);

  const categoryStatsPercentage = categoryStats.map((stat) => {
    const highest = stat.highestPossible || 1; // กัน division by zero

    const toPercent = (value: number) => (value / highest) * 100;

    return {
      category: stat.category,
      min: toPercent(stat.min),
      max: toPercent(stat.max),
      mean: toPercent(stat.mean),
      median: toPercent(stat.median),
      highestPossible: 100, // กำหนดให้เป็น 100% เสมอ
    };
  });

  return { categoryStatsPercentage };
}

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน category ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางเหลืองใน TABEE
/////////////////////////////////////////////////////////////////////////
export async function getGradeSummaryPerCourse(tx: any, CsemesterId: number) {
  const { studentResults } = await getTotalScoreAndGradeAllStudentPerCourse(
    tx,
    CsemesterId,
  );

  const gradeSummary: Record<
    string,
    {
      count: number;
      categoryAverages: Record<string, number>;
      totalAverage: number; // ค่าเฉลี่ยรวมทุก category
    }
  > = {};

  // 1. รวมข้อมูลตาม grade
  for (const student of studentResults) {
    const grade = student.grade;

    if (!gradeSummary[grade]) {
      gradeSummary[grade] = {
        count: 0,
        categoryAverages: {},
        totalAverage: 0,
      };
    }

    gradeSummary[grade].count += 1;

    // รวมคะแนน category
    for (const c of student.categoryScores) {
      if (!gradeSummary[grade].categoryAverages[c.category]) {
        gradeSummary[grade].categoryAverages[c.category] = 0;
      }
      gradeSummary[grade].categoryAverages[c.category] += c.realScore;
    }

    // รวมคะแนนรวมของ student เพื่อใช้หาค่าเฉลี่ยรวม
    gradeSummary[grade].totalAverage += student.totalScore;
  }

  // 2. หาค่าเฉลี่ย category และค่าเฉลี่ยรวมต่อ grade
  for (const grade in gradeSummary) {
    const summary = gradeSummary[grade];
    for (const category in summary.categoryAverages) {
      summary.categoryAverages[category] =
        summary.categoryAverages[category] / summary.count;
    }
    summary.totalAverage = summary.totalAverage / summary.count;
  }

  // 5) เรียงผลลัพธ์ตามตัวอักษรของ grade
    const gradeSummarySorted = Object.keys(gradeSummary)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = gradeSummary[key];
        return acc;
      }, {} as typeof gradeSummary);

return gradeSummarySorted;

}

/**
 * สรุปจำนวน student ต่อเกรด โดยแปลง categoryAverages เป็นเปอร์เซ็นต์
 * อ้างอิงคะแนนเต็มจาก highestPossible ของฟังก์ชัน getRealScoreStatsPerCourse
 * และเปลี่ยน totalAverage เป็นผลรวมของเปอร์เซ็นต์เหล่านั้น
 */
export async function getGradeSummaryPerCoursePercentage(tx: any, CsemesterId: number) {
  // 0. เรียกใช้ฟังก์ชันเพื่อหา highestPossible ของแต่ละ category มาทำเป็น Map สำหรับค้นหา
  const statsResult = await getRealScoreStatsPerCourse(tx, CsemesterId);
  const highestCategoryMap: Record<string, number> = {};
  
  statsResult.categoryStats.forEach((stat: any) => {
    highestCategoryMap[stat.category] = stat.highestPossible;
  });

  // 1. รวมข้อมูลตาม grade (โค้ดเดิมเป๊ะ ไม่มีการเปลี่ยนแปลง)
  const { studentResults } = await getTotalScoreAndGradeAllStudentPerCourse(
    tx,
    CsemesterId,
  );

  const gradeSummary: Record<
    string,
    {
      count: number;
      categoryAverages: Record<string, number>;
      totalAverage: number;
    }
  > = {};

  for (const student of studentResults) {
    const grade = student.grade;

    if (!gradeSummary[grade]) {
      gradeSummary[grade] = {
        count: 0,
        categoryAverages: {},
        totalAverage: 0,
      };
    }

    gradeSummary[grade].count += 1;

    for (const c of student.categoryScores) {
      if (!gradeSummary[grade].categoryAverages[c.category]) {
        gradeSummary[grade].categoryAverages[c.category] = 0;
      }
      gradeSummary[grade].categoryAverages[c.category] += c.realScore;
    }

    gradeSummary[grade].totalAverage += student.totalScore;
  }

  // 🛠️ 2. แก้ไขเฉพาะจุดคำนวณค่าเฉลี่ยให้เป็น เปอร์เซ็นต์ และ ผลรวมเปอร์เซ็นต์
  for (const grade in gradeSummary) {
    const summary = gradeSummary[grade];
    let totalPercentSum = 0; // ตัวแปรสะสมผลรวมเปอร์เซ็นต์ของเกรดนี้

    for (const category in summary.categoryAverages) {
      // 1) หาคะแนนดิบเฉลี่ยของหมวดนี้ก่อน
      const rawAverage = summary.categoryAverages[category] / summary.count;
      
      // 2) ดึงค่า highestPossible ของหมวดนี้มาเป็นตัวหาร (ถ้าไม่มีให้ fallback เป็น 1 กันหารด้วย 0)
      const highest = highestCategoryMap[category] || 1;
      
      // 3) แปลงเป็นเปอร์เซ็นต์ (0 - 100%)
      const categoryPercentage = (rawAverage / highest) * 100;
      
      // บันทึกค่ากลับลงไปในรูปแบบเปอร์เซ็นต์
      summary.categoryAverages[category] = Number(categoryPercentage.toFixed(2));
      
      // นำเปอร์เซ็นต์ที่ได้ไปบวกรวมใน totalPercentSum
      totalPercentSum += categoryPercentage;
    }
    
    // เปลี่ยนมาเก็บผลรวมของเปอร์เซ็นต์แทนการเฉลี่ยคะแนนรวมดิบ
    summary.totalAverage = Number(totalPercentSum.toFixed(2));
  }

  // 5) เรียงผลลัพธ์ตามตัวอักษรของ grade (โค้ดเดิมเป๊ะ ไม่มีการเปลี่ยนแปลง)
  const gradeSummarySorted = Object.keys(gradeSummary)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = gradeSummary[key];
      return acc;
    }, {} as typeof gradeSummary);

  return gradeSummarySorted;
}