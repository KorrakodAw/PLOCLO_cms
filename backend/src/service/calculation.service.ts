import { PrismaClient } from '@prisma/client';
//import { Request, Response } from "express";



const prisma = new PrismaClient();

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course
// GET http://localhost:3001/api/calculation/ass-clo/studentCourse?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerStudentPerCourse(tx: any, studentId: number, courseId: number) {

    //const { studentId, courseId } = req.query;
    // TRANSACTION
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      // 1) ดึงคะแนนนักศึกษา + mapping CLO (เหมือนเดิม)
      const studentClo = await tx.studentScore.findMany({
        where: {
          student_id: Number(studentId),
          course_id: Number(courseId),
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

      // 2) สร้างแผนที่ category totals ของทั้ง course
      // ดึง assignments ทั้งหมดใน course เพื่อรวม maxScore ต่อ category
      const courseAssignments = await tx.assignment.findMany({
        where: { courseId: Number(courseId) },
        select: { category: true, maxScore: true },
      });

      const categoryTotals: Record<string, number> = {};
      courseAssignments.forEach(a => {
        const cat = a.category;
        categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(a.maxScore);
      });

      // 3) Group ตาม clo.code (เหมือนเดิม)
      const cloGroups = studentClo.reduce((acc: Record<string, any[]>, row) => {
        row.assignment.assignment_clo_mappings.forEach((mapping) => {
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
      }, {});

      // 4) ไม่ต้อง sum maxScore ภายใน CLO อีกต่อไป — เราจะใช้ categoryTotals จากทั้ง course
      const cloScores = Object.entries(cloGroups).map(([cloCode, assignments]) => {
        let cloTotal = 0;

        // แยกตาม category แล้วคำนวณด้วย course-level total
        const byCategory = assignments.reduce(
          (acc: Record<string, any[]>, row) => {
            (acc[row.category] ??= []).push(row);
            return acc;
          },
          {}
        );

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxScoreForCategory = categoryTotals[category] ?? 0;

          // รวมคะแนนจริงของนักเรียนใน category นี้
          const totalScoreForCategory = group.reduce(
            (sum, r) => sum + Number(r.score),
            0
          );

          // กัน division by zero: ถ้าไม่มี assignment ใน course category นี้ ให้ข้าม
          if (totalMaxScoreForCategory <= 0) return;

          group.forEach((row) => {
            const normalized = totalScoreForCategory / totalMaxScoreForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += Number(row.score) * weighted;
          });
        });

        return { cloCode, cloScore: cloTotal };
      });

      // ผลลัพธ์
      return {cloScores};

      
    });

    //res.json(resultClo);
    return resultCloStudent;

}

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ใน 1 course (รวมคะแนนของนักศึกษาทุกคนใน course)
// GET http://localhost:3001/api/calculation/ass-clo/course?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloScorePerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักเรียน + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: { course_id: Number(courseId) },
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

    // 2) รวม maxScore ของทุก assignment ตาม category
    const courseAssignments = await tx.assignment.findMany({
      where: { courseId: Number(courseId) },
      select: { category: true, maxScore: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach(a => {
      categoryTotals[a.category] = (categoryTotals[a.category] ?? 0) + Number(a.maxScore);
    });

    // 3) Group ตาม student
    const studentGroups = studentClo.reduce((acc: Record<number, any[]>, row) => {
      if (!acc[row.student_id]) acc[row.student_id] = [];
      acc[row.student_id].push(row);
      return acc;
    }, {});

    // 4) คำนวณ CLO ของแต่ละ student
    const studentResults = Object.entries(studentGroups).map(([studentId, rows]) => {
      const cloGroups = rows.reduce((acc: Record<string, any[]>, row: any) => {
        row.assignment.assCloMappings.forEach((mapping: any) => {
          const cloCode = mapping.clo.code;
          if (!acc[cloCode]) acc[cloCode] = [];
          acc[cloCode].push({
            score: row.score,
            category: row.assignment.category,
            maxScore: row.assignment.maxScore,
            weight: mapping.weight,
          });
        });
        return acc;
      }, {});

      const cloScores = Object.entries(cloGroups).map(([cloCode, assignments]) => {
        let cloTotal = 0;
        let cloMaxPossible = 0;

        const byCategory = assignments.reduce((acc: Record<string, any[]>, row: any) => {
          (acc[row.category] ??= []).push(row);
          return acc;
        }, {});

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxScoreForCategory = categoryTotals[category] ?? 0;
          const totalScoreForCategory = group.reduce((sum, r) => sum + Number(r.score), 0);

          if (totalMaxScoreForCategory <= 0) return;

          group.forEach((row) => {
            const normalized = totalScoreForCategory / totalMaxScoreForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += Number(row.score) * weighted;

            // 👉 เก็บ maxPossible ของ CLO ด้วย
            const weightedMax = (Number(row.weight) / 100) * 1; // normalized max = 1
            cloMaxPossible += Number(row.maxScore) * weightedMax;
          });
        });

        return { cloCode, cloScore: cloTotal, cloMaxPossible };
      });

      return { student_id: Number(studentId), cloScores };
    });

    // 5) รวม CLO ของทุก student
    const totalCloScores: Record<string, number> = {};
    const totalCloMaxPossible: Record<string, number> = {};
    studentResults.forEach(student => {
      student.cloScores.forEach(({ cloCode, cloScore, cloMaxPossible }) => {
        totalCloScores[cloCode] = (totalCloScores[cloCode] ?? 0) + cloScore;
        totalCloMaxPossible[cloCode] = (totalCloMaxPossible[cloCode] ?? 0) + cloMaxPossible;
      });
    });

    // 6) คำนวณ maxCloScore และ percentage
    const cloScores = Object.entries(totalCloScores).map(([cloCode, cloScore]) => {
      const maxCloScore = totalCloMaxPossible[cloCode] ?? 0;
      const percentage = maxCloScore > 0 ? (cloScore / maxCloScore) * 100 : 0;

      return { cloCode, cloScore, maxCloScore, percentage };
    });

    return { cloScores };
  });

  return result;
}


