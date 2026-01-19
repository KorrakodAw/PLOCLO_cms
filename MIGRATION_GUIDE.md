# Prisma Schema Migration Guide

## Overview

The Prisma schema has been updated to separate Course (master data) from CourseSection (instances), and StudentScore no longer has a direct course_id reference.

## Changes Made

### 1. Schema Updates (`backend/prisma/schema.prisma`)

- ✅ Fixed datasource name from `postgres` to `db`
- ✅ Split Course into `Course` (master) and `CourseSection` (instances with semester/section/year)
- ✅ Removed `course_id` from `StudentScore` (now navigates via `assignment → section → course`)
- ✅ Changed `Assignment.courseId` to `Assignment.section_id`
- ✅ Changed `GradeSetting.course_id` to `GradeSetting.section_id`
- ✅ Renamed `student_on_course` to `student_on_section`

### 2. Backend Code Updates

#### Routes Updated:

- ✅ `/backend/src/routes/mapping.ts` - Uses assignment→section→course navigation
- ✅ `/backend/src/routes/studentOnCourse.ts` - Now uses `section_id` and `student_on_section` table
- ✅ `/backend/src/routes/assignment.ts` - Uses `section_id` instead of `course_id`
- ✅ `/backend/src/routes/score.ts` - Removed `course_id`, filters by assignment→section
- ✅ `/backend/src/routes/grade.ts` - Uses `section_id` instead of `course_id`

#### Services Updated:

- ✅ `/backend/src/service/calculation.service.ts` - All CLO/PLO calculations updated to filter via `assignment.section.course_id`

### 3. Still Using Old Schema (Needs Manual Migration)

⚠️ **These files still reference the old flat `course` table with section/semester columns:**

- `/backend/src/routes/course.ts` - All routes (GET, POST, PATCH, DELETE)
- Frontend files (entire `frontend/` directory)

## Migration Steps

### Step 1: Backup Your Database

```bash
pg_dump -U your_user -d ploclo_cms > backup_before_migration.sql
```

### Step 2: Regenerate Prisma Client

```bash
cd backend
npx prisma generate
```

### Step 3: Create Migration

```bash
npx prisma migrate dev --name split_course_and_section
```

This will:

1. Create a new `course_section` table
2. Migrate existing course data (splitting master data from instances)
3. Update foreign keys in related tables
4. Drop old columns

### Step 4: Data Migration Strategy

The migration needs to:

1. **Extract master course data** (code, name, program_id) → new `course` table
2. **Create section instances** (course_id, section, semester, year) → new `course_section` table
3. **Update references**:
   - `assignment.course_id` → `assignment.section_id`
   - `grade_setting.course_id` → `grade_setting.section_id`
   - `student_on_course` → `student_on_section` (with `section_id`)
   - `clo.course_id` remains (CLOs belong to master course)

Example SQL for manual migration (if needed):

```sql
-- 1. Create course_section table (Prisma migration handles this)

-- 2. Insert course sections from old course table
INSERT INTO course_section (course_id, section, semester, year)
SELECT
  (SELECT id FROM course WHERE code = old_course.code AND program_id = old_course.program_id LIMIT 1),
  old_course.section,
  old_course.semester,
  EXTRACT(YEAR FROM NOW()) -- Or use a specific year column if you have it
FROM course_old old_course;

-- 3. Update assignment foreign keys
UPDATE assignment a
SET section_id = (
  SELECT cs.id
  FROM course_section cs
  JOIN course c ON cs.course_id = c.id
  WHERE c.id = a.course_id
  LIMIT 1
);

-- 4. Update grade_setting foreign keys
UPDATE grade_setting gs
SET section_id = (
  SELECT cs.id
  FROM course_section cs
  JOIN course c ON cs.course_id = c.id
  WHERE c.id = gs.course_id
  LIMIT 1
);

-- 5. Migrate student_on_course to student_on_section
INSERT INTO student_on_section (student_id, section_id, "assignedAt")
SELECT
  soc.student_id,
  cs.id,
  soc."assignedAt"
FROM student_on_course soc
JOIN course_section cs ON soc.course_id = cs.course_id;
```

### Step 5: Update Course Routes

After migration, update `/backend/src/routes/course.ts` to work with the new schema:

- Separate endpoints for master courses vs. sections
- POST creates both course + section
- GET returns sections with course info joined

### Step 6: Update Frontend

All frontend API calls need updating:

- Change `courseId` to `sectionId` where appropriate
- Update API endpoints to match new route structure
- Update UI to show section selection separately from course

## Testing Checklist

After migration, test:

- [ ] Course/section creation
- [ ] Student enrollment in sections
- [ ] Assignment creation per section
- [ ] Score entry and retrieval
- [ ] Grade settings per section
- [ ] CLO/PLO calculations (should work via new navigation)
- [ ] Mapping tables (CLO-PLO, Assignment-CLO)

## Rollback Plan

If issues occur:

```bash
# Restore from backup
psql -U your_user -d ploclo_cms < backup_before_migration.sql

# Revert Prisma schema
git checkout HEAD~1 backend/prisma/schema.prisma

# Regenerate old client
cd backend && npx prisma generate
```

## Notes

- The Prisma Client will show TypeScript errors until `npx prisma generate` is run
- The new schema enforces proper separation of concerns (master data vs. instances)
- This prevents duplicate course definitions and enables proper section management
- All calculation logic remains intact, just navigates differently through relations

## Support

For issues or questions about this migration, check:

- Prisma Migrate docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Project README: `/README.md`
- Original schema: Check git history for comparison
