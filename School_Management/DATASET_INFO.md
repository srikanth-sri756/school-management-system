# School Management System - Dataset Information

## Overview
This document provides detailed information about the sample dataset included in the School Management System.

## Dataset Statistics

### Users
- **Total Users**: 3
  - 1 Administrator
  - 2 Teachers

### Students
- **Total Students**: 20
- **Age Range**: 8-17 years old
- **Gender Distribution**: Mixed (Male/Female)
- **Classes**: Distributed across 5 classes (Class 1-5)

### Classes
- **Total Classes**: 8
  - Class 1 (Section A & B)
  - Class 2 (Section A & B)
  - Class 3 (Section A & B)
  - Class 4 (Section A)
  - Class 5 (Section A)
- **Capacity per Class**: 30 students
- **Each class has**: Assigned teacher

### Subjects
- **Total Subjects**: 10
  1. Mathematics (MATH101)
  2. Science (SCI101)
  3. English (ENG101)
  4. Social Studies (SS101)
  5. Computer Science (CS101)
  6. Physics (PHY101)
  7. Chemistry (CHEM101)
  8. History (HIST101)
  9. Geography (GEO101)
  10. Art (ART101)

### Attendance Records
- **Coverage**: Last 7 days
- **Total Records**: ~140 entries
- **Attendance Rate**: ~90% (realistic simulation)
- **Status Types**: Present, Absent

### Marks/Grades
- **Total Records**: ~300 entries
- **Exam Types**: 
  - Quiz (20 marks)
  - Unit Test (50 marks)
  - Mid-term (100 marks)
- **Performance Range**: 60-95% (realistic grade distribution)
- **Grading Remarks**: Excellent, Good, Needs improvement

## Sample Data Details

### Student Information Includes:
- Student ID (auto-generated: STU001, STU002, etc.)
- Full Name (First & Last)
- Email (auto-generated from name)
- Date of Birth
- Gender
- Class and Section
- Roll Number
- Parent/Guardian Information
  - Parent Name
  - Parent Phone
  - Parent Email
- Address
- Admission Date
- Status (Active/Inactive)

### Sample Students:
1. **John Doe** - Class 1A, Roll 001
2. **Jane Smith** - Class 1A, Roll 002
3. **Michael Johnson** - Class 1A, Roll 003
4. **Emily Williams** - Class 1A, Roll 004
5. **David Brown** - Class 1A, Roll 005
6. **Sarah Davis** - Class 2A, Roll 006
7. **James Miller** - Class 2A, Roll 007
8. **Jessica Wilson** - Class 2A, Roll 008
9. **Daniel Moore** - Class 2A, Roll 009
10. **Ashley Taylor** - Class 2A, Roll 010
11. **Matthew Anderson** - Class 3A, Roll 011
12. **Amanda Thomas** - Class 3A, Roll 012
13. **Joshua Jackson** - Class 3A, Roll 013
14. **Sophia White** - Class 3A, Roll 014
15. **Andrew Harris** - Class 4A, Roll 015
16. **Olivia Martin** - Class 4A, Roll 016
17. **Christopher Thompson** - Class 4A, Roll 017
18. **Emma Garcia** - Class 5A, Roll 018
19. **Ryan Martinez** - Class 5A, Roll 019
20. **Isabella Robinson** - Class 5A, Roll 020

### User Accounts:
1. **Administrator**
   - Email: admin@school.com
   - Password: admin123
   - Role: Admin

2. **Dr. Sarah Johnson**
   - Email: sarah.j@school.com
   - Role: Teacher
   - Subject: Mathematics

3. **Mr. David Wilson**
   - Email: david.w@school.com
   - Role: Teacher
   - Subject: Science

## Data Generation Logic

### Attendance Generation
- Generated for the last 7 days
- 90% attendance rate (10% absence probability)
- Random distribution of absent days
- All students have attendance records

### Marks Generation
- Each student has marks for 5 core subjects
- 3 different exam types per subject
- Total: 15 marks entries per student
- Grade calculation:
  - Obtained marks: 60-95% of maximum
  - Automatic percentage calculation
  - Performance-based remarks

### Realistic Features
- Consistent naming conventions
- Auto-generated email addresses
- Sequential student IDs
- Proper date formatting
- Parent information linked to students
- Complete address information

## Using the Dataset

### Accessing Data
All data is stored in-memory and can be accessed through the application routes:
- `/students` - View all students
- `/attendance` - View attendance records
- `/marks` - View marks records

### Data Persistence
⚠️ **Important**: Current implementation uses in-memory storage
- Data is reset when server restarts
- For production, connect to MongoDB (configuration ready)

### Expanding the Dataset
To add more data, modify `config/dataStore.js`:
1. Add more student entries in the `studentData` array
2. Add more classes in the classes section
3. Add more subjects as needed
4. Attendance and marks are auto-generated based on students

## Performance Metrics

### Dashboard Statistics:
- Total Students: Real-time count
- Active Students: Filtered by status
- Total Classes: Count of all classes
- Today's Attendance: Daily tracking
- Attendance Rate: Calculated from records

### Reports Available:
1. **Student Reports**
   - Individual student profiles
   - Academic history
   - Attendance summary

2. **Attendance Reports**
   - Class-wise attendance
   - Date-wise attendance
   - Student attendance history

3. **Marks Reports**
   - Subject-wise performance
   - Exam-type comparison
   - Student performance trends

## Future Enhancements

### Recommended Dataset Additions:
- [ ] Fee payment records
- [ ] Library book issues
- [ ] Extra-curricular activities
- [ ] Staff information
- [ ] Timetable data
- [ ] Exam schedules
- [ ] Parent meeting records
- [ ] Bus route information
- [ ] Medical records
- [ ] Disciplinary records

### Database Migration:
When ready to move to MongoDB:
1. Uncomment MongoDB URI in `.env`
2. Create Mongoose models (templates ready)
3. Migrate data from in-memory to database
4. Update routes to use database queries

## Contact & Support
For questions about the dataset or to request custom data configurations, please refer to the main README.md file.
