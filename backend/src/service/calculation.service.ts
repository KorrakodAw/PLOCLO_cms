import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CLO
//---------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course (ไม่ normalize)
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  CsemesterId: number,
) {
  const resultCloStudent = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentClo = await tx.studentScore.findMany({
      where: {
        student_id: Number(studentId),
        assignment: {
          semester_id: Number(CsemesterId),
        },
      },
      select: {
        student_id: true,
        score: true,
        section_id: true, // ✅ ดึง section_id มาด้วย
        assignment_id: true,
        assignment: {
          select: {
            maxScore: true,
            weight: true,
            category: true,
            assignment_clo_mappings: {
              select: {
                cloId: true,
                weight: true,
                clo: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    // 2. Group by CLO Code
    const cloGroups = studentClo.reduce(
      (acc: Record<string, any[]>, row: any) => {
        row.assignment.assignment_clo_mappings.forEach((mapping: any) => {
          const cloCode = mapping.clo.code;
          if (!acc[cloCode]) acc[cloCode] = [];
          acc[cloCode].push({
            student_id: row.student_id,
            score: row.score,
            assignment_id: row.assignment_id,
            category: row.assignment.category,
            maxScore: row.assignment.maxScore,
            assignmentWeight: row.assignment.weight,
            weight: mapping.weight, // ✅ mappingWeight
            sectionId: row.section_id, // ✅ เก็บ sectionId ตั้งแต่ตรงนี้
          });
        });
        return acc;
      },
      {},
    );

    // 3. Calculate Scores (ไม่ normalize)
    const cloScores = Object.entries(cloGroups).map(
      ([cloCode, assignments]) => {
        let cloTotal = 0;

        assignments.forEach((row) => {
          const realScore =
            Number(row.score) /
            (Number(row.maxScore) / Number(row.assignmentWeight));

          const weighted = Number(row.weight) / 100; // mappingWeight เป็น %
          cloTotal += realScore * weighted;
        });

        // ✅ ดึง sectionId จาก assignment ตัวแรกในกลุ่ม
        const sectionId = assignments[0].sectionId;

        return { cloCode, cloScore: cloTotal.toFixed(2), sectionId };
      },
    );

    cloScores.sort((a, b) =>
      a.cloCode.localeCompare(b.cloCode, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return { cloScores };
  });

  return resultCloStudent;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ใน 1 course (รวมคะแนนของนักศึกษาทุกคนใน course, ไม่ normalize)
/////////////////////////////////////////////////////////////////////////

interface CLORow {
  score: number | string;
  maxScore: number | string;
  assignmentWeight: number | string;
  weight: number | string;
}

export async function getCloScorePerCourse(tx: any, CsemesterId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักเรียน + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: {
        assignment: {
          semester_id: Number(CsemesterId),
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
            assignment_clo_mappings: {
              select: {
                cloId: true,
                weight: true,
                clo: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    // 2) Group ตาม student
    const studentGroups = studentClo.reduce(
      (acc: Record<number, any[]>, row: any) => {
        if (!acc[row.student_id]) acc[row.student_id] = [];
        acc[row.student_id].push(row);
        return acc;
      },
      {},
    );

    // 3) คำนวณ CLO ของแต่ละ student (ไม่ normalize)
    const studentResults = Object.entries(studentGroups).map(
      ([studentId, rows]) => {
        const cloGroups = rows.reduce(
          (acc: Record<string, any[]>, row: any) => {
            row.assignment.assignment_clo_mappings.forEach((mapping: any) => {
              const cloCode = mapping.clo.code;
              if (!acc[cloCode]) acc[cloCode] = [];
              acc[cloCode].push({
                score: row.score,
                maxScore: row.assignment.maxScore,
                assignmentWeight: row.assignment.weight,
                weight: mapping.weight,
              });
            });
            return acc;
          },
          {},
        );

        const cloScores = Object.entries(cloGroups).map(
          ([cloCode, assignments]) => {
            let cloTotal = 0;
            let cloMaxPossible = 0;

            assignments.forEach((row) => {
              const realScore =
                Number(row.score) /
                (Number(row.maxScore) / Number(row.assignmentWeight));

              const weighted = Number(row.weight) / 100; // mappingWeight เป็น %
              cloTotal += realScore * weighted;

              // max possible = assignmentWeight * mappingWeight
              cloMaxPossible += Number(row.assignmentWeight) * weighted;
            });

            return { cloCode, cloScore: cloTotal, cloMaxPossible };
          },
        );

        return { student_id: Number(studentId), cloScores };
      },
    );

    // 4) รวม CLO ของทุก student
    const totalCloScores: Record<string, number> = {};
    const totalCloMaxPossible: Record<string, number> = {};
    studentResults.forEach((student) => {
      student.cloScores.forEach(({ cloCode, cloScore, cloMaxPossible }) => {
        totalCloScores[cloCode] = (totalCloScores[cloCode] ?? 0) + cloScore;
        totalCloMaxPossible[cloCode] =
          (totalCloMaxPossible[cloCode] ?? 0) + cloMaxPossible;
      });
    });

    // 5) คำนวณ maxCloScore และ percentage
    const cloScores = Object.entries(totalCloScores).map(
      ([cloCode, cloScore]) => {
        const maxCloScore = totalCloMaxPossible[cloCode] ?? 0;
        const percentage = maxCloScore > 0 ? (cloScore / maxCloScore) * 100 : 0;

        return {
          cloCode,
          cloScore: Number(cloScore.toFixed(4)),
          maxCloScore: Number(maxCloScore.toFixed(4)),
          percentage: Number(percentage.toFixed(4)),
        };
      },
    );

    cloScores.sort((a, b) =>
      a.cloCode.localeCompare(b.cloCode, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return { cloScores };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student แต่ละคน ใน 1 course (ไม่ normalize)
/////////////////////////////////////////////////////////////////////////
export async function getCloScoreAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักศึกษา + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: {
        assignment: {
          semester_id: Number(CsemesterId),
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
            assignment_clo_mappings: {
              select: {
                cloId: true,
                weight: true,
                clo: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    // const studentNames = await tx.student.findMany({
    //   where: {
    //     id: {
    //       in: studentClo.map((sc) => sc.student_id),
    //     },
    //   },
    //   select: {
    //     id: true,
    //     first_name: true,
    //     last_name: true,
    //     student_code: true,
    //   },
    // });

    // 2) Group ตาม student_id -> cloCode
    const studentGroups = studentClo.reduce(
      (acc: Record<string, Record<string, any[]>>, row: any) => {
        if (!acc[row.student_id]) acc[row.student_id] = {};
        row.assignment.assignment_clo_mappings.forEach((mapping: any) => {
          const cloCode = mapping.clo.code;
          if (!acc[row.student_id][cloCode]) acc[row.student_id][cloCode] = [];
          acc[row.student_id][cloCode].push({
            score: row.score,
            assignment_id: row.assignment_id,
            category: row.assignment.category,
            maxScore: row.assignment.maxScore,
            assignmentWeight: row.assignment.weight,
            weight: mapping.weight, // ✅ mappingWeight
          });
        });
        return acc;
      },
      {},
    );

    // 3) คำนวณ cloScore ต่อ student ต่อ clo (ไม่ normalize)
    const results: {
      student_id: number;
      // student_code: string;
      // studentName: string;
      cloScores: { cloCode: string; cloScore: number }[];
    }[] = [];

    Object.entries(studentGroups).forEach(([student_id, cloMap]) => {
      const cloScores: { cloCode: string; cloScore: number }[] = [];

      Object.entries(cloMap).forEach(([cloCode, assignments]) => {
        let cloTotal = 0;
        assignments.forEach((row) => {
          const realScore =
            Number(row.score) /
            (Number(row.maxScore) / Number(row.assignmentWeight));

          const weighted = Number(row.weight) / 100;
          cloTotal += realScore * weighted;
        });

        cloScores.push({ cloCode, cloScore: Number(cloTotal.toFixed(2)) });
      });

      // --- SORT CLOs (e.g., CLO1, CLO2) ---
      cloScores.sort((a, b) =>
        a.cloCode.localeCompare(b.cloCode, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      results.push({
        student_id: Number(student_id),
        cloScores,
        // student_code:
        //   studentNames.find((s) => s.id === Number(student_id))?.student_code ||
        //   "",
        // studentName:
        //   studentNames.find((s) => s.id === Number(student_id))?.first_name +
        //     " " +
        //     studentNames.find((s) => s.id === Number(student_id))?.last_name ||
        //   "",
      });
    });

    // --- SORT STUDENTS (by student_code) ---
    // results.sort((a, b) => a.student_code.localeCompare(b.student_code));

    return { cloScoresPerStudent: results };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo ของนักเรียนแต่ละคนออกมาเป็น percentage เทียบกับ highestPossible
/////////////////////////////////////////////////////////////////////////
export async function getCloPercentageAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึง cloScore ของนักเรียนแต่ละคน
    const perStudent = await getCloScoreAllStudentPerCourse(tx, CsemesterId);
    const cloScoresPerStudent = perStudent.cloScoresPerStudent;

    // 2) ดึง highestPossible ของแต่ละ CLO
    const assignments = await tx.assignment.findMany({
      where: { semester: { id: Number(CsemesterId) } },
      select: {
        weight: true,
        assignment_clo_mappings: {
          select: {
            clo: { select: { code: true } },
            weight: true,
          },
        },
      },
    });

    const highestCloMap: Record<string, number> = {};
    assignments.forEach((assignment) => {
      assignment.assignment_clo_mappings.forEach((mapping) => {
        const cloCode = mapping.clo.code;
        const contribution =
          Number(assignment.weight) * (Number(mapping.weight) / 100);
        if (!highestCloMap[cloCode]) highestCloMap[cloCode] = 0;
        highestCloMap[cloCode] += contribution;
      });
    });

    // 3) คำนวณ cloScore เป็น percentage ต่อ student ต่อ clo
    const results: {
      student_id: number;
      cloPercentages: { cloCode: string; percentage: number }[];
    }[] = [];

    cloScoresPerStudent.forEach((student) => {
      const cloPercentages: { cloCode: string; percentage: number }[] = [];

      student.cloScores.forEach((clo) => {
        const highest = highestCloMap[clo.cloCode] ?? 0;
        const percentage = highest > 0 ? (clo.cloScore / highest) * 100 : 0;

        cloPercentages.push({
          cloCode: clo.cloCode,
          percentage,
        });
      });

      results.push({
        student_id: student.student_id,
        cloPercentages,
      });
    });

    return { cloPercentagePerStudent: results };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของ clo แต่ละตัว ใน 1 course
/////////////////////////////////////////////////////////////////////////

export async function getCloStatsPerCourse(tx: any, CsemesterId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // -----------------------------
    // 1) คำนวณ min, max, mean จาก student scores (โค้ดเดิม)
    // -----------------------------
    const perStudent = await getCloScoreAllStudentPerCourse(tx, CsemesterId);
    const cloScoresPerStudent = perStudent.cloScoresPerStudent;

    const cloGroups: Record<string, number[]> = {};

    cloScoresPerStudent.forEach((student) => {
      student.cloScores.forEach((clo) => {
        if (!cloGroups[clo.cloCode]) cloGroups[clo.cloCode] = [];
        cloGroups[clo.cloCode].push(clo.cloScore);
      });
    });

    const cloStatsBase = Object.entries(cloGroups).map(([cloCode, scores]) => {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const mean =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;

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

      return { cloCode, min, max, mean, median };
    });

    // -----------------------------
    // 2) เพิ่มการหา highest clo possible จาก assignment weight
    // -----------------------------
    const assignments = await tx.assignment.findMany({
      where: { semester: { id: Number(CsemesterId) } },
      select: {
        weight: true,
        assignment_clo_mappings: {
          select: {
            clo: { select: { code: true } },
            weight: true,
          },
        },
      },
    });

    const highestCloMap: Record<string, number> = {};
    assignments.forEach((assignment) => {
      assignment.assignment_clo_mappings.forEach((mapping) => {
        const cloCode = mapping.clo.code;
        const contribution =
          Number(assignment.weight) * (Number(mapping.weight) / 100);
        if (!highestCloMap[cloCode]) highestCloMap[cloCode] = 0;
        highestCloMap[cloCode] += contribution;
      });
    });

    // -----------------------------
    // 3) merge cloStatsBase + highestClo
    // -----------------------------
    const cloStats = cloStatsBase.map((stat) => ({
      ...stat,
      highestPossible: highestCloMap[stat.cloCode] ?? 0,
    }));

    return { cloStats };
  });

  return result;
}

/*export async function getCloStatsPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    const perStudent = await getCloScoreAllStudentPerCourse(tx, courseId);
    const cloScoresPerStudent = perStudent.cloScoresPerStudent;

    const cloGroups: Record<string, number[]> = {};

    cloScoresPerStudent.forEach((student) => {
      student.cloScores.forEach((clo) => {
        if (!cloGroups[clo.cloCode]) cloGroups[clo.cloCode] = [];
        cloGroups[clo.cloCode].push(clo.cloScore);
      });
    });

    const cloStats = Object.entries(cloGroups).map(([cloCode, scores]) => {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { cloCode, min, max, mean };
    });

    cloStats.sort((a, b) =>
      a.cloCode.localeCompare(b.cloCode, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

    return { cloStats };
  });

  return result;
}*/

/////////////////////////////////////////////////////////////////////////
// แปลง cloStats ให้เป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
/////////////////////////////////////////////////////////////////////////

export async function getCloStatsPercentagePerCourse(
  tx: any,
  semesterId: number,
) {
  const { cloStats } = await getCloStatsPerCourse(tx, semesterId);

  const cloStatsPercentage = cloStats.map((stat) => {
    const highest = stat.highestPossible || 1; // กัน division by zero

    const toPercent = (value: number) => (value / highest) * 100;

    return {
      cloCode: stat.cloCode,
      min: toPercent(stat.min),
      max: toPercent(stat.max),
      mean: toPercent(stat.mean),
      median: toPercent(stat.median),
      highestPossible: 100, // กำหนดให้เป็น 100% เสมอ
    };
  });

  return { cloStatsPercentage };
}

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด + ค่าเฉลี่ย CLO ต่อเกรด + ค่าเฉลี่ยรวม
/////////////////////////////////////////////////////////////////////////
export async function getCloGradeSummaryPerCourse(
  tx: any,
  CsemesterId: number,
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ใช้ผลลัพธ์จากฟังก์ชัน clo เดิม
    const { cloScoresPerStudent } = await getCloScoreAllStudentPerCourse(
      tx,
      CsemesterId,
    );

    // 2) ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { semester_id: Number(CsemesterId) },
      orderBy: { score: "desc" }, // เรียงจากคะแนนสูงไปต่ำ
    });

    // 3) จัดกลุ่มตาม grade
    const gradeSummary: Record<
      string,
      {
        count: number;
        categoryAverages: Record<string, number>;
        totalAverage: number;
      }
    > = {};

    for (const student of cloScoresPerStudent) {
      // รวมคะแนน CLO ของนักเรียนแต่ละคน
      const totalScore = student.cloScores.reduce(
        (sum, c) => sum + c.cloScore,
        0,
      );

      // หา grade ของนักเรียน
      let grade = "F";
      for (const gs of gradeSettings) {
        if (totalScore >= Number(gs.score)) {
          grade = gs.grade;
          break;
        }
      }

      // ถ้า grade ยังไม่มีใน summary → initialize
      if (!gradeSummary[grade]) {
        gradeSummary[grade] = {
          count: 0,
          categoryAverages: {},
          totalAverage: 0,
        };
      }

      gradeSummary[grade].count += 1;
      gradeSummary[grade].totalAverage += totalScore;

      // รวมคะแนน CLO ต่อ grade
      for (const clo of student.cloScores) {
        if (!gradeSummary[grade].categoryAverages[clo.cloCode]) {
          gradeSummary[grade].categoryAverages[clo.cloCode] = 0;
        }
        gradeSummary[grade].categoryAverages[clo.cloCode] += clo.cloScore;
      }
    }

    // 4) หาค่าเฉลี่ยต่อ grade
    for (const grade in gradeSummary) {
      const summary = gradeSummary[grade];
      for (const cloCode in summary.categoryAverages) {
        summary.categoryAverages[cloCode] =
          summary.categoryAverages[cloCode] / summary.count;
      }
      summary.totalAverage = summary.totalAverage / summary.count;
    }

    // 5) เรียงผลลัพธ์ตามตัวอักษรของ grade
    const gradeSummarySorted = Object.keys(gradeSummary)
      .sort((a, b) => a.localeCompare(b))
      .reduce(
        (acc, key) => {
          acc[key] = gradeSummary[key];
          return acc;
        },
        {} as typeof gradeSummary,
      );

    return gradeSummarySorted;
  });

  return result;
}

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
  CsemesterId: number,
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
      const categoryPercentages: { category: string; percentage: number }[] =
        [];

      student.categoryScores.forEach((cat) => {
        const highest = highestCategoryMap[cat.category] ?? 0;
        const percentage = highest > 0 ? (cat.realScore / highest) * 100 : 0;

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
        const mean =
          scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;

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
      },
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

export async function getRealScoreStatsPercentagePerCourse(
  tx: any,
  CsemesterId: number,
) {
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
    .reduce(
      (acc, key) => {
        acc[key] = gradeSummary[key];
        return acc;
      },
      {} as typeof gradeSummary,
    );

  return gradeSummarySorted;
}

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

/*
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

  const cloMappings: CloMapping[] = await tx.cloPloMapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { id: true, code: true, program_id: true } },
      weight: true,
    },
  });

  // group ตาม program_id + ploCode
  const ploGroups: Record<string, number> = {};

  cloMappings.forEach((map: CloMapping) => {
    const cloScore = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code),
    );
    if (!cloScore) return;

    const contribution = Number(cloScore.cloScore) * (Number(map.weight) / 100);

    const key = `${map.plo.program_id}_${map.plo.code}`;
    ploGroups[key] = (ploGroups[key] ?? 0) + contribution;
  });

  // แปลงกลับเป็น array พร้อม programId
  const ploScores = Object.entries(ploGroups).map(([key, ploScore]) => {
    const [programId, ploCode] = key.split("_");
    return {
      programId: Number(programId),
      ploCode,
      ploScore,
    };
  });

  return { ploScores };
}*/

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 course
/////////////////////////////////////////////////////////////////////////

/*
export async function getPloScorePerCourse(tx: any, CsemesterId: number, courseId: number) {
  const cloResult = await getCloScorePerCourse(tx, CsemesterId);

  type CloMapping = {
    clo: { code: any };
    plo: { code: any };
    weight: number;
  };

  const cloMappings: CloMapping[] = await tx.cloPloMapping.findMany({
    where: { clo: { courseId } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true } },
      weight: true,
    },
  });

  const ploGroups: Record<string, { score: number; max: number }> = {};

  cloMappings.forEach((map: CloMapping) => {
    const cloScoreObj = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code),
    );
    if (!cloScoreObj) return;

    const contributionScore = cloScoreObj.cloScore * (map.weight / 100);
    const contributionMax = cloScoreObj.maxCloScore * (map.weight / 100);

    if (!ploGroups[map.plo.code]) {
      ploGroups[map.plo.code] = { score: 0, max: 0 };
    }

    ploGroups[map.plo.code].score += contributionScore;
    ploGroups[map.plo.code].max += contributionMax;
  });

  const ploScores = Object.entries(ploGroups).map(
    ([ploCode, { score, max }]) => {
      const percentage = max > 0 ? (score / max) * 100 : 0;

      return {
        ploCode,

        ploScore: Number(score.toFixed(4)),
        maxPloScore: Number(max.toFixed(4)),
        // Percentage usually looks better with 2 decimal places
        percentage: Number(percentage.toFixed(2)),
      };
    },
  );

  return { ploScores };
}
*/

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number,
) {
  // 1) ดึงรายชื่อนิสิตทั้งหมดที่ลงทะเบียนในวิชานี้ (กวาดจากทุก Semester)
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

/*
export async function getPloPercentageAllStudentPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนน PLO ของนักเรียนแต่ละคน
    const perStudent = await getPloScoreAllStudentPerCourse(tx, CsemesterId, courseId);

    // 2) ดึงค่า highestPossible ของแต่ละ PLO
    const { ploStats } = await getPloStatsPerCourse(tx, CsemesterId, courseId);
    const highestPloMap: Record<string, number> = {};
    ploStats.forEach((stat) => {
      highestPloMap[stat.ploCode] = stat.highestPossible;
    });

  // ระบุ type ให้ stat เพื่อป้องกัน any
  ploStats.forEach((stat: PloStat) => {
    highestPloMap[stat.ploCode] = stat.highestPossible;
  });

  return result;
}
*/

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 program
/////////////////////////////////////////////////////////////////////////
/*
export async function getPloScorePerProgram(tx: any, programId: number) {
  const courses = await tx.course.findMany({
    where: { program_id: Number(programId) },
    select: { id: true },
  });

  const allPloScores: Record<string, { score: number; max: number }> = {};

  for (const course of courses) {
    const { ploScores } = await getPloScorePerCourse(tx, course.id);

    ploScores.forEach(({ ploCode, ploScore, maxPloScore }) => {
      if (!allPloScores[ploCode]) {
        allPloScores[ploCode] = { score: 0, max: 0 };
      }
      allPloScores[ploCode].score += ploScore;
      allPloScores[ploCode].max += maxPloScore;
    });
  }

  const programPloScores = Object.entries(allPloScores).map(
    ([ploCode, { score, max }]) => {
      const percentage = max > 0 ? (score / max) * 100 : 0;
      return { ploCode, ploScore: score, maxPloScore: max, percentage };
    },
  );

  return { programPloScores };
}
*/
/////////////////////////////////////////////////////////////
// คำนวณ PLO แต่ละตัว ของ student 1 คน (รวมทุก course ที่เรียน)
/////////////////////////////////////////////////////////////
/*
export async function getPloScorePerStudentFromAllCourse(
  tx: any,
  studentId: number,
) {
  // 1) ดึง course ที่นักเรียนเรียนผ่าน course_section
  const courseRefs = await tx.courseSection.findMany({
    where: {
      scores: {
        some: { student_id: Number(studentId) },
      },
    },
    distinct: ['course_semester_id'],   // ✅ ทำให้ course_id ไม่ซ้ำ
    select: {
      course_id: true,
    },
  });

  // Explicitly type 'courseIds' as 'number[]'
  const semesterIds: number[] = Array.from(
    new Set(
      courseRefs
        .map((ref: any) => ref.course_id) // ✅ ใช้ course_id ตรง ๆ
        .filter((id: any): id is number => typeof id === "number"),
    ),
  ) as number[];

  const ploGroups: Record<string, number> = {};

  for (const semesterId of semesterIds) {
    const { ploScores } = await getPloScorePerStudentPerCourse(
      tx,
      studentId,
      semesterId,
      courseId

    );

    ploScores.forEach(({ ploCode, ploScore }) => {
      ploGroups[ploCode] = (ploGroups[ploCode] ?? 0) + ploScore;
    });
  }

  const ploScoresAllCourses = Object.entries(ploGroups).map(
    ([ploCode, ploScore]) => ({
      ploCode,
      ploScore,
    }),
  );

  return { ploScoresAllCourses };
}
*/

/////////////////////////////////////////////////////////////////////////
// หาว่า PLO แต่ละตัวได้คะแนนมาจาก course ไหนบ้าง
/////////////////////////////////////////////////////////////////////////
/*
export async function getPloProgramWhereScoreComeFrom(
  tx: any,
  programId: number,
) {
  const coursesSemesters = await tx.courseSemester.findMany({
    where: { course: { program_id: Number(programId) } },
    select: { id: true, semester: true, year: true,
     course: { select: { id: true, code: true, name: true, name_th: true, credits: true } },
     },
  });

  const ploGroups: Record<
    string,
    {
      ploCode: string;
      contributions: {
        courseSemesterId: number;
        year: number;
        semester: number;
        courseCode: string;
        courseName: string;
        courseNameTh: string;
        ploScore: number;
      }[];
    }
  > = {};

  for (const course of coursesSemesters) {
    const { ploScores } = await getPloScorePerCourse(tx, course.id);

    ploScores.forEach(({ ploCode, ploScore }) => {
      if (!ploGroups[ploCode]) {
        ploGroups[ploCode] = { ploCode, contributions: [] };
      }
      ploGroups[ploCode].contributions.push({
        courseSemesterId: course.id,
        year: course.year,
        semester: course.semester,
        courseCode: course.code,
        courseName: course.name,
        courseNameTh: course.name_th,
        ploScore,
      });
    });
  }

  const programPloScores = Object.values(ploGroups);

  return { programPloScores };
}
*/

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

  const studentsInProgram = await tx.student.findMany({
    where: { program_id: programId },
    select: {
      id: true,
      student_code: true,
      first_name: true,
      last_name: true,
    },
  });

  const studentNameMap: Record<number, string> = {};
  const studentCodeMap: Record<number, string> = {};
  studentsInProgram.forEach((s: any) => {
    studentNameMap[s.id] = `${s.first_name} ${s.last_name}`;
    studentCodeMap[s.id] = s.student_code;
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
        student_code: studentCodeMap[s.student_id] || null,
        student_name: studentNameMap[s.student_id] || null,
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

  const students = await tx.studentScore.findMany({
    where: {
      assignment: { semester: { semester, year } },
      student: { program_id: programId }, // กรอง programId ตั้งแต่ query
    },
    distinct: ["student_id"],
    select: { student_id: true },
  });

  const studentsInProgram = await tx.student.findMany({
    where: { program_id: programId },
    select: {
      id: true,
      student_code: true,
      first_name: true,
      last_name: true,
    },
  });

  const studentNameMap: Record<number, string> = {};
  const studentCodeMap: Record<number, string> = {};
  studentsInProgram.forEach((s: any) => {
    studentNameMap[s.id] = `${s.first_name} ${s.last_name}`;
    studentCodeMap[s.id] = s.student_code;
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
      student_code: studentCodeMap[student.student_id] || null,
      student_name: studentNameMap[student.student_id] || null,
      student_id: student.student_id,
      programId: student.programId,
      ploScores: percentageScores,
    };
  });

  return results;
}

/*
export async function getPloScoreAllStudentPerSemester(
  tx: any,
  semester: number,
  year: number
) {
  // 1. ดึง courseSemester ทั้งหมดในเทอมนี้
  const courseSemesters = await tx.courseSemester.findMany({
    where: { semester, year },
    select: { id: true, course_id: true },
  });

  // 2. ดึงนักเรียนทั้งหมดที่มีคะแนนในเทอมนี้
  const students = await tx.studentScore.findMany({
    where: { assignment: { semester: { semester, year } } }, // filter ผ่าน assignment.semester
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
        cs.course_id
      );

      for (const { ploCode, ploScore } of ploResult.ploScores) {
        if (!ploAggregate[ploCode]) ploAggregate[ploCode] = [];
        ploAggregate[ploCode].push(Number(ploScore));
      }
    }

    // 4. รวมค่า (เช่น average)
    const finalScores = Object.entries(ploAggregate).map(([ploCode, scores]) => ({
      ploCode,
      ploScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));

    results.push({
      student_id: s.student_id,
      ploScores: finalScores,
    });
  }

  results.sort((a, b) => a.student_id - b.student_id);
  return results;
}*/

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

  const studentsInProgram = await tx.student.findMany({
    where: { program_id: programId },
    select: {
      id: true,
      student_code: true,
      first_name: true,
      last_name: true,
    },
  });

  const studentNameMap: Record<number, string> = {};
  const studentCodeMap: Record<number, string> = {};
  studentsInProgram.forEach((s: any) => {
    studentNameMap[s.id] = `${s.first_name} ${s.last_name}`;
    studentCodeMap[s.id] = s.student_code;
  });

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
    const sIdNum = Number(studentId);
    const finalPloScores = Object.entries(plos).map(([ploCode, scores]) => ({
      ploCode,
      // รวมคะแนนจากทุกเทอมเข้าด้วยกัน
      ploScore: Number(scores.reduce((a, b) => a + b, 0).toFixed(4)),
    }));

    return {
      student_id: Number(studentId),
      student_name: studentNameMap[sIdNum] || "Unknown Student",
      student_code: studentCodeMap[sIdNum] || "Unknown Code",
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

/*
export async function getPloStatsPercentagePerCourse(tx: any, CsemesterId: number, courseId: number) {
  const { ploStats } = await getPloStatsPerCourse(tx, CsemesterId, courseId);

  const ploStatsPercentage = ploStats.map((stat) => {
    const highest = stat.highestPossible || 1; // กัน division by zero

    const toPercent = (value: number) => (value / highest) * 100;

    return {
      ploCode: stat.ploCode,
      min: toPercent(stat.min),
      max: toPercent(stat.max),
      mean: toPercent(stat.mean),
      median: toPercent(stat.median),
      highestPossible: 100, // กำหนดให้เป็น 100% เสมอ
    };
  });

  return { ploStatsPercentage };
}
*/

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

/*
export async function getPloStatsPerSemester(
  tx: any,
  programId: number,
  year: number,
  semester: number
) {
  // 1. ดึงคะแนนรายบุคคล (ที่คูณ credits มาแล้ว) จาก function ที่คุณมี
  const studentResults = await getPloScoreAllStudentPerSemester(tx, programId, year, semester);

  // 2. ดึงข้อมูล Course ทั้งหมดใน Semester นี้เพื่อคำนวณ highestPossible
  const courseSemesters = await tx.courseSemester.findMany({
    where: { year, semester },
    select: {
      id: true,
      course_id: true,
      course: { select: { credits: true } },
    },
  });

  // ---------------------------------------------------------
  // ส่วนที่ 1: คำนวณ highestPossible ของทั้ง Semester
  // ---------------------------------------------------------
  const semesterPloHighest: Record<string, number> = {};

  for (const cs of courseSemesters) {
    // ใช้ Logic เดียวกับ getPloStatsPerCourse เพื่อหาค่าสูงสุดของแต่ละ Course
    const { cloStats } = await getCloStatsPerCourse(tx, cs.id);
    
    const cloPloMappings = await tx.cloPloMapping.findMany({
      where: { clo: { course_id: cs.course_id }, plo: { program_id: programId } },
      select: {
        clo: { select: { code: true } },
        plo: { select: { code: true } },
        weight: true,
      },
    });

    const credits = Number(cs.course.credits);

    cloPloMappings.forEach((map: any) => {
      const cloHighest = cloStats.find((c: any) => c.cloCode === map.clo.code)?.highestPossible ?? 0;
      // สูตร: (ผลรวมของ CLO Potential * Weight) * Credits
      const contribution = (cloHighest * (Number(map.weight) / 100)) * credits;
      
      const ploCode = map.plo.code;
      semesterPloHighest[ploCode] = (semesterPloHighest[ploCode] ?? 0) + contribution;
    });
  }

  // ---------------------------------------------------------
  // ส่วนที่ 2: คำนวณค่าสถิติ (Min, Max, Mean, Median) จากคะแนนนักเรียน
  // ---------------------------------------------------------
  const ploGroups: Record<string, number[]> = {};
  studentResults.forEach((s) => {
    s.ploScores.forEach((p) => {
      if (!ploGroups[p.ploCode]) ploGroups[p.ploCode] = [];
      ploGroups[p.ploCode].push(p.ploScore);
    });
  });

  const finalStats = Object.entries(ploGroups).map(([ploCode, scores]) => {
    const sorted = [...scores].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    // Median Logic
    const mid = Math.floor(count / 2);
    const median = count % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    return {
      ploCode,
      min: Number(sorted[0].toFixed(2)),
      max: Number(sorted[count - 1].toFixed(2)),
      mean: Number((sum / count).toFixed(2)),
      median: Number(median.toFixed(2)),
      highestPossible: Number((semesterPloHighest[ploCode] ?? 0).toFixed(2)),
      studentCount: count
    };
  });

  // เรียงลำดับ PLO เพื่อความสวยงาม
  return finalStats.sort((a, b) => a.ploCode.localeCompare(b.ploCode, undefined, { numeric: true }));
}
*/

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

/*
export async function getStudentPloCumulative(
  tx: any,
  studentId: number
) {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true }
  });

  if (!student) throw new Error("Student not found");

  // ดึงข้อมูลคะแนนพร้อมระบุโครงสร้างให้ชัดเจน
  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: {
      assignment: {
        select: {
          semester: {
            select: { year: true, semester: true }
          }
        }
      }
    }
  });

  // แก้ Error: Parameter 's' implicitly has an 'any' type
  // และ Error: Property 'year' does not exist on type 'unknown'
  const uniqueSemesters = Array.from(
    new Map<string, SemesterInfo>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`, 
        s.assignment.semester as SemesterInfo // Cast เป็น SemesterInfo
      ])
    ).values()
  );

  const ploResults = [];
  
  for (const sem of uniqueSemesters) {
    // ตอนนี้ TypeScript จะรู้แล้วว่า sem มี year และ semester
    const { year, semester } = sem;
    
    const semesterData = await getPloScoreAllStudentPerSemester(
      tx, 
      student.program_id, 
      year, 
      semester
    );

    // ระบุ type 's: any' เพื่อแก้ Error
    const record = semesterData.find((s: any) => s.student_id === studentId);
    
    if (record) {
      ploResults.push({
        year,
        semester,
        plos: record.ploScores as PloScore[]
      });
    }
  }

  const cumulativeMap: Record<string, number> = {};
  ploResults.forEach(sem => {
    sem.plos.forEach((p: PloScore) => {
      cumulativeMap[p.ploCode] = (cumulativeMap[p.ploCode] ?? 0) + p.ploScore;
    });
  });

  return {
    studentId,
    programId: student.program_id,
    cumulativePloScores: Object.entries(cumulativeMap).map(([ploCode, ploScore]) => ({
      ploCode,
      ploScore: Number(ploScore.toFixed(2))
    })),
    /*
    semesterHistory: ploResults.sort((a, b) => 
      a.year !== b.year ? a.year - b.year : a.semester - b.semester
    )
    */
//};
//}
//*/

/////////////////////////////////////////////////////////////////////////////////////
/**
 * Cumulative PLO Transcript แบบละเอียด
 */
/////////////////////////////////////////////////////////////////////////////////////
export async function getStudentPloDetailedCumulative(
  tx: any,
  studentId: number,
) {
  // 1. เตรียมข้อมูลพื้นฐาน
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

  // 2. สะสมข้อมูลรายเทอม (Raw Data)
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

  // 3. จัด Format และคำนวณแบบ Running Total ทั้งหมด
  const result = Object.entries(tempPloData).map(([ploCode, data]) => {
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
        // เพดานสะสม ณ เทอมนั้น เทียบกับ Grand Total (เพดานขยับขึ้น)
        termHighestPossiblePercentage: Number(
          ((runningHighestPossible / grandTotal) * 100).toFixed(2),
        ),
        rawScore: Number(runningRawScore.toFixed(2)),
        // คะแนนที่เด็กทำได้สะสม ณ เทอมนั้น เทียบกับ Grand Total (คะแนนวิ่งตามเพดาน)
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

  return {
    studentId,
    totalHighestAll: Number(totalHighestAll.toFixed(2)),
    ploDetailedStats: result,
  };
}

/*
export async function getStudentPloDetailedCumulative(
  tx: any,
  studentId: number
) {
  // --- 1. เตรียมข้อมูลพื้นฐาน (เหมือนเดิม) ---
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true }
  });
  if (!student) throw new Error("Student not found");

  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: { assignment: { select: { semester: { select: { year: true, semester: true } } } } }
  });

  const uniqueSemesters = Array.from(
    new Map<string, SemesterInfo>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`, 
        s.assignment.semester as SemesterInfo
      ])
    ).values()
  ).sort((a, b) => a.year !== b.year ? a.year - b.year : a.semester - b.semester);

  const tempPloData: Record<string, { 
    totalHighest: number, 
    totalRaw: number,
    terms: { year: number, semester: number, rawScore: number, termHighest: number }[] 
  }> = {};

  // --- 2. สะสมข้อมูลรายเทอม ---
  for (const sem of uniqueSemesters) {
    const { year, semester } = sem;
    const statsData = await getPloStatsPerSemester(tx, student.program_id, year, semester);
    const semesterPlos = statsData.ploSemesterStats[0]?.plos || {};
    const semesterData = await getPloScoreAllStudentPerSemester(tx, student.program_id, year, semester);
    const studentRecord = semesterData.find((s: any) => s.student_id === studentId);

    Object.entries(semesterPlos).forEach(([ploCode, detail]: [string, any]) => {
      if (!tempPloData[ploCode]) {
        tempPloData[ploCode] = { totalHighest: 0, totalRaw: 0, terms: [] };
      }
      const rawScore = studentRecord?.ploScores.find((p: any) => p.ploCode === ploCode)?.ploScore || 0;
      const termHighest = detail.highestPossible || 0;

      tempPloData[ploCode].totalHighest += termHighest;
      tempPloData[ploCode].totalRaw += rawScore;
      tempPloData[ploCode].terms.push({ year, semester, rawScore, termHighest });
    });
  }

  // --- 3. คำนวณหา Grand Total Highest (100%) ---
  const totalHighestAll = Object.values(tempPloData).reduce((sum, data) => sum + data.totalHighest, 0);
  const grandTotal = totalHighestAll || 1; // ตัวหารหลักสำหรับทุกจุด

  // --- 4. จัด Format ผลลัพธ์โดยใช้ Grand Total เป็นฐานเดียวกันทั้งหมด ---
  const result = Object.entries(tempPloData).map(([ploCode, data]) => {
    
    // 1. เพดานของ PLO นี้ (เช่น 400 / 1000 = 40%)
    const totalHighestPercentage = Number(((data.totalHighest / grandTotal) * 100).toFixed(2));

    // 2. คะแนนที่เด็กทำได้จริงเทียบกับ Grand Total (เช่น 120 / 1000 = 12%)
    // ค่านี้จะไม่มีทางเกิน totalHighestPercentage แน่นอน
    const ploAchievementPercentage = Number(((data.totalRaw / grandTotal) * 100).toFixed(2));

    const breakdown = data.terms.map(t => ({
      year: t.year,
      semester: t.semester,
      rawScore: Number(t.rawScore.toFixed(2)),
      termHighestPossible: Number(t.termHighest.toFixed(2)),
      // 3. ส่วนแบ่งรายเทอมเทียบกับ Grand Total (เช่น 80 / 1000 = 8%)
      contributionPercentage: Number(((t.rawScore / grandTotal) * 100).toFixed(2))
    }));

    return {
      ploCode,
      totalHighest: Number(data.totalHighest.toFixed(2)),
      totalHighestPercentage,
      ploAchievementRaw: Number(data.totalRaw.toFixed(2)),
      ploAchievementPercentage,
      breakdown
    };
  });

  return {
    studentId,
    totalHighestAll: Number(totalHighestAll.toFixed(2)),
    ploDetailedStats: result
  };
}
*/
/*
export async function getStudentPloDetailedTranscript(
  tx: any,
  studentId: number
) {
  // 1. ดึงข้อมูลนักเรียนและโปรแกรม
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { program_id: true }
  });
  if (!student) throw new Error("Student not found");

  // 2. หาเทอมทั้งหมดที่มีคะแนน
  const scores = await tx.studentScore.findMany({
    where: { student_id: studentId },
    select: { assignment: { select: { semester: { select: { year: true, semester: true } } } } }
  });

  const uniqueSemesters = Array.from(
    new Map<string, SemesterInfo>(
      scores.map((s: any) => [
        `${s.assignment.semester.year}-${s.assignment.semester.semester}`, 
        s.assignment.semester as SemesterInfo
      ])
    ).values()
  ).sort((a, b) => a.year !== b.year ? a.year - b.year : a.semester - b.semester);

  // 3. รวบรวมข้อมูลดิบรายเทอมก่อนเพื่อหา Total Highest
  const tempPloData: Record<string, { 
    totalHighest: number, 
    totalRaw: number,
    terms: { year: number, semester: number, rawScore: number, termHighest: number }[] 
  }> = {};

  for (const sem of uniqueSemesters) {
    const { year, semester } = sem;
    
    // ดึงค่าสูงสุดของเทอม
    const statsData = await getPloStatsPerSemester(tx, student.program_id, year, semester);
    const semesterPlos = statsData.ploSemesterStats[0]?.plos || {};

    // ดึงคะแนนนักเรียน
    const semesterData = await getPloScoreAllStudentPerSemester(tx, student.program_id, year, semester);
    const studentRecord = semesterData.find((s: any) => s.student_id === studentId);

    Object.entries(semesterPlos).forEach(([ploCode, detail]: [string, any]) => {
      if (!tempPloData[ploCode]) {
        tempPloData[ploCode] = { totalHighest: 0, totalRaw: 0, terms: [] };
      }

      const rawScore = studentRecord?.ploScores.find((p: any) => p.ploCode === ploCode)?.ploScore || 0;
      const termHighest = detail.highestPossible || 0;

      tempPloData[ploCode].totalHighest += termHighest;
      tempPloData[ploCode].totalRaw += rawScore;
      tempPloData[ploCode].terms.push({ year, semester, rawScore, termHighest });
    });
  }

  // 4. คำนวณ Percentage โดยใช้ Total Highest เป็นฐานเดียวกันหมด
  const result = Object.entries(tempPloData).map(([ploCode, data]) => {
    const totalPotential = data.totalHighest || 1; // กันหารด้วย 0

    const breakdown = data.terms.map(t => ({
      year: t.year,
      semester: t.semester,
      rawScore: Number(t.rawScore.toFixed(2)),
      termHighestPossible: Number(t.termHighest.toFixed(2)),
      // สูตร: (คะแนนเทอมนี้ / คะแนนเต็มรวมทุกเทอม) * 100
      contributionPercentage: Number(((t.rawScore / totalPotential) * 100).toFixed(2))
    }));

    return {
      ploCode,
      cumulative: {
        totalRaw: Number(data.totalRaw.toFixed(2)),
        totalHighest: Number(data.totalHighest.toFixed(2)),
        // ผลรวมของ contributionPercentage จะเท่ากับตัวนี้
        totalPercentage: Number(((data.totalRaw / totalPotential) * 100).toFixed(2))
      },
      breakdown
    };
  });

  return {
    studentId,
    programId: student.program_id,
    ploDetailedStats: result
  };
}
*/

/*

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 program
/////////////////////////////////////////////////////////////
/*
export async function getPloStatsPerProgram(tx: any, programId: number) {
  const students = await tx.student.findMany({
    select: { id: true },
    where: { program_id: programId },
  });

  const ploBuckets: Record<string, number[]> = {};

  for (const { id: studentId } of students) {
    const { ploScoresAllCourses } = await getPloScorePerStudentFromAllCourse(
      tx,
      studentId,
    );

    ploScoresAllCourses.forEach(({ ploCode, ploScore }) => {
      if (!ploBuckets[ploCode]) {
        ploBuckets[ploCode] = [];
      }
      ploBuckets[ploCode].push(ploScore);
    });
  }

  const ploStats = Object.entries(ploBuckets).map(([ploCode, scores]) => {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return { ploCode, min, max, mean };
  });

  return { ploStats };
}
*/

//-------------------------------------------------------------------------
// Best/Worst Helpers (These remain mostly logic-only, assuming data is fetched correctly)
//-------------------------------------------------------------------------

export async function getCloBestWorstPerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number,
) {
  const resultCloStudent = await getCloScorePerStudentPerCourse(
    tx,
    studentId,
    courseId,
  );
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.cloScore);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore > prev.cloScore ? curr : prev,
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore < prev.cloScore ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + Number(s), 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getCloBestWorstPerCourse(tx: any, courseId: number) {
  const resultCloStudent = await getCloScorePerCourse(tx, courseId);
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.cloScore);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore > prev.cloScore ? curr : prev,
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore < prev.cloScore ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + Number(s), 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getCloBestWorstPerCoursePercentage(
  tx: any,
  courseId: number,
) {
  const resultCloStudent = await getCloScorePerCourse(tx, courseId);
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.percentage);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.percentage > prev.percentage ? curr : prev,
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.percentage < prev.percentage ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

/*
export async function getPloBestWorstPerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number,
) {
  const resultPloStudent = await getPloScorePerStudentPerCourse(
    tx,
    studentId,
    courseId,
  );
  if (resultPloStudent.ploScores.length === 0) return {};

  const scores = resultPloStudent.ploScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev,
  );
  const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}
*/
/*
export async function getPloBestWorstPerCourse(tx: any, courseId: number) {
  const resultPloStudent = await getPloScorePerCourse(tx, courseId);
  if (resultPloStudent.ploScores.length === 0) return {};

  const scores = resultPloStudent.ploScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev,
  );
  const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getPloBestWorstPerProgram(tx: any, programId: number) {
  const resultPloStudent = await getPloScorePerProgram(tx, programId);
  if (resultPloStudent.programPloScores.length === 0) return {};

  const scores = resultPloStudent.programPloScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev,
  );
  const minClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev,
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}
*/
