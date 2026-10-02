# 🎓 School Management System

A comprehensive, modern web application for managing school operations including student records, attendance, marks, and more. Built with Node.js, Express, and modern UI/UX design principles.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)

## 🌐 Deployment

**Important:** This is a **Node.js backend application** that requires a server environment. 

- ❌ **Cannot deploy to Netlify** (static sites only)
- ✅ **Deploy to Render, Railway, or Heroku** (Node.js hosting)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for complete deployment instructions.

## ✨ Features

### Core Functionality
- **📚 Student Management**: Add, edit, delete, and view comprehensive student records
- **📊 Attendance Tracking**: Mark and monitor daily student attendance with reports
- **📝 Marks Management**: Record and track student marks/grades across multiple subjects
- **🏫 Class Management**: Organize students by classes and sections
- **📈 Dashboard**: Real-time overview of key metrics and statistics
- **🔐 User Authentication**: Secure session-based login system
- **👥 User Roles**: Support for Admin and Teacher roles

### New Features
- **🎨 Modern UI/UX Design**: Beautiful gradient backgrounds, glass morphism effects
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **💾 Rich Sample Dataset**: 20 students, 140+ attendance records, 300+ marks entries
- **🎯 Intuitive Navigation**: Easy-to-use interface with clear visual hierarchy
- **⚡ Fast Performance**: Optimized for speed and efficiency
- **🎭 Interactive Elements**: Smooth animations and hover effects

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. **Clone or navigate to the project directory**:
```bash
cd d:\School\school-management-system
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create environment file** (optional - defaults work fine):
```bash
copy .env.example .env
```

4. **Start the application**:
```bash
npm start
```

5. **Open in browser**:
```
http://localhost:3000
```

6. **Login with default credentials**:
   - Email: `admin@school.com`
   - Password: `admin123`

### Development Mode
For auto-restart during development:
```bash
npm run dev
```

## 📊 Sample Dataset Included

The application comes pre-loaded with realistic sample data:
- **20 Students** across 5 classes
- **8 Classes** (Class 1-5 with sections)
- **10 Subjects** (Math, Science, English, etc.)
- **140+ Attendance Records** (last 7 days)
- **300+ Marks Entries** (Quiz, Unit Test, Mid-term)
- **3 User Accounts** (1 Admin, 2 Teachers)

See [DATASET_INFO.md](DATASET_INFO.md) for complete details.

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |
| Teacher | sarah.j@school.com | teacher123 |
| Teacher | david.w@school.com | teacher123 |

**⚠️ Important**: Change these credentials in production!

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js v4.18+
- **Template Engine**: EJS v3.1+
- **Session Management**: express-session
- **Authentication**: bcrypt (ready for use)

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern features (Grid, Flexbox, Variables)
- **JavaScript**: ES6+ features
- **Fonts**: Google Fonts (Inter)
- **Design**: Custom modern UI/UX

### Database
- **Current**: In-memory data store
- **Production Ready**: MongoDB/Mongoose (pre-configured)
- **Easy Migration**: Switch to MongoDB with minimal changes

### Using MongoDB

The project includes a MongoDB connection helper and Mongoose models in the `models/` folder. To enable MongoDB:

1. Start a MongoDB instance locally or configure a MongoDB Atlas cluster.
2. Set `MONGODB_URI` in your `.env` (see `.env.example`). If not provided, the app uses `mongodb://127.0.0.1:27017/school_management` by default.
3. Start the app and use the Admin Import UI at `/admin/import` to paste a JSON dataset and import documents directly into the database.

More details are in `docs/DATABASE.md`.

### Security
- **Session-based Authentication**
- **Password Hashing** (bcrypt ready)
- **CSRF Protection** (ready to implement)
- **Input Validation** (ready to expand)

## 📁 Project Structure

