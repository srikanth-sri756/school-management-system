# ⚡ Quick Start with MongoDB

## 🎯 What Changed?

The application now uses **MongoDB** for data storage instead of in-memory storage. This means:
- ✅ Data persists even after server restart
- ✅ Better performance for large datasets
- ✅ Professional database management
- ✅ Easy data import/export

## 📥 Install MongoDB (Windows)

### Option 1: Download Installer (Recommended)

1. **Download MongoDB Community Server**:
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows x64
   - Click "Download"

2. **Run the Installer**:
   - Double-click the downloaded `.msi` file
   - Choose "Complete" installation
   - ✅ Check "Install MongoDB as a Service"
   - ✅ Check "Run service as Network Service user"
   - Click "Install"

3. **Verify Installation**:
   ```powershell
   # Check if MongoDB service is running
   net start | findstr MongoDB
   ```

### Option 2: Quick Install with Chocolatey

If you have Chocolatey installed:
```powershell
choco install mongodb
```

## 🚀 Initialize the Database

Once MongoDB is installed, run:

```bash
npm run init-db
```

This creates:
- ✅ Admin user (admin@school.com / admin123)
- ✅ Default classes (Class 1-5)
- ✅ Default subjects (Math, Science, etc.)

## ▶️ Start the Application

```bash
npm start
```

Visit: **http://localhost:3000**

Login: **admin@school.com** / **admin123**

## 📊 Import Your School Data

### Method 1: Admin Import Page (Easiest)

1. Login to the application
2. Click **"Admin"** in navigation (or visit `/admin/import`)
3. Select data type (students, classes, etc.)
4. Paste your JSON data
5. Click "Import"

### Method 2: Use Sample Data

1. Open `sample-data.json` file
2. Copy the content
3. Go to http://localhost:3000/admin/import
4. Paste and import

## 📝 JSON Data Format Examples

### Import Classes
```json
{
  "classes": [
    { "name": "Class 6", "section": "A", "capacity": 40 },
    { "name": "Class 6", "section": "B", "capacity": 40 }
  ]
}
```

### Import Subjects
```json
{
  "subjects": [
    { "name": "Biology", "code": "BIO101" },
    { "name": "Chemistry", "code": "CHEM101" }
  ]
}
```

### Import Students (Step-by-Step)

**Step 1**: Get Class IDs

After importing classes, you need their ObjectIds. You have two options:

**Option A**: Check in MongoDB Compass (if installed)
- Open MongoDB Compass
- Connect to `mongodb://127.0.0.1:27017`
- Browse to `school_management` → `classes`
- Copy the `_id` values

**Option B**: Use the application
- Add one student manually through the UI
- Note the class dropdown values in browser DevTools

**Step 2**: Import Students with Class IDs

```json
{
  "students": [
    {
      "studentId": "STU001",
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice.j@example.com",
      "dateOfBirth": "2008-03-15",
      "gender": "Female",
      "class": "PUT_CLASS_OBJECTID_HERE",
      "rollNumber": "001",
      "parentName": "Robert Johnson",
      "parentPhone": "1234567890",
      "parentEmail": "robert.j@example.com",
      "address": "123 Main Street",
      "admissionDate": "2023-04-01"
    }
  ]
}
```

Replace `PUT_CLASS_OBJECTID_HERE` with actual ObjectId like `"6567abc123def456789"`.

## ❗ Troubleshooting

### MongoDB Not Connecting?

**Check if MongoDB is running**:
```powershell
net start MongoDB
```

**If not running, start it**:
```powershell
net start MongoDB
```

**Still not working?**
- Make sure MongoDB installed correctly
- Check Windows Services (services.msc) for "MongoDB Server"
- Try reinstalling MongoDB as Administrator

### Can't Import Data?

**Error: "Invalid JSON"**
- Validate your JSON at https://jsonlint.com/
- Make sure quotes are correct ("double quotes", not 'single')
- Check for trailing commas

**Error: "Validation failed"**
- Make sure all required fields are present
- Check date formats (YYYY-MM-DD)
- For students, ensure class ObjectIds exist

**Error: "Duplicate key"**
- Student ID, email, or subject code might already exist
- Use unique values for these fields

### Port 3000 Already in Use?

```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill that process (replace PID with actual number)
taskkill /PID 12345 /F
```

Or change port in `.env`:
```
PORT=3001
```

## 🎓 Best Practices

### Import Order
1. ✅ Classes first
2. ✅ Subjects next
3. ✅ Students last (they reference classes)
4. ✅ Then attendance and marks (they reference students)

### Data Backup
```powershell
# Backup database
mongodump --db school_management --out ./backup

# Restore database
mongorestore --db school_management ./backup/school_management
```

## 🔄 Migrating from Old Version?

If you were using the in-memory version:
1. ✅ Install MongoDB
2. ✅ Run `npm run init-db`
3. ✅ Import your data via `/admin/import`
4. ✅ Done!

## 📚 Need More Help?

- **Detailed Setup**: See [DATABASE_SETUP.md](DATABASE_SETUP.md)
- **MongoDB Docs**: https://docs.mongodb.com/
- **Application Features**: See [FEATURES.md](FEATURES.md)

## ✅ Quick Checklist

- [ ] MongoDB installed and running
- [ ] Ran `npm install`
- [ ] Ran `npm run init-db`
- [ ] Server started with `npm start`
- [ ] Logged in at http://localhost:3000
- [ ] Imported classes and subjects
- [ ] Added students
- [ ] Ready to manage your school!

---

**🎉 That's it! You're ready to use the School Management System with MongoDB!**
