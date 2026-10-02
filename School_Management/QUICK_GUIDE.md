# Quick Reference Guide - New Features

## 🎯 For Teachers

### ✏️ Edit Marks
1. Login to Teacher Portal
2. Click **Marks** in navigation
3. Find the mark entry → Click **Edit**
4. Update values → Click **Update Marks**

### 🗑️ Delete Marks
1. Go to **Marks** page
2. Find entry → Click **Delete**
3. Confirm deletion

### 📎 Upload Answer Sheets
**When Adding Marks:**
- Fill in all fields
- Click "Choose File" under "Answer Sheet (Optional)"
- Select PDF/Image (max 5MB)
- Submit

**When Editing:**
- Same process, new file replaces old

### 📥 Export Marks Report
- Go to **Marks** page
- Click **📥 Export to Excel** (top right)
- File downloads: `Marks_Report_[Subject]_DD-MM-YYYY.xlsx`

---

## 🎯 For Admin

### 📥 Export Attendance Report
1. Go to **Attendance → View Report**
2. Click **📥 Export to Excel**
3. File downloads: `Attendance_Report_DD-MM-YYYY.xlsx`

### ✅ What's Fixed
- Student names now show correctly (not "Unknown")
- Dates in Indian format (DD/MM/YYYY)
- Roll numbers visible in reports

---

## 📋 File Upload Guidelines

### ✅ Accepted Formats:
- **Documents**: PDF, DOC, DOCX
- **Images**: JPG, JPEG, PNG
- **Spreadsheets**: XLS, XLSX
- **Text**: TXT

### ⚠️ Restrictions:
- Maximum file size: **5MB**
- One file per mark entry
- Files stored securely on server

### 📂 Viewing Uploaded Files:
- Look for **View** button in marks table
- Click to open in new tab
- Right-click → Save to download

---

## 🗓️ Date Formats

All dates now display in **Indian standard**:
- Format: **DD/MM/YYYY**
- Example: 25/12/2024
- Applies to all reports and exports

---

## 📊 Excel Exports

### What's Included:

**Attendance Export:**
- Date, Student Name, Roll Number, Class, Status
- Blue header, professional formatting
- All records sorted by date

**Marks Export:**
- Roll Number, Student Name, Exam Type
- Marks, Percentage, Grade, Date
- Remarks included
- Subject-specific data only

---

## 🔐 Security Notes

✅ Teachers can only:
- Edit/delete marks for their assigned subject
- View students in their assigned class
- Access their own portal only

✅ Files are:
- Validated for type and size
- Stored securely on server
- Accessible only via direct link

---

## 🆘 Common Issues

**Q: Can't see Edit button?**
A: Ensure you're logged in as a teacher with subject assigned

**Q: File upload fails?**
A: Check file size (max 5MB) and format (PDF, images, docs only)

**Q: Export button not working?**
A: Ensure you have records to export

**Q: Student shows as "Unknown"?**
A: This has been fixed! Refresh the page if you still see it

---

## 📞 Quick Help

**Server Running?**
- URL: http://localhost:3000
- Check console for "School Management System running"

**Need to Restart?**
```powershell
cd d:\School\school-management-system
node server.js
```

**Admin Login:**
- Email: admin@school.com
- Password: admin123

---

## 🎨 Visual Indicators

### Grade Colors:
- 🟢 **Green**: A+, A (Excellent)
- 🔵 **Blue**: B+, B (Good)
- 🟡 **Yellow**: C (Average)
- 🔴 **Red**: D, F (Needs Improvement)

### Status Colors:
- 🟢 **Green**: Present
- 🔴 **Red**: Absent
- 🟡 **Yellow**: Late

---

Made with ❤️ for efficient school management
