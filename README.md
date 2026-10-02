# Akansha Grammar High School: School Management System

A web application for running a school from Nursery to Class 10. It combines the school's public website with three sign-in areas:

| Area | Address | Who uses it |
|---|---|---|
| Public website | `/` | Parents and visitors |
| Admin portal | `/login` | School office (administrators) |
| Teacher portal | `/login` (same page; teachers are sent to `/teacher/dashboard`) | Teachers |
| Student portal | `/student/login` | Students |

It is built with Node.js, Express, EJS templates and MongoDB.

---

## Features

### Admin portal
- **Students**: admissions with class and section, transfer students and their previous school, photos, profiles and Excel export.
- **Admission documents**: Aadhaar card (required), transfer certificate (required for transfers), birth certificate and previous school records. Only administrators can see them.
- **Teachers**: profiles, class and subject assignment, teacher-portal logins, photos, identity documents (Aadhaar and PAN, both required) and salary bank details.
- **Classes**: Nursery, LKG, UKG and Class 1 to Class 10, each with sections A–D. The record for a class and section is created the first time someone is assigned to it.
- **Attendance**: student attendance (Present, Late or Absent) and teacher attendance, with reports. Sundays and declared holidays are blocked.
- **Marks**: marks by subject and exam type, with grades worked out automatically.
- **Fees**: fee records, instalment plans and uploaded receipts, which students can download from their portal.
- **Important dates**: announcements with a date or date range, shown on the website, the student portal and/or the teacher portal. They disappear by themselves after their last day.
- **Holidays**, and **import** of students, teachers, classes and subjects from CSV or Excel files.

### Teacher portal
- A dashboard with the teacher's class, how much of today's attendance is done, recent remarks and upcoming dates.
- Attendance for their own class, which works well on a phone.
- Marks: class teachers can add, edit and delete them; subject teachers can view their subject's marks.
- Remarks about students (Positive, Neutral or Negative).
- Study notes and question papers shared with their class, which students see in their portal.

Every action only works on the teacher's own class, notes and papers.

### Student portal
- A dashboard, attendance, marks and fees (with receipts to download).
- Study notes, question papers and important dates.
- Their profile, including changing their password.

### Public website
- Home, About, Academics, Admissions (fee structure and important dates) and Contact pages.
- Pages for each school stage and programme: Primary (Nursery–Class 5), Middle (Classes 6–8), High School (Classes 9–10), STEM, Sports and Arts.

---

## Tech stack

| Part | Technology |
|---|---|
| Server | Node.js, Express 4 |
| Pages | EJS templates, plain CSS (`public/css`), a small amount of plain JavaScript (`public/js/admin.js`) |
| Database | MongoDB with Mongoose 8 |
| Sign-in | `express-session`, passwords hashed with `bcrypt` |
| File uploads | `multer` |
| Spreadsheets | `exceljs`, `xlsx`, `json2csv` |
| Icons and photos | Lucide icons (`public/images/icons.svg`); website photos are placeholders from Unsplash |

---

## Getting started

### What you need
- [Node.js](https://nodejs.org/) 18 or newer
- [MongoDB](https://www.mongodb.com/try/download/community) 6 or newer, installed on your computer or hosted on MongoDB Atlas

### Setup

```bash
git clone https://github.com/srikanth-sri756/school-management-system.git
cd school-management-system
npm install
cp .env.example .env
```

Open `.env` and set at least these two values:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/school_management
SESSION_SECRET=a-long-random-string
```

If `MONGODB_URI` is left out, the app uses the local address shown above.

Then create the first administrator, the default subjects and a few classes, and start the server:

```bash
npm run init-db
npm start
```

Open **http://localhost:3000**. For development, `npm run dev` restarts the server whenever you save a file.

### First sign-in
- **Administrator:** `npm run init-db` creates `admin@school.com` with the password `admin123`. Change this before going live. There is no screen for changing the admin password yet, so it has to be changed in the database.
- **Teachers:** an administrator gives each teacher a login under **Teachers → Add** or **Edit → Teacher portal access**, and resets forgotten passwords there too.
- **Students:** students sign in with their Student ID and a password. To give every student without a password a default one (their date of birth as `DDMMYYYY`), run:

  ```bash
  node scripts/setStudentPasswords.js
  ```

  Students can then change their password under **Profile**.

---

## Project structure

```
├── server.js              App setup, view helpers, routes
├── init-db.js             Creates the first admin, subjects and classes
├── config/
│   ├── classes.js         School classes (Nursery–Class 10) and sections
│   ├── documents.js       Required student/teacher documents, bank-detail checks
│   ├── dates.js           Date helpers (important dates, attendance days)
│   ├── multer.js          Upload rules (file types, sizes)
│   ├── file-store.js      Saves uploaded files in MongoDB and sends them back
│   └── images.js          Website photos
├── middleware/            Sign-in checks, important-dates loader
├── models/                Mongoose models (Student, Teacher, Class, Attendance, Mark, Fee, …)
├── routes/                One file per area (students, teachers, teacher portal, student portal, …)
├── views/                 EJS pages: portfolio/ (website), students/, teachers/, teacher/, student-portal/, …
├── public/                CSS, JavaScript, icons and images
├── scripts/               One-off maintenance scripts (student passwords, checks)
├── storage/, uploads/     Files uploaded by older versions only (not in git)
```

Two folders aren't part of the running app:
- `School_Management/` is an older copy of the project, kept from the original download.
- `StudentApp/` is an empty Expo (React Native) starter for a future student mobile app. It isn't connected to the server yet.

---

## Where files are stored

All uploaded files are stored in MongoDB itself (GridFS, in the `files.files` and `files.chunks` collections), next to the rest of the data. They survive restarts and redeploys, even on hosts without a permanent disk, and backing up the database backs up the files too.

| Files | Who can open them |
|---|---|
| Aadhaar, PAN, transfer certificates and other documents | Administrators only |
| Student and teacher photos | Staff; a student can also see their own photo |
| Fee receipts | Administrators, and the student the fee belongs to |
| Answer sheets | Staff, and the student the marks belong to |
| Study notes and question papers | The teacher who uploaded them, and students in that class |

Files uploaded by older versions of the app were kept in the `storage/` and `uploads/` folders. They still open, because the app checks those folders when a file isn't in the database. Both folders are in `.gitignore`.

---

## Deploying

This is a Node.js server, so it needs a Node host such as Render, Railway or Heroku. A static host like Netlify won't work. `render.yaml` and `Procfile` are included; see [DEPLOYMENT.md](DEPLOYMENT.md).

Before going live:
- Use a hosted database such as MongoDB Atlas, and set `MONGODB_URI` and a strong `SESSION_SECRET`.
- In MongoDB Atlas, allow access from anywhere (Network Access → `0.0.0.0/0`), because the host's addresses change.
- Serve the site over HTTPS, and change the default admin password.
- Sessions are kept in memory, so everyone is signed out whenever the server restarts. For a busy site, add a session store such as `connect-mongo`.
- Aadhaar, PAN and bank details are sensitive. Ask for masked Aadhaar copies, and limit who has administrator access.

---

## License

`package.json` lists the MIT license, but the repository has no `LICENSE` file yet. Add one before making the repository public.
