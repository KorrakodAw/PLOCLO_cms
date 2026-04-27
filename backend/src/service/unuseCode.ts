
// CLO
//------------------------------------------------------------------------------------------------------------------------------------------------

/*
export async function getCloStatsPerCourse(tx: any, courseId: number) {
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
}
*/

// realScore
//--------------------------------------------------------------------------------------------------------------------------------------------------------

// PLO
//--------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course?CsemesterId=ไอดีเทอม
// Test result: Cancel
/////////////////////////////////////////////////////////////////////////
/*
router.get("/clo-plo/course", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultPloCourse = await prisma.$transaction(async (tx) => {
      return await getPloScorePerCourse(tx, Number(CsemesterId));
    });

    res.json(resultPloCourse);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program?programId=ไอดีหลักสูตร
// Test result: Cancel
/////////////////////////////////////////////////////////////////////////
/*
router.get("/clo-plo/program", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await getPloScorePerProgram(tx, Number(programId));
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/
/////////////////////////////////////////////////////////////
// คำนวณ PLO แต่ละตัว ของ student 1 คน (รวมทุก course ที่เรียน)
// GET http://localhost:9771/api/calculation/clo-plo/studentAllCourse?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
/*
router.get("/clo-plo/studentAllCourse", authenticateToken, async (req, res) => {
  const { studentId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScorePerStudentFromAllCourse(tx, Number(studentId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/

/////////////////////////////////////////////////////////////////////////
// หาว่า PLO แต่ละตัวได้คะแนนมาจาก course ไหนบ้าง และ course ละเท่าไหร่
// GET http://localhost:9771/api/calculation/clo-plo/wherePloComeFrom?programId=ไอดีหลักสูตร
// Test result: Cancel
/////////////////////////////////////////////////////////////////////////
/*
router.get("/clo-plo/wherePloComeFrom", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const result = await prisma.$transaction(async (tx) => {
      return await getPloProgramWhereScoreComeFrom(tx, Number(programId));
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean ของ PLO แต่ละตัว ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program/stats?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////
/*
router.get("/clo-plo/program/stats", authenticateToken, async (req, res) => {
  const { programId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerProgram(tx, Number(programId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
*/

/*
/////////////////////////////////////////////////////////////
// ดึงผลการเรียน PLO สะสมทั้งหมดของนักเรียนรายบุคคล
// GET http://localhost:9771/api/calculation/clo-plo/studentCumulative?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCumulative", authenticateToken, async (req, res) => {
  const { studentId} = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getStudentPloCumulative(tx, Number(studentId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
  }
});
*/


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

/*
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


//-------------------------------------------------------------------------
// Best/Worst Helpers (These remain mostly logic-only, assuming data is fetched correctly)
//-------------------------------------------------------------------------
/*
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
*/
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

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
// น่าจะไม่ได้ใช้
//---------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:9771/api/calculation/ass-clo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
/*
router.get(
  "/ass-clo/studentCourse/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { studentId, courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getCloBestWorstPerStudentPerCourse(
          tx,
          Number(studentId),
          Number(courseId),
        );
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);
*/
/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
/*
router.get(
  "/ass-clo/course/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getCloBestWorstPerCourse(tx, Number(courseId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);
*/
/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course แบบ percentage
// GET http://localhost:9771/api/calculation/ass-clo/course/bestWorstMean/percentage?courseId=ไอดีวิชา
//
/////////////////////////////////////////////////////////////////////////
/*router.get("/ass-clo/course/bestWorstMean/percentage", authenticateToken, async (req, res) => {
  
  const {courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getCloBestWorstPerCoursePercentage(tx, Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});*/

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ plo ตัวไหน และ Mean จาก plo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:9771/api/calculation/clo-plo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
/*
router.get(
  "/clo-plo/studentCourse/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { studentId, courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerStudentPerCourse(
          tx,
          Number(studentId),
          Number(courseId),
        );
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);
*/

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: Cancel
/////////////////////////////////////////////////////////////////////////
/*
router.get(
  "/clo-plo/course/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerCourse(tx, Number(courseId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);
*/
/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 program
// GET http://localhost:9771/api/calculation/clo-plo/program/bestWorstMean?programId=ไอดีหลักสูตร
// Test result: Cancel
/////////////////////////////////////////////////////////////////////////
/*
router.get(
  "/clo-plo/program/bestWorstMean",
  authenticateToken,
  async (req, res) => {
    const { programId } = req.query;
    try {
      const resultCloStudent = await prisma.$transaction(async (tx) => {
        return await getPloBestWorstPerProgram(tx, Number(programId));
      });

      res.json(resultCloStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);
*/