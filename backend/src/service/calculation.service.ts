import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const resultCloStudent = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentClo = await tx.studentScore.findMany({
      where: {
        student_id: Number(studentId),
        assignment: {
          course_id: Number(courseId), // ✅ Fixed: Direct link to course
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

    // 2. Get all assignments for this course to calculate category totals
    const courseAssignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) }, // ✅ Fixed: Direct link to course
      select: { category: true, weight: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach((a: any) => {
      const cat = a.category;
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(a.weight);
    });

    // 3. Group by CLO Code
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
            assignmentWeight: row.assignment.weight, // ✅ จาก assignment
            weight: mapping.weight, // ✅ จาก mapping
          });
        });
        return acc;
      },
      {}
    );

    // 4. Calculate Scores
    const cloScores = Object.entries(cloGroups).map(
      ([cloCode, assignments]) => {
        let cloTotal = 0;

        const byCategory = assignments.reduce(
          (acc: Record<string, any[]>, row) => {
            (acc[row.category] ??= []).push(row);
            return acc;
          },
          {}
        );

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxWeightForCategory = categoryTotals[category] ?? 0;

          const totalWeightForCategory = group.reduce(
            (sum, r) => sum + (Number(r.score) / (Number(r.maxScore) / Number(r.assignmentWeight))),
            0
          );

          if (totalMaxWeightForCategory <= 0) return;

          group.forEach((row) => {
            const realScore = Number(row.score) / (Number(row.maxScore) / Number(row.assignmentWeight));
            const normalized = totalWeightForCategory / totalMaxWeightForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += realScore * weighted;
          });
        });

        return { cloCode, cloScore: cloTotal };
      }
    );

    return { cloScores };
  });

  return resultCloStudent;
}

