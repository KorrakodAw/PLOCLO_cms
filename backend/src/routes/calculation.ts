import { Router } from "express";
//import { pool } from "../db";
import { authenticateToken } from "../middleware/authMiddleware";
import { PrismaClient } from "@prisma/client";

import {
  getCloScorePerStudentPerCourse,
  getCloScorePerCourse,
  getCloScoreAllStudentPerCourse,
  getCloPercentageAllStudentPerCourse,
  getCloStatsPerCourse,
  getCloStatsPercentagePerCourse,
  getCloGradeSummaryPerCourse,
  getRealScorePerStudentPerCourse,
  getRealScoreAllStudentPerCourse,
  getRealScorePercentageAllStudentPerCourse,
  getTotalScoreAndGradePerStudentPerCourse,
  getTotalScoreAndGradeAllStudentPerCourse,
  getRealScoreStatsPerCourse,
  getRealScoreStatsPercentagePerCourse,
  getGradeSummaryPerCourse,
  getPloScorePerStudentPerCourse,
  //getPloScorePerCourse,
  getPloScoreAllStudentPerCourse,
  getPloPercentageAllStudentPerCourse,
  //getPloScorePerProgram,
  //getPloScorePerStudentFromAllCourse,
  //getPloProgramWhereScoreComeFrom,
  getPloScoreAllStudentPerSemester,
  getPloScoreAllStudentPerSemesterPercentage,
  getPloScoreAllStudentPerYear,
  getPloScoreAllStudentPerYearPercentage,
  getPloStatsPerCourse,
  getPloStatsPercentagePerCourse,
  getPloStatsPerSemester,
  getPloStatsPerSemesterPercentage,
  getPloStatsPerYear,
  getPloStatsPerYearPercentage,
  //getPloStatsPerProgram,
  getCloBestWorstPerStudentPerCourse,
  getCloBestWorstPerCourse,
  getCloBestWorstPerCoursePercentage,
  //getPloBestWorstPerStudentPerCourse,
  //getPloBestWorstPerCourse,
  //getPloBestWorstPerProgram,
} from "../service/calculation.service";

const prisma = new PrismaClient();
const router = Router();

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
// น่าจะได้ใช้
//---------------------------------------------------------------------------------------------------------------------------------------------------------------