```
school-management-system/
├── 📂 config/
│   └── dataStore.js          # In-memory data store with sample data
├── 📂 models/                # Data models (ready for MongoDB)
├── 📂 routes/
│   ├── auth.js              # Authentication routes
│   ├── dashboard.js         # Dashboard routes
│   ├── students.js          # Student management routes
│   ├── attendance.js        # Attendance routes
│   └── marks.js             # Marks/grades routes
├── 📂 views/
│   ├── 📂 students/         # Student-related views
│   ├── 📂 attendance/       # Attendance views
│   ├── 📂 marks/            # Marks views
│   ├── dashboard.ejs        # Main dashboard
│   ├── login.ejs            # Login page
│   └── 404.ejs              # Error page
├── 📂 public/
│   ├── 📂 css/
│   │   ├── modern.css       # ✨ New modern UI/UX styles
│   │   └── style.css        # Original styles
│   ├── 📂 js/
│   │   └── main.js          # Client-side JavaScript
│   └── 📂 images/           # Image assets
├── 📄 server.js              # Main application entry point
├── 📄 package.json           # Project dependencies
├── 📄 .env                   # Environment configuration
├── 📄 README.md              # Main documentation
├── 📄 DATASET_INFO.md        # 📊 Dataset documentation
├── 📄 DESIGN_GUIDE.md        # 🎨 UI/UX design guide
└── 📄 QUICK_START.md         # 🚀 Quick start guide
```

## 🎯 Usage Guide

### Main Features

#### 1. Dashboard
- View real-time statistics (total students, attendance, etc.)
- Quick access to recent students
- Overview of system status

#### 2. Student Management
- **Add Student**: Click "+ Add Student" → Fill form → Submit
- **View Student**: Click "View" on any student
- **Edit Student**: Click "Edit" → Update information → Save
- **Delete Student**: Edit page → Delete button

#### 3. Attendance Management
- **Mark Attendance**: Select class → Choose date → Mark present students → Submit
- **View Reports**: See attendance history and statistics

#### 4. Marks Management
- **Add Marks**: Select class → Choose student → Enter marks → Submit
- **View Reports**: See all marks with performance indicators

For detailed instructions, see [QUICK_START.md](QUICK_START.md)

## 🎨 Design System

Our application features a modern, professional design:

### Visual Features
- **Gradient Backgrounds**: Beautiful purple-indigo gradients
- **Glass Morphism**: Frosted glass effects on cards
- **Smooth Animations**: Hover effects and transitions
- **Color-coded Badges**: Visual status indicators
- **Responsive Layout**: Works on all screen sizes
- **Modern Typography**: Clean, readable Inter font

### Color Palette
- Primary: Indigo (#6366f1)
- Success: Green (#10b981)
- Danger: Red (#ef4444)
- Warning: Amber (#f59e0b)

See [DESIGN_GUIDE.md](DESIGN_GUIDE.md) for complete design documentation.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Main project documentation (this file) |
| [QUICK_START.md](QUICK_START.md) | Quick start guide for users |
| [DATASET_INFO.md](DATASET_INFO.md) | Complete dataset information |
| [DESIGN_GUIDE.md](DESIGN_GUIDE.md) | UI/UX design guidelines |

## 🚀 Future Enhancements

### Planned Features
- [ ] **Search & Filter**: Advanced search across all modules
- [ ] **Data Visualization**: Charts and graphs for analytics
- [ ] **Email Notifications**: Automated email alerts
- [ ] **PDF Reports**: Generate and download reports
- [ ] **Parent Portal**: Dedicated portal for parents
- [ ] **Fee Management**: Track and manage school fees
- [ ] **Timetable**: Class schedules and timetables
- [ ] **Library Management**: Book tracking system
- [ ] **Examination Module**: Exam scheduling and results
- [ ] **Dark Mode**: Theme switcher
- [ ] **Multi-language**: Internationalization support
- [ ] **Mobile App**: React Native mobile application
- [ ] **Real-time Updates**: WebSocket integration
- [ ] **Bulk Operations**: Import/export CSV data
- [ ] **Advanced Permissions**: Role-based access control

### Database Migration
Ready to migrate to MongoDB:
```javascript
// Uncomment in .env
MONGODB_URI=mongodb://localhost:27017/school_management

// Models are ready in /models directory
// Update routes to use database queries
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Initial work - School Management Team

## 🙏 Acknowledgments

- Express.js community
- EJS template engine
- Modern CSS design patterns
- Open source contributors

## 📞 Support

For support, questions, or feedback:
- Check the documentation files
- Review the code comments
- Open an issue on GitHub

---

**Built with ❤️ for educational institutions**

*Last Updated: November 3, 2025*
#   S c h o o l _ M a n a g e m e n t _ S y s t e m 
 
 