import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 1. สรุปภาพรวมรายวิชา (รวมทุก Section ในเทอมเดียวกัน)
export const getGradeSummary = async (req: any, res: any) => {
  const { semesterId } = req.query; // 🟢 เปลี่ยนมารับ semesterId (CourseSemester)

  if (!semesterId) {
    return res.status(400).json({ message: "Missing semesterId" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [assignments, gradeSettings, semesterData] = await Promise.all([
        // ดึงงานที่แชร์กันใน Semester นี้
        tx.assignment.findMany({ where: { semester_id: Number(semesterId) } }),
        // ดึงเกณฑ์จาก Course (ผ่าน Semester)
        tx.gradeSetting.findMany({
          where: {
            course: { semesters: { some: { id: Number(semesterId) } } },
          },
          orderBy: { score: "desc" },
        }),
        // ดึงนักเรียนจากทุก Section ใน Semester นี้
        tx.courseSemester.findUnique({
          where: { id: Number(semesterId) },
          include: {
            sections: {
              include: {
                students: {
                  include: {
                    student: {
                      include: {
                        scores: {
                          where: {
                            assignment: { semester_id: Number(semesterId) },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      if (!semesterData) throw new Error("SEMESTER_NOT_FOUND");

      // Calculate Full Scores
      const categoryFullScores: Record<string, number> = {};
      assignments.forEach((assign) => {
        categoryFullScores[assign.category] = Number(
          (
            (categoryFullScores[assign.category] || 0) + Number(assign.weight)
          ).toFixed(4),
        );
      });

      // Flatten students from all sections
      const studentMap = new Map();
      semesterData.sections.forEach((sec) => {
        sec.students.forEach((rec) =>
          studentMap.set(rec.student.id, rec.student),
        );
      });

      const studentSummaries = Array.from(studentMap.values()).map(
        (student) => {
          let totalWeightedScore = 0;
          const categoryEarnedScores: Record<string, number> = {};

          assignments.forEach((assign) => {
            const scoreRec = student.scores.find(
              (s: any) => s.assignment_id === assign.id,
            );
            const raw = scoreRec ? Number(scoreRec.score) : 0;
            const weighted =
              (raw / Number(assign.maxScore)) * Number(assign.weight);

            totalWeightedScore += weighted;
            categoryEarnedScores[assign.category] = Number(
              ((categoryEarnedScores[assign.category] || 0) + weighted).toFixed(
                4,
              ),
            );
          });

          const grade =
            gradeSettings.find((g) => totalWeightedScore >= Number(g.score))
              ?.grade || "F";

          return {
            student_id: student.id,
            student_code: student.student_code,
            first_name: student.first_name,
            last_name: student.last_name,
            categoryEarnedScores,
            totalScore: Number(totalWeightedScore.toFixed(4)),
            grade,
          };
        },
      );

      return { categoryFullScores, students: studentSummaries };
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

// 2. สรุปราย Section (แต่ใช้ Assignment ร่วมกันใน Semester)
export const getSectionGradeSummary = async (req: any, res: any) => {
  const { sectionId } = req.query;

  if (!sectionId) return res.status(400).json({ message: "Missing sectionId" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sectionData = await tx.courseSection.findUnique({
        where: { id: Number(sectionId) },
        include: {
          semester_config: {
            include: {
              assignments: true,
              course: {
                include: { gradeSettings: { orderBy: { score: "desc" } } },
              },
            },
          },
          students: {
            include: {
              student: {
                include: {
                  scores: {
                    where: {
                      assignment: {
                        semester: {
                          sections: { some: { id: Number(sectionId) } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!sectionData) throw new Error("SECTION_NOT_FOUND");

      const assignments = sectionData.semester_config.assignments;
      const gradeSettings = sectionData.semester_config.course.gradeSettings;

      return sectionData.students.map((record) => {
        const student = record.student;
        let totalWeighted = 0;
        const categoryScores: Record<string, number> = {};

        assignments.forEach((assign) => {
          const scoreRec = student.scores.find(
            (s) => s.assignment_id === assign.id,
          );
          const weighted =
            (Number(scoreRec?.score || 0) / Number(assign.maxScore)) *
            Number(assign.weight);

          categoryScores[assign.category] =
            (categoryScores[assign.category] || 0) + weighted;
          totalWeighted += weighted;
        });

        return {
          student_id: student.id,
          student_code: student.student_code,
          first_name: student.first_name,
          last_name: student.last_name,
          categoryScores,
          totalScore: Number(totalWeighted.toFixed(2)),
          grade:
            gradeSettings.find((g) => totalWeighted >= Number(g.score))
              ?.grade || "F",
        };
      });
    });

    return res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. สรุปรายบุคคล
export const getIndividualStudentSummary = async (req: any, res: any) => {
  const { studentId, semesterId } = req.query; // 🟢 ใช้ semesterId

  if (!studentId || !semesterId) {
    return res.status(400).json({ message: "Missing studentId or semesterId" });
  }

  try {
    const [student, assignments, semesterInfo] = await Promise.all([
      prisma.student.findUnique({
        where: { id: Number(studentId) },
        include: {
          scores: {
            where: { assignment: { semester_id: Number(semesterId) } },
            include: { assignment: true },
          },
        },
      }),
      prisma.assignment.findMany({
        where: { semester_id: Number(semesterId) },
      }),
      prisma.courseSemester.findUnique({
        where: { id: Number(semesterId) },
        include: {
          course: {
            include: { gradeSettings: { orderBy: { score: "desc" } } },
          },
        },
      }),
    ]);

    if (!student || !semesterInfo)
      return res.status(404).json({ message: "Data not found" });

    let totalWeighted = 0;
    const categoryBreakdown: Record<
      string,
      { earned: number; possible: number }
    > = {};

    assignments.forEach((assign) => {
      const scoreRec = student.scores.find(
        (s) => s.assignment_id === assign.id,
      );
      const earned =
        (Number(scoreRec?.score || 0) / Number(assign.maxScore)) *
        Number(assign.weight);

      if (!categoryBreakdown[assign.category]) {
        categoryBreakdown[assign.category] = { earned: 0, possible: 0 };
      }
      categoryBreakdown[assign.category].earned += earned;
      categoryBreakdown[assign.category].possible += Number(assign.weight);
      totalWeighted += earned;
    });

    const gradeSettings = semesterInfo.course.gradeSettings;
    const finalGrade =
      gradeSettings.find((g) => totalWeighted >= Number(g.score))?.grade || "F";

    res.json({
      info: {
        id: student.id,
        code: student.student_code,
        name: `${student.first_name} ${student.last_name}`,
      },
      summary: {
        totalScore: Number(totalWeighted.toFixed(2)),
        grade: finalGrade,
      },
      categories: categoryBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