/*
/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const resultCloStudent = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentClo = await tx.studentScore.findMany({
      where: {
        student_id: Number(studentId),
        assignment: {
          course_id: Number(courseId), // ✅ Fixed: Direct link to course
        },
      },
      select: {
        student_id: true,
        score: true,
        assignment_id: true,
        assignment: {
          select: {
            maxScore: true,
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

    // 2. Get all assignments for this course to calculate category totals
    const courseAssignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) }, // ✅ Fixed: Direct link to course
      select: { category: true, maxScore: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach((a: any) => {
      const cat = a.category;
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(a.maxScore);
    });

    // 3. Group by CLO Code
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
            weight: mapping.weight,
          });
        });
        return acc;
      },
      {}
    );

    // 4. Calculate Scores
    const cloScores = Object.entries(cloGroups).map(
      ([cloCode, assignments]) => {
        let cloTotal = 0;

        const byCategory = assignments.reduce(
          (acc: Record<string, any[]>, row) => {
            (acc[row.category] ??= []).push(row);
            return acc;
          },
          {}
        );

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxScoreForCategory = categoryTotals[category] ?? 0;

          const totalScoreForCategory = group.reduce(
            (sum, r) => sum + Number(r.score),
            0
          );

          if (totalMaxScoreForCategory <= 0) return;

          group.forEach((row) => {
            const normalized = totalScoreForCategory / totalMaxScoreForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += Number(row.score) * weighted;
          });
        });

        return { cloCode, cloScore: cloTotal };
      }
    );

    return { cloScores };
  });

  return resultCloStudent;
}
  */

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ใน 1 course (รวมคะแนนของนักศึกษาทุกคนใน course)
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักเรียน + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: {
        assignment: {
          course_id: Number(courseId), // ✅ Fixed
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

    // 2) รวม maxScore ของทุก assignment ตาม category
    const courseAssignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) }, // ✅ Fixed
      select: { category: true, weight: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach((a: any) => {
      categoryTotals[a.category] =
        (categoryTotals[a.category] ?? 0) + Number(a.weight);
    });

    // 3) Group ตาม student
    const studentGroups = studentClo.reduce(
      (acc: Record<number, any[]>, row: any) => {
        if (!acc[row.student_id]) acc[row.student_id] = [];
        acc[row.student_id].push(row);
        return acc;
      },
      {}
    );

    // 4) คำนวณ CLO ของแต่ละ student
    const studentResults = Object.entries(studentGroups).map(
      ([studentId, rows]) => {
        const cloGroups = rows.reduce(
          (acc: Record<string, any[]>, row: any) => {
            row.assignment.assignment_clo_mappings.forEach((mapping: any) => {
              const cloCode = mapping.clo.code;
              if (!acc[cloCode]) acc[cloCode] = [];
              acc[cloCode].push({
                score: row.score,
                category: row.assignment.category,
                maxScore: row.assignment.maxScore,
                assignmentWeight: row.assignment.weight,
                weight: mapping.weight,
              });
            });
            return acc;
          },
          {}
        );

        const cloScores = Object.entries(cloGroups).map(
          ([cloCode, assignments]) => {
            let cloTotal = 0;
            let cloMaxPossible = 0;

            const byCategory = assignments.reduce(
              (acc: Record<string, any[]>, row: any) => {
                (acc[row.category] ??= []).push(row);
                return acc;
              },
              {}
            );

            Object.entries(byCategory).forEach(([category, group]) => {
              const totalMaxWeightForCategory = categoryTotals[category] ?? 0;
              const totalWeightForCategory = group.reduce(
                (sum, r) => sum + (Number(r.score) / (Number(r.maxScore) / Number(r.assignmentWeight))),
                0
              );

              if (totalMaxWeightForCategory <= 0) return;

              group.forEach((row) => {
                const realScore = Number(row.score) / (Number(row.maxScore) / Number(row.assignmentWeight));
                const normalized =
                  totalWeightForCategory / totalMaxWeightForCategory;
                const weighted = (Number(row.weight) / 100) * normalized;
                cloTotal += realScore * weighted;

                const weightedMax = (Number(row.weight) / 100) * 1;
                cloMaxPossible += Number(row.assignmentWeight) * weightedMax;
              });
            });

            return { cloCode, cloScore: cloTotal, cloMaxPossible };
          }
        );

        return { student_id: Number(studentId), cloScores };
      }
    );

    // 5) รวม CLO ของทุก student
    const totalCloScores: Record<string, number> = {};
    const totalCloMaxPossible: Record<string, number> = {};
    studentResults.forEach((student) => {
      student.cloScores.forEach(({ cloCode, cloScore, cloMaxPossible }) => {
        totalCloScores[cloCode] = (totalCloScores[cloCode] ?? 0) + cloScore;
        totalCloMaxPossible[cloCode] =
          (totalCloMaxPossible[cloCode] ?? 0) + cloMaxPossible;
      });
    });

    // 6) คำนวณ maxCloScore และ percentage
    const cloScores = Object.entries(totalCloScores).map(
      ([cloCode, cloScore]) => {
        const maxCloScore = totalCloMaxPossible[cloCode] ?? 0;
        const percentage = maxCloScore > 0 ? (cloScore / maxCloScore) * 100 : 0;

        return { cloCode, cloScore, maxCloScore, percentage };
      }
    );

    return { cloScores };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student แต่ละคน ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getCloScoreAllStudentPerCourse(
  tx: any,
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักศึกษา + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: {
        assignment: {
          course_id: Number(courseId), // ✅ Fixed
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

    // 2) รวม maxScore ต่อ category ของทั้ง course
    const courseAssignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) }, // ✅ Fixed
      select: { category: true, weight: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach((a: any) => {
      const cat = a.category;
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(a.weight);
    });

    // 3) Group ตาม student_id -> cloCode
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
            weight: mapping.weight,
          });
        });
        return acc;
      },
      {}
    );

    // 4) คำนวณ cloScore ต่อ student ต่อ clo
    const results: {
      student_id: number;
      cloScores: { cloCode: string; cloScore: number }[];
    }[] = [];

    Object.entries(studentGroups).forEach(([student_id, cloMap]) => {
      const cloScores: { cloCode: string; cloScore: number }[] = [];

      Object.entries(cloMap).forEach(([cloCode, assignments]) => {
        let cloTotal = 0;

        const byCategory = assignments.reduce(
          (acc: Record<string, any[]>, row) => {
            (acc[row.category] ??= []).push(row);
            return acc;
          },
          {}
        );

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxWeightForCategory = categoryTotals[category] ?? 0;
          if (totalMaxWeightForCategory <= 0) return;

          const totalWeightForCategory = group.reduce(
            (sum, r) => sum + (Number(r.score) / (Number(r.maxScore) / Number(r.assignmentWeight))),
            0
          );

          group.forEach((row) => {
            const realScore = Number(row.score) / (Number(row.maxScore) / Number(row.assignmentWeight));
            const normalized = totalWeightForCategory / totalMaxWeightForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += realScore * weighted;
          });
        });

        cloScores.push({ cloCode, cloScore: cloTotal });
      });

      results.push({ student_id: Number(student_id), cloScores });
    });

    return { cloScoresPerStudent: results };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, highestPossible ของ clo แต่ละตัว ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getCloStatsPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // -----------------------------
    // 1) คำนวณ min, max, mean จาก student scores (โค้ดเดิม)
    // -----------------------------
    const perStudent = await getCloScoreAllStudentPerCourse(tx, courseId);
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
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return { cloCode, min, max, mean };
    });

    // -----------------------------
    // 2) เพิ่มการหา highest clo possible จาก assignment weight
    // -----------------------------
    const assignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) },
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

    return { cloStats };
  });

  return result;
}*/

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด + ค่าเฉลี่ย CLO ต่อเกรด + ค่าเฉลี่ยรวม
/////////////////////////////////////////////////////////////////////////
export async function getCloGradeSummaryPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ใช้ผลลัพธ์จากฟังก์ชัน clo เดิม
    const { cloScoresPerStudent } = await getCloScoreAllStudentPerCourse(tx, courseId);

    // 2) ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { course_id: Number(courseId) },
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
      const totalScore = student.cloScores.reduce((sum, c) => sum + c.cloScore, 0);

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

    return gradeSummary;
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของ student 1 คน ใน 1 course แยกตาม category
/////////////////////////////////////////////////////////////////////////
export async function getRealScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentScores = await tx.studentScore.findMany({
      where: {
        student_id: Number(studentId),
        assignment: {
          course_id: Number(courseId),
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
      }
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
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Get Student Scores filtering by Assignment -> Course
    const studentScores = await tx.studentScore.findMany({
      where: {
        assignment: {
          course_id: Number(courseId),
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
    const studentGroups: Record<
      string,
      Record<string, number[]>
    > = {};

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
        }
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
// คำนวณ realScore รวม และเกรดของนักเรียนใน course
/////////////////////////////////////////////////////////////////////////
export async function getTotalScoreAndGradePerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. ใช้ function เดิมเพื่อดึงคะแนนแยกตาม category
    const { categoryScores } = await getRealScorePerStudentPerCourse(
      tx,
      studentId,
      courseId
    );

    // 2. รวมคะแนนทุก category
    const totalScore = categoryScores.reduce(
      (sum, c) => sum + c.realScore,
      0
    );

    // 3. ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { course_id: Number(courseId) },
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
  courseId: number
) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. ใช้ function เดิมเพื่อดึงคะแนนแยกตาม category ของนักเรียนทุกคน
    const { realScoresPerStudent } = await getRealScoreAllStudentPerCourse(
      tx,
      courseId
    );

    // 2. ดึง grade setting ของ course
    const gradeSettings = await tx.gradeSetting.findMany({
      where: { course_id: Number(courseId) },
      orderBy: { score: "desc" }, // เรียงจากคะแนนสูงไปต่ำ
    });

    // 3. รวมคะแนน และหาเกรดของนักเรียนแต่ละคน
    const results = realScoresPerStudent.map((student) => {
      const totalScore = student.categoryScores.reduce(
        (sum, c) => sum + c.realScore,
        0
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
// คำนวณ min, max, mean, highestPossible ของแต่ละ category ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getRealScoreStatsPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // -----------------------------
    // 1) คำนวณ min, max, mean จาก student scores (ใช้ getRealScoreAllStudentPerCourse)
    // -----------------------------
    const perStudent = await getRealScoreAllStudentPerCourse(tx, courseId);
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
        const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        return { category, min, max, mean };
      }
    );

    // -----------------------------
    // 2) หา highestPossible ต่อ category จาก assignment weight
    // -----------------------------
    const assignments = await tx.assignment.findMany({
      where: { course_id: Number(courseId) },
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
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน category ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางเหลืองใน TABEE
/////////////////////////////////////////////////////////////////////////
export async function getGradeSummaryPerCourse(tx: any, courseId: number) {
  const { studentResults } = await getTotalScoreAndGradeAllStudentPerCourse(tx, courseId);

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

  return gradeSummary;
}


/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student 1 คนใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getPloScorePerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const cloResult = await getCloScorePerStudentPerCourse(
    tx,
    studentId,
    courseId
  );

  type CloMapping = {
    clo: { code: any };
    plo: { code: any };
    weight: number;
  };

  const cloMappings: CloMapping[] = await tx.cloPloMapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true } },
      weight: true,
    },
  });

  const ploGroups: Record<string, number> = {};
  cloMappings.forEach((map: CloMapping) => {
    const cloScoreArray = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code)
    );
    if (!cloScoreArray) return;

    const contribution = cloScoreArray.cloScore * (map.weight / 100);
    ploGroups[map.plo.code] = (ploGroups[map.plo.code] ?? 0) + contribution;
  });

  const ploScores = Object.entries(ploGroups).map(([ploCode, ploScore]) => ({
    ploCode,
    ploScore,
  }));

  return { ploScores };
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getPloScorePerCourse(tx: any, courseId: number) {
  const cloResult = await getCloScorePerCourse(tx, courseId);

  type CloMapping = {
    clo: { code: any };
    plo: { code: any };
    weight: number;
  };

  const cloMappings: CloMapping[] = await tx.cloPloMapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true } },
      weight: true,
    },
  });

  const ploGroups: Record<string, { score: number; max: number }> = {};

  cloMappings.forEach((map: CloMapping) => {
    const cloScoreObj = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code)
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
      return { ploCode, ploScore: score, maxPloScore: max, percentage };
    }
  );

  return { ploScores };
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 course
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerCourse(
  tx: any,
  courseId: number
) {
  const students = await tx.studentScore.findMany({
    where: {
      assignment: {
        course_id: Number(courseId), // ✅ Fixed
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
      courseId
    );
    results.push({
      studentId: s.student_id,
      ploScores: ploResult.ploScores,
    });
  }

  return results;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 program
/////////////////////////////////////////////////////////////////////////
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
    }
  );

  return { programPloScores };
}