// CLO
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student 1 คน ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/studentCourse?studentId=ไอดีนักศึกษา&CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/studentCourse", authenticateToken, async (req, res) => {
  const { studentId, CsemesterId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getCloScorePerStudentPerCourse(
        tx,
        Number(studentId),
        Number(CsemesterId),
      );
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ใน 1 course (รวมคะแนนของนักศึกษาทุกคนใน course)
// GET http://localhost:9771/api/calculation/ass-clo/course?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    // TRANSACTION
    const resultCloCourse = await prisma.$transaction(async (tx) => {
      return await getCloScorePerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloCourse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo แต่ละตัว ของ student แต่ละคน ใน 1 course (ส่งกลับค่า clo ของนักเรียนแต่ละคนทุกคนทีเดียว)
// GET http://localhost:9771/api/calculation/ass-clo/allStudentCourse?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/allStudentCourse", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloScoreAllStudentPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ clo ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/ass-clo/allStudentCourse/percentage?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloPercentageAllStudentPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของ clo แต่ละตัว ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/course/stats?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course/stats", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloStatsPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// แปลง cloStats ให้เป็นเปอร์เซ็นต์
// GET http://localhost:9771/api/calculation/ass-clo/course/stats/percentage?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/course/stats/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloStatsPercentagePerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน clo ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางฟ้าใน TABEE
// GET http://localhost:9771/api/calculation/ass-clo/gradeSummary?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/ass-clo/gradeSummary", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getCloGradeSummaryPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// realScore
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณคะแนนรวม และเกรดของ 1 นักเรียนใน 1 course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/studentCourse?studentId=ไอดีนักศึกษา&CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/studentCourse",
  authenticateToken,
  async (req, res) => {
    const { studentId, CsemesterId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getTotalScoreAndGradePerStudentPerCourse(
          tx,
          Number(studentId),
          Number(CsemesterId),
        );
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// คำนวณคะแนนรวม และเกรดของนักเรียนทุกคนใน 1 course และ mean ของทั้ง course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/allStudentCourse?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/allStudentCourse",
  authenticateToken,
  async (req, res) => {
    const { CsemesterId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getTotalScoreAndGradeAllStudentPerCourse(
          tx,
          Number(CsemesterId),
        );
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

/////////////////////////////////////////////////////////////////////////
// คำนวณ realScore ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/realScoreAndGrade/allStudentCourse/percentage?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScorePercentageAllStudentPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ min, max, mean, median, highestPossible ของแต่ละ category ใน 1 course
// GET http://localhost:9771/api/calculation/realScoreAndGrade/stats?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/stats", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScoreStatsPerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// แปลง realScoreStats ให้เป็นเปอร์เซ็นต์
// GET http://localhost:9771/api/calculation/realScoreAndGrade/stats/percentage?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/realScoreAndGrade/stats/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId } = req.query;
  try {
    const resultCloPerStudent = await prisma.$transaction(async (tx) => {
      return await getRealScoreStatsPercentagePerCourse(tx, Number(CsemesterId));
    });

    res.json(resultCloPerStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// สรุปจำนวน student ต่อเกรด, ค่าเฉลี่ยคะแนน category ต่อเกรด, ผลรวมของค่าเฉลี่ย
// ตารางเหลืองใน TABEE
// GET http://localhost:9771/api/calculation/realScoreAndGrade/gradSummary?CsemesterId=ไอดีเทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get(
  "/realScoreAndGrade/gradSummary",
  authenticateToken,
  async (req, res) => {
    const { CsemesterId } = req.query;
    try {
      const resultCloPerStudent = await prisma.$transaction(async (tx) => {
        return await getGradeSummaryPerCourse(tx, Number(CsemesterId));
      });

      res.json(resultCloPerStudent);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

// PLO
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student 1 คนใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/studentCourse?studentId=ไอดีนักศึกษา&CsemesterId=ไอดีเทอม&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCourse", authenticateToken, async (req, res) => {
  const { studentId, CsemesterId, courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScorePerStudentPerCourse(
        tx,
        Number(studentId),
        Number(CsemesterId),
        Number(courseId)
      );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
    //res.status(500).json({ message: "Internal Server Error" });
  }
});

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
// คำนวณ plo ของ student ทุกคนใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/allStudentCourse?CsemesterId=ไอดีเทอม&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentCourse", authenticateToken, async (req, res) => {
  const { CsemesterId, courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerCourse(tx, Number(CsemesterId), Number(courseId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
    //res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ PLO ของนักเรียนแต่ละคนออกมาเป็น percentage
// GET http://localhost:9771/api/calculation/clo-plo/allStudentCourse/percentage?CsemesterId=ไอดีเทอม&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentCourse/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId, courseId } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloPercentageAllStudentPerCourse(tx, Number(CsemesterId), Number(courseId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 semester (รวมทุก course ที่เรียนในเทอมนั้น)
// GET http://localhost:9771/api/calculation/clo-plo/allStudentSemester?programId=ไอดีหลักสูตร&year=ปีการศึกษา&semester=เทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentSemester", authenticateToken, async (req, res) => {
  const { programId, semester, year } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerSemester(tx, Number(programId), Number(year),Number(semester) );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 semester (รวมทุก course ที่เรียนในเทอมนั้น) แบบ percentage เทียบกับ highestPossible ของแต่ละ PLO ในเทอมนี้
// GET http://localhost:9771/api/calculation/clo-plo/allStudentSemester/percentage?programId=ไอดีหลักสูตร&year=ปีการศึกษา&semester=เทอม
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentSemester/percentage", authenticateToken, async (req, res) => {
  const { programId, semester, year } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerSemesterPercentage(tx, Number(programId), Number(year),Number(semester) );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 year (รวมทุก course ที่เรียนในปีการศึกษา)
// GET http://localhost:9771/api/calculation/clo-plo/allStudentYear?programId=ไอดีหลักสูตร&year=ปีการศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentYear", authenticateToken, async (req, res) => {
  const { programId, year } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerYear(tx, Number(programId), Number(year) );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////////////////
// คำนวณ plo ของ student ทุกคนใน 1 year (รวมทุก course ที่เรียนในปีการศึกษา) แบบ percentage เทียบกับ highestPossible ของแต่ละ PLO ในปีการศึกษานั้น
// GET http://localhost:9771/api/calculation/clo-plo/allStudentYear/percentage?programId=ไอดีหลักสูตร&year=ปีการศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
router.get("/clo-plo/allStudentYear/percentage", authenticateToken, async (req, res) => {
  const { programId, year } = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getPloScoreAllStudentPerYearPercentage(tx, Number(programId), Number(year) );
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    //res.status(500).json({ err });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

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
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 course
// GET http://localhost:9771/api/calculation/clo-plo/course/stats?CsemesterId=ไอดีเทอม&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/course/stats", authenticateToken, async (req, res) => {
  const { CsemesterId, courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerCourse(tx, Number(CsemesterId), Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// แปลง ploStats ให้เป็นเปอร์เซ็นต์ 
// GET http://localhost:9771/api/calculation/clo-plo/course/stats/percentage?CsemesterId=ไอดีเทอม&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/course/stats/percentage", authenticateToken, async (req, res) => {
  const { CsemesterId, courseId } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPercentagePerCourse(tx, Number(CsemesterId), Number(courseId));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 semester (รวมทุก course ที่เรียนในเทอมนั้น)
// GET http://localhost:9771/api/calculation/clo-plo/semester/stats?programId=ไอดีหลักสูตร&year=ปีการศึกษา&semester=เทอม
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/semester/stats", authenticateToken, async (req, res) => {
  const { programId, year, semester  } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerSemester(tx, Number(programId), Number(year), Number(semester));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// getPloStatsPerSemester แบบแปลงเป็นเปอร์เซ็นต์ โดยที่ highestPossible = 100%
// GET http://localhost:9771/api/calculation/clo-plo/semester/stats/percentage?programId=ไอดีหลักสูตร&year=ปีการศึกษา&semester=เทอม
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/semester/stats/percentage", authenticateToken, async (req, res) => {
  const { programId, year, semester  } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerSemesterPercentage(tx, Number(programId), Number(year), Number(semester));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 year (รวมทุก course ที่เรียนในเทอมนั้น)
// GET http://localhost:9771/api/calculation/clo-plo/year/stats?programId=ไอดีหลักสูตร&year=ปีการศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/year/stats", authenticateToken, async (req, res) => {
  const { programId, year, semester  } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerYear(tx, Number(programId), Number(year));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/////////////////////////////////////////////////////////////
// คำนวณ Min, Max, Mean, Median, highestPossible ของ PLO แต่ละตัว ใน 1 year (รวมทุก course ที่เรียนในเทอมนั้น) แบบ percentage โดยที่ highestPossible = 100%
// GET http://localhost:9771/api/calculation/clo-plo/year/stats/percentage?programId=ไอดีหลักสูตร&year=ปีการศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/year/stats/percentage", authenticateToken, async (req, res) => {
  const { programId, year, semester  } = req.query;
  try {
    const resultCloStudent = await prisma.$transaction(async (tx) => {
      return await getPloStatsPerYearPercentage(tx, Number(programId), Number(year));
    });

    res.json(resultCloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

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

//---------------------------------------------------------------------------------------------------------------------------------------------------------------
// น่าจะไม่ได้ใช้
//---------------------------------------------------------------------------------------------------------------------------------------------------------------

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 student 1 course
// GET http://localhost:9771/api/calculation/ass-clo/studentCourse/bestWorstMean?studentId=ไอดีนักศึกษา&courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
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

/////////////////////////////////////////////////////////////////////////
// หาว่า Min และ Max คือ clo ตัวไหน และ Mean จาก clo ทุกตัวคือเท่าไหร่ ใน 1 course
// GET http://localhost:9771/api/calculation/ass-clo/course/bestWorstMean?courseId=ไอดีวิชา
// Test result: OK
/////////////////////////////////////////////////////////////////////////
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
export default router;