/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student แต่ละคน ใน 1 course (ส่งกลับค่า clo ของนักเรียนแต่ละคนทุกคนทีเดียว)
// GET http://localhost:3001/api/calculation/ass-clo/allStudentCourse?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloScoreAllStudentPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // 1) ดึงคะแนนนักศึกษา + mapping CLO
    const studentClo = await tx.studentScore.findMany({
      where: { course_id: Number(courseId) },
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

    // 2) รวม maxScore ต่อ category ของทั้ง course
    const courseAssignments = await tx.assignment.findMany({
      where: { courseId: Number(courseId) },
      select: { category: true, maxScore: true },
    });

    const categoryTotals: Record<string, number> = {};
    courseAssignments.forEach((a) => {
      const cat = a.category;
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(a.maxScore);
    });

    // 3) Group ตาม student_id -> cloCode
    const studentGroups = studentClo.reduce(
      (acc: Record<string, Record<string, any[]>>, row) => {
        if (!acc[row.student_id]) acc[row.student_id] = {};
        row.assignment.assignment_clo_mappings.forEach((mapping) => {
          const cloCode = mapping.clo.code;
          if (!acc[row.student_id][cloCode]) acc[row.student_id][cloCode] = [];
          acc[row.student_id][cloCode].push({
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

    // 4) คำนวณ cloScore ต่อ student ต่อ clo
    const results: { student_id: number; cloScores: { cloCode: string; cloScore: number }[] }[] = [];

    Object.entries(studentGroups).forEach(([student_id, cloMap]) => {
      const cloScores: { cloCode: string; cloScore: number }[] = [];

      Object.entries(cloMap).forEach(([cloCode, assignments]) => {
        let cloTotal = 0;

        // แยกตาม category
        const byCategory = assignments.reduce(
          (acc: Record<string, any[]>, row) => {
            (acc[row.category] ??= []).push(row);
            return acc;
          },
          {}
        );

        Object.entries(byCategory).forEach(([category, group]) => {
          const totalMaxScoreForCategory = categoryTotals[category] ?? 0;
          if (totalMaxScoreForCategory <= 0) return;

          // รวมคะแนนจริงของนักเรียนใน category นี้
          const totalScoreForCategory = group.reduce(
            (sum, r) => sum + Number(r.score),
            0
          );

          group.forEach((row) => {
            const normalized = totalScoreForCategory / totalMaxScoreForCategory;
            const weighted = (Number(row.weight) / 100) * normalized;
            cloTotal += Number(row.score) * weighted;
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
// คำนวณ min, max, mean ของ clo แต่ละตัว ใน 1 course
// GET http://localhost:3001/api/calculation/ass-clo/course/stats?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloStatsPerCourse(tx: any, courseId: number) {
  const result = await prisma.$transaction(async (tx) => {
    // ใช้ function เดิมเพื่อดึง cloScoresPerStudent
    const perStudent = await getCloScoreAllStudentPerCourse(tx, courseId);

    const cloScoresPerStudent = perStudent.cloScoresPerStudent;

    // Group ตาม cloCode
    const cloGroups: Record<string, number[]> = {};

    cloScoresPerStudent.forEach((student) => {
      student.cloScores.forEach((clo) => {
        if (!cloGroups[clo.cloCode]) cloGroups[clo.cloCode] = [];
        cloGroups[clo.cloCode].push(clo.cloScore);
      });
    });

    // คำนวณ min, max, mean
    const cloStats = Object.entries(cloGroups).map(([cloCode, scores]) => {
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      return { cloCode, min, max, mean };
    });

    return { cloStats };
  });

  return result;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student 1 คนใน 1 course
// GET http://localhost:3001/api/calculation/clo-plo/studentCourse?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloScorePerStudentPerCourse(tx: any, studentId: number, courseId: number) {
  // เรียกใช้ฟังก์ชัน CLO ที่อยู่ในไฟล์เดียวกัน
  const cloResult = await getCloScorePerStudentPerCourse(tx, studentId, courseId);

type CloMapping = {
  clo: { code: any };
  plo: { code: any };
  weight: number;
};

// 2) ดึง mapping CLO → PLO
  const cloMappings: CloMapping[] = await tx.clo_plo_mapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true } },
      weight: true,
    },
  });

  // 3) รวมคะแนนเป็น PLO
  const ploGroups: Record<string, number> = {};
  cloMappings.forEach((map: CloMapping) => {
    const cloScoreArray = cloResult.cloScores.find(c => String(c.cloCode) === String(map.clo.code));
    if (!cloScoreArray) return;

    const contribution = cloScoreArray.cloScore * (map.weight / 100);
    ploGroups[map.plo.code] = (ploGroups[map.plo.code] ?? 0) + contribution;
  });

  // 4) แปลงเป็น array
  const ploScores = Object.entries(ploGroups).map(([ploCode, ploScore]) => ({
    ploCode,
    ploScore,
  }));

  // … logic รวม CLO → PLO ตาม weight …
  return { ploScores }; // [{ ploCode, ploScore }]
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 course
// GET http://localhost:3001/api/calculation/clo-plo/course?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloScorePerCourse(tx: any, courseId: number) {
  // เรียกใช้ฟังก์ชัน CLO ที่อยู่ในไฟล์เดียวกัน
  const cloResult = await getCloScorePerCourse(tx, courseId);

type CloMapping = {
  clo: { code: any };
  plo: { code: any};
  weight: number;
};

// 2) ดึง mapping CLO → PLO
  const cloMappings: CloMapping[] = await tx.clo_plo_mapping.findMany({
    where: { clo: { course_id: Number(courseId) } },
    select: {
      clo: { select: { code: true } },
      plo: { select: { code: true } },
      weight: true,
    },
  });

  // 3) รวมคะแนนเป็น PLO
  const ploGroups: Record<string, { score: number; max: number }> = {};

  cloMappings.forEach((map: CloMapping) => {
    const cloScoreObj = cloResult.cloScores.find(
      (c) => String(c.cloCode) === String(map.clo.code)
    );
    if (!cloScoreObj) return;

    // 👉 คำนวณ contribution ของ CLO ต่อ PLO
    const contributionScore = cloScoreObj.cloScore * (map.weight / 100);
    const contributionMax = cloScoreObj.maxCloScore * (map.weight / 100);

    if (!ploGroups[map.plo.code]) {
      ploGroups[map.plo.code] = { score: 0, max: 0 };
    }

    ploGroups[map.plo.code].score += contributionScore;
    ploGroups[map.plo.code].max += contributionMax;
  });

  // 4) แปลงเป็น array พร้อม percentage
  const ploScores = Object.entries(ploGroups).map(([ploCode, { score, max }]) => {
    const percentage = max > 0 ? (score / max) * 100 : 0;
    return { ploCode, ploScore: score, maxPloScore: max, percentage };
  });

  return { ploScores }; // [{ ploCode, ploScore, maxPloScore, percentage }]

}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 course
// GET http://localhost:3001/api/calculation/clo-plo/allStudentCourse?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloScoreAllStudentPerCourse(tx: any, courseId: number) {
  // 1) ดึง student ทั้งหมดที่ลงทะเบียนใน course นี้
  const students = await tx.student_score.findMany({
    where: { course_id: Number(courseId) },
    distinct: ['student_id'],
    select: { student_id: true },
  });

  // 2) Loop ผ่าน student แต่ละคน แล้วคำนวณ PLO
  const results = [];
  for (const s of students) {
    const ploResult = await getPloScorePerStudentPerCourse(tx, s.student_id, courseId);
    results.push({
      studentId: s.student_id,
      ploScores: ploResult.ploScores, // [{ ploCode, ploScore }]
    });
  }

  // 3) Return เป็น array ของนักเรียนทั้งหมด
  return results;
}

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 program
// GET http://localhost:3001/api/calculation/clo-plo/program?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloScorePerProgram(tx: any, programId: number) {
  // 1) ดึง courses ทั้งหมดใน program
  const courses = await tx.course.findMany({
    where: { program_id: Number(programId) },
    select: { id: true },
  });

  // 2) loop ผ่านทุก course → คำนวณ PLO scores
  const allPloScores: Record<string, { score: number; max: number }> = {};
  //const allPloScores: Record<string, number> = {};

  for (const course of courses) {
    const { ploScores } = await getPloScorePerCourse(tx, course.id);

    // 3) รวมเข้า allPloScores (ทั้ง score และ max)
    ploScores.forEach(({ ploCode, ploScore, maxPloScore }) => {
      if (!allPloScores[ploCode]) {
        allPloScores[ploCode] = { score: 0, max: 0 };
      }
      allPloScores[ploCode].score += ploScore;
      allPloScores[ploCode].max += maxPloScore;
    });
    /*ploScores.forEach(({ ploCode, ploScore }) => {
      allPloScores[ploCode] = (allPloScores[ploCode] ?? 0) + ploScore;
    });*/
  }

   // 4) แปลงเป็น array พร้อม percentage
  const programPloScores = Object.entries(allPloScores).map(
    ([ploCode, { score, max }]) => {
      const percentage = max > 0 ? (score / max) * 100 : 0;
      return { ploCode, ploScore: score, maxPloScore: max, percentage };
    }
  );
  /*const programPloScores = Object.entries(allPloScores).map(
    ([ploCode, ploScore]) => ({
      ploCode,
      ploScore,
    })
  );*/

  return { programPloScores };
}

/////////////////////////////////////////////////////////////
// คำนวณ PLO แต่ละตัว ของ student 1 คน (รวมทุก course ที่เรียน)
// GET http://localhost:3001/api/calculation/clo-plo/studentAllCourse?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
export async function getPloScorePerStudentFromAllCourse(tx: any, studentId: number) {
  // 1) ดึง course ที่นักเรียนเรียน (จาก student_score)
  const courses = await tx.student_score.findMany({
    where: { student_id: studentId },
    select: { course_id: true },
    distinct: ['course_id'],
  });

  const ploGroups: Record<string, number> = {};

  // 2) วนลูปทุก course → ใช้ฟังก์ชันที่คุณเขียนไว้แล้ว
  for (const { course_id } of courses) {
    const { ploScores } = await getPloScorePerStudentPerCourse(tx, studentId, course_id);

    // 3) รวมคะแนน PLO จาก course นี้
    ploScores.forEach(({ ploCode, ploScore }) => {
      ploGroups[ploCode] = (ploGroups[ploCode] ?? 0) + ploScore;
    });
  }

  // 4) แปลงเป็น array [{ ploCode, ploScore }]
  const ploScoresAllCourses = Object.entries(ploGroups).map(([ploCode, ploScore]) => ({
    ploCode,
    ploScore,
  }));

  return { ploScoresAllCourses };
}

/////////////////////////////////////////////////////////////////////////
// หาว่า PLO แต่ละตัวได้คะแนนมาจาก course ไหนบ้าง และ course ละเท่าไหร่
// GET http://localhost:3001/api/calculation/clo-plo/wherePloComeFrom?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloProgramWhereScoreComeFrom(tx: any, programId: number) {

 // 1) ดึง courses ทั้งหมดใน program
  const courses = await tx.course.findMany({
    where: { program_id: Number(programId) },
    select: { id: true, code: true, name: true },
  });

  // 2) เตรียม object สำหรับ group ตาม PLO
  const ploGroups: Record<
    string,
    { ploCode: string; contributions: { courseId: number; courseCode: string; courseName: string; ploScore: number }[] }
  > = {};

  // 3) loop ผ่านทุก course → คำนวณ PLO scores
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

  // 4) แปลงเป็น array
  const programPloScores = Object.values(ploGroups);

  return { programPloScores };

}

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 course
// GET http://localhost:3001/api/calculation/clo-plo/course/stats?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////
export async function getPloStatsPerCourse(tx: any, courseId: number) {
  // 1) ดึงรายชื่อนักศึกษาทั้งหมดใน course
  const students = await tx.student_score.findMany({
    where: { course_id: Number(courseId) },
    select: { student_id: true },
  });

  // 2) เก็บคะแนน PLO ของนักศึกษาแต่ละคน
  const ploScoresByStudent: Record<string, number[]> = {};

  for (const s of students) {
    const { ploScores } = await getPloScorePerStudentPerCourse(tx, s.student_id, courseId);

    ploScores.forEach(({ ploCode, ploScore }) => {
      if (!ploScoresByStudent[ploCode]) {
        ploScoresByStudent[ploCode] = [];
      }
      ploScoresByStudent[ploCode].push(ploScore);
    });
  }

  // 3) คำนวณ min, max, mean ของแต่ละ PLO
  const ploStats = Object.entries(ploScoresByStudent).map(([ploCode, scores]) => {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return { ploCode, min, max, mean };
  });

  return { ploStats }; 
  // [{ ploCode, min, max, mean }]
}

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 program
// GET http://localhost:3001/api/calculation/clo-plo/program/stats?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////
export async function getPloStatsPerProgram(tx: any, programId: number) {
  // 1) ดึง student ทั้งหมดใน program
  const students = await tx.student.findMany({
    select: { id: true },
    where: { program_id: programId } // สมมติว่าตาราง student มี id
  });

  // 2) เก็บผลลัพธ์ PLO ของนักเรียนแต่ละคน
  const ploBuckets: Record<string, number[]> = {};

  for (const { id: studentId } of students) {
    const { ploScoresAllCourses } = await getPloScorePerStudentFromAllCourse(tx, studentId);

    ploScoresAllCourses.forEach(({ ploCode, ploScore }) => {
      if (!ploBuckets[ploCode]) {
        ploBuckets[ploCode] = [];
      }
      ploBuckets[ploCode].push(ploScore);
    });
  }

  // 3) คำนวณ min, max, mean ของแต่ละ PLO
  const ploStats = Object.entries(ploBuckets).map(([ploCode, scores]) => {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return { ploCode, min, max, mean };
  });

  return { ploStats };
}

//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:3001/api/calculation/ass-clo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloBestWorstPerStudentPerCourse(tx: any, studentId: number, courseId: number) {

    const resultCloStudent = await getCloScorePerStudentPerCourse(tx, studentId, courseId);
        //คำนวณ min, max, mean
      const scores = resultCloStudent.cloScores.map(c => c.cloScore);
      const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.cloScore > prev.cloScore ? curr : prev
      );
      const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.cloScore < prev.cloScore ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:3001/api/calculation/ass-clo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloBestWorstPerCourse(tx: any, courseId: number) {

    const resultCloStudent = await getCloScorePerCourse(tx, courseId);
        //คำนวณ min, max, mean
      const scores = resultCloStudent.cloScores.map(c => c.cloScore);
      const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.cloScore > prev.cloScore ? curr : prev
      );
      const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.cloScore < prev.cloScore ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course แบบ percentage
// GET http://localhost:3001/api/calculation/ass-clo/course/bestWorstMean/percentage?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getCloBestWorstPerCoursePercentage(tx: any, courseId: number) {

    const resultCloStudent = await getCloScorePerCourse(tx, courseId);
        //คำนวณ min, max, mean
      const scores = resultCloStudent.cloScores.map(c => c.percentage);
      const maxClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.percentage > prev.percentage ? curr : prev
      );
      const minClo = resultCloStudent.cloScores.reduce((prev, curr) =>
        curr.percentage < prev.percentage ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ plo ตัวไหน และ Mean จาก plo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:3001/api/calculation/clo-plo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloBestWorstPerStudentPerCourse(tx: any, studentId: number, courseId: number) {

    const resultPloStudent = await getPloScorePerStudentPerCourse(tx, studentId, courseId);
        //คำนวณ min, max, mean
      const scores = resultPloStudent.ploScores.map(c => c.ploScore);
      const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
        curr.ploScore > prev.ploScore ? curr : prev
      );
      const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
        curr.ploScore < prev.ploScore ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:3001/api/calculation/clo-plo/course/min-max-mean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloBestWorstPerCourse(tx: any, courseId: number) {

    const resultPloStudent = await getPloScorePerCourse(tx, courseId);
        //คำนวณ min, max, mean
      const scores = resultPloStudent.ploScores.map(c => c.ploScore);
      const maxClo = resultPloStudent.ploScores.reduce((prev, curr) =>
        curr.ploScore > prev.ploScore ? curr : prev
      );
      const minClo = resultPloStudent.ploScores.reduce((prev, curr) =>
        curr.ploScore < prev.ploScore ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 program
// GET http://localhost:3001/api/calculation/clo-plo/program/bestWorstMean?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////////////////
export async function getPloBestWorstPerProgram(tx: any, programId: number) {

    const resultPloStudent = await getPloScorePerProgram(tx, programId);
        //คำนวณ min, max, mean
      const scores = resultPloStudent.programPloScores.map(c => c.ploScore);
      const maxClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
        curr.ploScore > prev.ploScore ? curr : prev
      );
      const minClo = resultPloStudent.programPloScores.reduce((prev, curr) =>
        curr.ploScore < prev.ploScore ? curr : prev
      );
      const meanClo = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      // รวมผลลัพธ์
      return {
        minClo,   // { cloCode, cloScore }
        maxClo,   // { cloCode, cloScore }
        meanClo   // number
      }

}
