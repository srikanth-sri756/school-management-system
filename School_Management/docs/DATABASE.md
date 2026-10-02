# Database (MongoDB) Guide

This project can use MongoDB for persistent storage. The app will connect to the MongoDB instance specified in the `MONGODB_URI` environment variable. If `MONGODB_URI` is not set, it defaults to `mongodb://127.0.0.1:27017/school_management`.

## Quick start (local MongoDB)

1. Install MongoDB Community Server on Windows (or run a Docker container):
   - Download from https://www.mongodb.com/try/download/community
   - Or via Docker: `docker run -d -p 27017:27017 --name mongodb mongo:6.0`.

2. Start the server (if installed locally) using the MongoDB instructions for Windows.

3. Set `MONGODB_URI` in your `.env` file or use the default local URI.

4. Start the app:

```powershell
cd "d:\School\school-management-system"
npm start
```

You should see a message like:

```
Connected to MongoDB: mongodb://127.0.0.1:27017/school_management
School Management System running on http://localhost:3000
```

## Admin Import

A simple admin dataset import UI is available at:

```
http://localhost:3000/admin/import
```

- Login first with an admin account.
- Use `/admin/setup` to create a default admin user from `.env` values:

```
http://localhost:3000/admin/setup
```

- Paste JSON into the import textarea. Top-level keys supported: `classes`, `subjects`, `users`, `students`, `marks`, `attendance`.

## Sample dataset format

See the sample in the import UI or the `views/admin/import.ejs` file. The importer will try to match classes/subjects/students by name/code/ids as best-effort.

## Notes & Next steps

- The importer is best-effort: importing marks/attendance requires matching students and subjects already present in the DB.
- For production use, configure a managed MongoDB Atlas cluster and set `MONGODB_URI` accordingly.
- Consider adding authentication/authorization for admin-only routes and CSRF protection for form submissions.

