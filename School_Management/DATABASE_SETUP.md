# Database Setup Guide

## MongoDB Installation & Setup

### Windows Installation

1. **Download MongoDB Community Server**:
   - Visit: https://www.mongodb.com/try/download/community
   - Download the Windows MSI installer
   - Install with default settings

2. **Start MongoDB Service**:
   ```powershell
   # MongoDB should start automatically after installation
   # To verify it's running:
   net start MongoDB
   ```

3. **Verify Installation**:
   ```powershell
   mongosh
   # If successful, you'll see MongoDB shell prompt
   ```

### Initialize the Database

After installing MongoDB, run the initialization script:

```bash
npm run init-db
```

This will create:
- ✅ Admin user (admin@school.com / admin123)
- ✅ Default classes (Class 1-A, 1-B, 2-A, etc.)
- ✅ Default subjects (Math, Science, English, etc.)

## Starting the Application

1. **Make sure MongoDB is running**
2. **Start the server**:
   ```bash
   npm start
   ```
3. **Open browser**: http://localhost:3000
4. **Login**: admin@school.com / admin123

## Importing Data

### Option 1: Using the Admin Import Page

1. Login as admin
2. Go to: http://localhost:3000/admin/import
3. Paste your JSON data
4. Click "Import Data"

### Option 2: Using Sample Data

We provide a `sample-data.json` file with basic setup data:

1. Open `sample-data.json`
2. Copy the entire content
3. Go to http://localhost:3000/admin/import
4. Paste and import

## JSON Data Format

### Import Students
```json
{
  "students": [
    {
      "studentId": "STU0001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "dateOfBirth": "2010-05-15",
      "gender": "Male",
      "class": "CLASS_OBJECT_ID_HERE",
      "rollNumber": "001",
      "parentName": "James Doe",
      "parentPhone": "1234567890",
      "parentEmail": "james.doe@example.com",
      "address": "123 Main St",
      "admissionDate": "2020-04-01"
    }
  ]
}
```

**Important**: Replace `CLASS_OBJECT_ID_HERE` with actual class ObjectId from your database.

To get class IDs:
1. Login to the app
2. Check the browser console or database directly
3. Use the admin import page to first import classes
4. Then import students referencing those class IDs

### Import Classes
```json
{
  "classes": [
    { "name": "Class 1", "section": "A", "capacity": 30 },
    { "name": "Class 1", "section": "B", "capacity": 30 }
  ]
}
```

### Import Subjects
```json
{
  "subjects": [
    { "name": "Mathematics", "code": "MATH101" },
    { "name": "Science", "code": "SCI101" }
  ]
}
```

### Import Users
```json
{
  "users": [
    {
      "name": "John Teacher",
      "email": "john.teacher@school.com",
      "password": "teacher123",
      "role": "teacher"
    }
  ]
}
```

## Database Collections

The system uses the following MongoDB collections:

- **users**: Staff, teachers, and admins
- **students**: Student records
- **classes**: Class and section information
- **subjects**: Subject details
- **attendance**: Daily attendance records
- **marks**: Student examination marks

## Troubleshooting

### MongoDB Connection Failed

**Error**: `Failed to connect to MongoDB`

**Solution**:
1. Check if MongoDB is running:
   ```powershell
   net start MongoDB
   ```
2. Verify connection string in `.env`:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/school_management
   ```

### Cannot Import Data

**Error**: `Import failed: validation error`

**Solution**:
1. Check JSON format is valid
2. Ensure required fields are present
3. For students, make sure class IDs exist first
4. Check the error message for specific field issues

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
1. Change port in `.env`:
   ```
   PORT=3001
   ```
2. Or kill the process using port 3000:
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

## Clearing Data

To clear all data and start fresh:

1. Go to admin dashboard: http://localhost:3000/admin
2. Use the "Clear Data" buttons for specific collections
3. Or clear all data at once
4. Run `npm run init-db` again to reinitialize

## Backup & Restore

### Backup
```bash
mongodump --db school_management --out ./backup
```

### Restore
```bash
mongorestore --db school_management ./backup/school_management
```

## MongoDB GUI Tools (Optional)

For easier database management, consider installing:

- **MongoDB Compass** (Official): https://www.mongodb.com/products/compass
- **Studio 3T**: https://studio3t.com/
- **Robo 3T**: https://robomongo.org/

## Next Steps

1. ✅ Initialize database: `npm run init-db`
2. ✅ Start server: `npm start`
3. ✅ Login: http://localhost:3000
4. ✅ Import your school's data via /admin/import
5. ✅ Begin managing students, attendance, and marks!
