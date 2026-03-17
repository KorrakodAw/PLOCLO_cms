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
          percentage: Number(percentage.toFixed(2)),
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
  courseId: number
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
      courseId
    );
    results.push({
      student_id: s.student_id,
      programId: ploResult.ploScores.length > 0 ? ploResult.ploScores[0].programId : null,
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
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนน PLO ของนักเรียนแต่ละคน
    const perStudent = await getPloScoreAllStudentPerCourse(
      tx,
      CsemesterId,
      courseId
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
          percentage: Number(percentage.toFixed(2)),
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

    // 3) คำนวณเปอร์เซ็นต์ต่อ student ต่อ PLO
    const results: {
      studentId: number;
      ploPercentages: { ploCode: string; percentage: number }[];
    }[] = [];

    perStudent.forEach((student) => {
      const ploPercentages: { ploCode: string; percentage: number }[] = [];

      student.ploScores.forEach((plo) => {
        const highest = highestPloMap[plo.ploCode] ?? 0;
        const percentage =
          highest > 0 ? (plo.ploScore / highest) * 100 : 0;

        ploPercentages.push({
          ploCode: plo.ploCode,
          percentage,
        });
      });

      results.push({
        studentId: student.student_id,
        ploPercentages,
      });
    });

    return { ploPercentagePerStudent: results };
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
/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 course
/////////////////////////////////////////////////////////////

export async function getPloStatsPerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number
) {
  // 1) ดึงผลลัพธ์ PLO ของนักเรียนทุกคนใน course นี้
  const allStudentResults = await getPloScoreAllStudentPerCourse(
    tx,
    CsemesterId,
    courseId
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
  const ploStats = Object.entries(ploScoresByProgram).map(
    ([key, scores]) => {
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
    }
  );

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
      (highestPloMap[`${stat.programId}_${stat.ploCode}`] ?? 0).toFixed(2)
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
// แปลง ploStats ให้เป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
/////////////////////////////////////////////////////////////////////////

export async function getPloStatsPercentagePerCourse(
  tx: any,
  CsemesterId: number,
  courseId: number
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
        min: Number(toPercent(s.min).toFixed(2)),
        max: Number(toPercent(s.max).toFixed(2)),
        mean: Number(toPercent(s.mean).toFixed(2)),
        median: Number(toPercent(s.median).toFixed(2)),
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