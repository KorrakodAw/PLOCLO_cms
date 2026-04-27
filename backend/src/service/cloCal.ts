
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
export async function getCloScorePerCourse(tx: any, CsemesterId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักเรียน + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: {
        assignment: {
            semester_id: Number(CsemesterId)
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
  CsemesterId: number
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
        const percentage =
          highest > 0 ? (clo.cloScore / highest) * 100 : 0;

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

/////////////////////////////////////////////////////////////////////////
// แปลง cloStats ให้เป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
/////////////////////////////////////////////////////////////////////////

export async function getCloStatsPercentagePerCourse(tx: any, semesterId: number) {
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
export async function getCloGradeSummaryPerCourse(tx: any, CsemesterId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ใช้ผลลัพธ์จากฟังก์ชัน clo เดิม
    const { cloScoresPerStudent } = await getCloScoreAllStudentPerCourse(
      tx,
      CsemesterId,
    );

    // 2) ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { semester_id: Number(CsemesterId)  },
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
      .reduce((acc, key) => {
        acc[key] = gradeSummary[key];
        return acc;
      }, {} as typeof gradeSummary);

    return gradeSummarySorted;
  });

  return result;
}