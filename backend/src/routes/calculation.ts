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
} from "../service/cloCal";

import {
  //getRealScorePerStudentPerCourse,
  //getRealScoreAllStudentPerCourse,
  getRealScorePercentageAllStudentPerCourse,
  getTotalScoreAndGradePerStudentPerCourse,
  getTotalScoreAndGradeAllStudentPerCourse,
  getRealScoreStatsPerCourse,
  getRealScoreStatsPercentagePerCourse,
  getGradeSummaryPerCourse,
} from "../service/realScore";

import {
  getPloScorePerStudentPerCourse,
  getPloScoreAllStudentPerCourse,
  getPloPercentageAllStudentPerCourse,
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
  getStudentPloDetailedCumulative,
  getStudentPloAchievementSummary,
  getProgramPloDetailedStatistics,
} from "../service/ploCal";


const prisma = new PrismaClient();
const router = Router();

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
// Cumulative PLO Transcript แบบละเอียด
// GET http://localhost:9771/api/calculation/clo-plo/studentCumulative/all?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCumulative/all", authenticateToken, async (req, res) => {
  const { studentId} = req.query;
  try {
    const resultPloStudent = await prisma.$transaction(async (tx) => {
      return await getStudentPloDetailedCumulative(tx, Number(studentId));
    });

    res.json(resultPloStudent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
  }
});

/*
/////////////////////////////////////////////////////////////
// test ค่า
// GET http://localhost:9771/api/calculation/clo-plo/studentCumulative/test?studentId=ไอดีนักศึกษา
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCumulative/test", authenticateToken, async (req, res) => {
  const { studentId} = req.query;
  try {
    const resultPlo = await prisma.$transaction(async (tx) => {
      return await getStudentPloAchievementSummary(tx, Number(studentId));
    });

    res.json(resultPlo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
  }
});
*/

/////////////////////////////////////////////////////////////
// คำนวณค่าสถิติ (Min, Max, Mean, Median) ของแต่ละ PLO ทั้งแบบ Raw และ Percentage ของนักเรียนทุกคนในหลักสูตรเดียวกัน
// GET http://localhost:9771/api/calculation/clo-plo/studentCumulative/stats?programId=ไอดีหลักสูตร
// Test result: OK
/////////////////////////////////////////////////////////////
router.get("/clo-plo/studentCumulative/stats", authenticateToken, async (req, res) => {
  const { programId} = req.query;
  try {
    const resultPlo = await prisma.$transaction(async (tx) => {
      return await getProgramPloDetailedStatistics(tx, Number(programId));
    });

    res.json(resultPlo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ err });
  }
});


export default router;
