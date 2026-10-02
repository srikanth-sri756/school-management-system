# Teacher Portal - Complete Guide

## Overview
The Teacher Portal is a separate web application within the School Management System that provides teachers with limited, role-specific access to manage their teaching activities.

## Access Instructions

### Login Credentials
- **URL**: http://localhost:3000/login
- **Email**: Use the email address provided when admin created your account
- **Password**: `teacher123` (default password for all teachers)

### How Teachers Get Access
1. School admin adds you as a teacher through the Teachers Management section
2. Admin enables "Create Login Access" when adding your record
3. System automatically creates your login credentials
4. You can now login with your email and the default password

## Features Available to Teachers

Teachers have access to **ONLY** the following features:

### 1. Dashboard (`/teacher/dashboard`)
- View your profile information (name, email, subject, class)
- See quick stats:
  - Your assigned class
  - Total students in your class
  - Number of notes you've created
  - Number of test papers you've created
- Quick action buttons to access all features

### 2. Attendance Management (`/teacher/attendance`)
- Mark daily attendance for students in your assigned class
- Attendance statuses: Present, Absent, Late, Excused
- Add optional remarks for each student
- View attendance history

### 3. Marks Management (`/teacher/marks`)
- Add marks for students in your assigned subject
- Exam types: Unit Test, Mid Term, Final, Assignment, Quiz
- Enter obtained marks and maximum marks
- System automatically calculates:
  - Percentage
  - Grade (A+, A, B+, B, C, D, F)
- View recent marks entries with grades

### 4. Student Remarks (`/teacher/remarks`)
- Add feedback and remarks for students
- Remark types:
  - **Positive**: For achievements, good behavior, improvement
  - **Negative**: For issues that need attention
  - **Neutral**: General observations
- View history of all remarks you've added
- Color-coded display (green for positive, red for negative)

### 5. Educational Notes (`/teacher/notes`)
- Create educational notes for your subject
- Make notes public (visible to students) or private
- Notes are organized by subject and class
- View all your created notes in a grid layout

### 6. Test Papers Management (`/teacher/test-papers`)
- Create and manage test papers
- Information tracked:
  - Test title
  - Test date
  - Maximum marks
  - Description (topics covered, instructions)
  - Optional file URL (for uploaded test papers)
- View all test papers you've created
- Organized by subject and class

## What Teachers CANNOT Access

Teachers do **NOT** have access to:
- ❌ Student Management (add/edit/delete students)
- ❌ Fee Structure Management
- ❌ Teacher Management (add/edit other teachers)
- ❌ System Settings
- ❌ Import/Export Data
- ❌ User Account Management

## Navigation

The Teacher Portal has its own dedicated navigation bar showing only:
- Dashboard
- Attendance
- Marks
- Remarks
- Notes
- Test Papers

## Technical Details

### Routes
All teacher routes are prefixed with `/teacher/`:
- `GET /teacher/dashboard` - Teacher dashboard
- `GET /teacher/attendance` - Attendance marking page
- `POST /teacher/attendance/mark` - Submit attendance
- `GET /teacher/marks` - Marks management page
- `POST /teacher/marks/add` - Add new marks
- `GET /teacher/remarks` - Remarks management page
- `POST /teacher/remarks/add` - Add new remark
- `GET /teacher/notes` - Notes management page
- `POST /teacher/notes/add` - Create new note
- `GET /teacher/test-papers` - Test papers page
- `POST /teacher/test-papers/add` - Create new test paper

### Data Isolation
- Teachers only see data for **their assigned class**
- Teachers only add marks for **their assigned subject**
- All database queries automatically filter by teacher's class and subject
- Teachers cannot access other teachers' data

### Models Used
1. **Teacher** - Teacher profile information
2. **Student** - Student records (read-only access)
3. **Attendance** - Daily attendance records
4. **Mark** - Student marks and grades
5. **Remark** - Student feedback and observations
6. **Note** - Educational notes and materials
7. **TestPaper** - Test paper management
8. **Subject** - Subject information
9. **Class** - Class information

## Design
- Uses modern.css with gradient backgrounds
- Glass morphism cards for content
- Responsive design for mobile and desktop
- Color-coded badges for remark types
- Clean, professional interface

## Security
- Role-based access control (only users with role='teacher' can access)
- Session-based authentication
- Middleware protection on all routes
- Data filtered by teacher's assignments

## Support
For any issues or questions:
1. Contact the school administrator
2. Request password reset if needed
3. Report any technical issues through proper channels

---
**Last Updated**: December 2024
**Version**: 1.0