/////////////////////////////////////////////////////////////
// คำนวณ PLO แต่ละตัว ของ student 1 คน (รวมทุก course ที่เรียน)
/////////////////////////////////////////////////////////////
export async function getPloScorePerStudentFromAllCourse(
  tx: any,
  studentId: number
) {
  // 1) ดึง course ที่นักเรียนเรียนผ่าน assignment
  const courseRefs = await tx.studentScore.findMany({
    where: { student_id: Number(studentId) },
    select: {
      assignment: {
        select: {
          course_id: true, // ✅ Fixed: Removed 'section'
        },
      },
    },
  });

  // Explicitly type 'courseIds' as 'number[]'
  const courseIds: number[] = Array.from(
    new Set(
      courseRefs
        .map((ref: any) => ref.assignment?.course_id) // ✅ Fixed
        .filter((id: any): id is number => typeof id === "number")
    )
  ) as number[];

  const ploGroups: Record<string, number> = {};

  for (const courseId of courseIds) {
    const { ploScores } = await getPloScorePerStudentPerCourse(
      tx,
      studentId,
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
    })
  );

  return { ploScoresAllCourses };
}

/////////////////////////////////////////////////////////////////////////
// หาว่า PLO แต่ละตัวได้คะแนนมาจาก course ไหนบ้าง
/////////////////////////////////////////////////////////////////////////
export async function getPloProgramWhereScoreComeFrom(
  tx: any,
  programId: number
) {
  const courses = await tx.course.findMany({
    where: { program_id: Number(programId) },
    select: { id: true, code: true, name: true },
  });

  const ploGroups: Record<
    string,
    {
      ploCode: string;
      contributions: {
        courseId: number;
        courseCode: string;
        courseName: string;
        ploScore: number;
      }[];
    }
  > = {};

  for (const course of courses) {
    const { ploScores } = await getPloScorePerCourse(tx, course.id);

    ploScores.forEach(({ ploCode, ploScore }) => {
      if (!ploGroups[ploCode]) {
        ploGroups[ploCode] = { ploCode, contributions: [] };
      }
      ploGroups[ploCode].contributions.push({
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        ploScore,
      });
    });
  }

  const programPloScores = Object.values(ploGroups);

  return { programPloScores };
}

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 course
/////////////////////////////////////////////////////////////
export async function getPloStatsPerCourse(tx: any, courseId: number) {
  const students = await tx.studentScore.findMany({
    where: {
      assignment: {
        course_id: Number(courseId), // ✅ Fixed
      },
    },
    select: { student_id: true },
    distinct: ["student_id"],
  });

  const ploScoresByStudent: Record<string, number[]> = {};

  for (const s of students) {
    const { ploScores } = await getPloScorePerStudentPerCourse(
      tx,
      s.student_id,
      courseId
    );

    ploScores.forEach(({ ploCode, ploScore }) => {
      if (!ploScoresByStudent[ploCode]) {
        ploScoresByStudent[ploCode] = [];
      }
      ploScoresByStudent[ploCode].push(ploScore);
    });
  }

  const ploStats = Object.entries(ploScoresByStudent).map(
    ([ploCode, scores]) => {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return { ploCode, min, max, mean };
    }
  );

  return { ploStats };
}

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 program
/////////////////////////////////////////////////////////////
export async function getPloStatsPerProgram(tx: any, programId: number) {
  const students = await tx.student.findMany({
    select: { id: true },
    where: { program_id: programId },
  });

  const ploBuckets: Record<string, number[]> = {};

  for (const { id: studentId } of students) {
    const { ploScoresAllCourses } = await getPloScorePerStudentFromAllCourse(
      tx,
      studentId
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

//-------------------------------------------------------------------------
// Best/Worst Helpers (These remain mostly logic-only, assuming data is fetched correctly)
//-------------------------------------------------------------------------

export async function getCloBestWorstPerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const resultCloStudent = await getCloScorePerStudentPerCourse(
    tx,
    studentId,
    courseId
  );
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.cloScore);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore > prev.cloScore ? curr : prev
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore < prev.cloScore ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getCloBestWorstPerCourse(tx: any, courseId: number) {
  const resultCloStudent = await getCloScorePerCourse(tx, courseId);
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.cloScore);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore > prev.cloScore ? curr : prev
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.cloScore < prev.cloScore ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getCloBestWorstPerCoursePercentage(
  tx: any,
  courseId: number
) {
  const resultCloStudent = await getCloScorePerCourse(tx, courseId);
  if (resultCloStudent.cloScores.length === 0) return {};

  const scores = resultCloStudent.cloScores.map((c) => c.percentage);
  const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.percentage > prev.percentage ? curr : prev
  );
  const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
    curr.percentage < prev.percentage ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getPloBestWorstPerStudentPerCourse(
  tx: any,
  studentId: number,
  courseId: number
) {
  const resultPloStudent = await getPloScorePerStudentPerCourse(
    tx,
    studentId,
    courseId
  );
  if (resultPloStudent.ploScores.length === 0) return {};

  const scores = resultPloStudent.ploScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev
  );
  const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getPloBestWorstPerCourse(tx: any, courseId: number) {
  const resultPloStudent = await getPloScorePerCourse(tx, courseId);
  if (resultPloStudent.ploScores.length === 0) return {};

  const scores = resultPloStudent.ploScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev
  );
  const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}

export async function getPloBestWorstPerProgram(tx: any, programId: number) {
  const resultPloStudent = await getPloScorePerProgram(tx, programId);
  if (resultPloStudent.programPloScores.length === 0) return {};

  const scores = resultPloStudent.programPloScores.map((c) => c.ploScore);
  const maxClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
    curr.ploScore > prev.ploScore ? curr : prev
  );
  const minClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
    curr.ploScore < prev.ploScore ? curr : prev
  );
  const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  return { minClo, maxClo, meanClo };
}
