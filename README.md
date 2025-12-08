# 🎓 Check-Chue - CMU Attendance System

A secure, web-based attendance system for Chiang Mai University that utilizes one-time QR codes for student check-ins, integrating seamlessly with the CMU Mobile app.

---

## ✨ Features

### 🔐 Security First

- **One-Time QR Codes**: Each student generates a unique, time-limited QR code for attendance
- **Token Validation**: Robust JWT-based authentication system
- **Audit Logging**: Comprehensive tracking of all attendance activities
- **CMU Mobile Integration**: Secure webhook integration for QR code scanning

### 👥 Role-Based Access Control

- **Students**: Generate QR codes and view personal attendance records
- **Teaching Assistants (TAs)**: Manage session attendance and assist instructors
- **Teachers**: Full course management, roster uploads, and session creation
- **Admins**: System-wide user and course administration

### 📊 Course Management

- Create and manage courses with multiple sections
- Upload student rosters via Excel import
- Generate comprehensive attendance reports
- Export attendance data to Excel with formatted checkboxes
- Track attendance statistics and patterns

### 📱 Modern User Experience

- Responsive design for desktop and mobile devices
- Real-time attendance updates
- Intuitive dashboard for each role
- Session-based attendance tracking

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS 4
- **Authentication**: JWT (jsonwebtoken)
- **QR Code Generation**: qrcode library
- **Excel Processing**: ExcelJS & XLSX
- **Runtime**: Node.js

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- PostgreSQL database
- CMU authentication credentials (for production)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd cmu-attendance
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/attendance"
   JWT_SECRET="your-secret-key-here"
   CMU_OAUTH_CLIENT_ID="your-cmu-oauth-client-id"
   CMU_OAUTH_CLIENT_SECRET="your-cmu-oauth-secret"
   ```

4. **Initialize the database**

   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage

### For Teachers

1. **Create a Course**: Set up your course with code, name, and sections
2. **Upload Roster**: Import student lists via Excel (supports SECLEC, SECLAB columns)
3. **Create Sessions**: Schedule class sessions with check-in deadlines
4. **Monitor Attendance**: View real-time attendance and generate reports
5. **Export Data**: Download attendance records in Excel format

### For Students

1. **Login**: Authenticate via CMU Mobile credentials
2. **Generate QR Code**: Create a one-time QR code for the active session
3. **Check-In**: Have your TA scan the QR code to mark attendance
4. **View Records**: Track your attendance history across all courses

### For TAs

1. **Access Course Sessions**: View assigned course sessions
2. **Scan QR Codes**: Use the CMU Mobile app to scan student QR codes
3. **Manage Attendance**: Mark attendance and handle special cases
4. **Assist Teachers**: Support course administration tasks

### For Admins

1. **User Management**: Create and manage user accounts
2. **System Overview**: Monitor system-wide attendance statistics
3. **Course Administration**: Oversee all courses and sessions

---

## 📁 Project Structure

```text
cmu-attendance/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── teacher/           # Teacher interface
│   ├── ta/                # TA interface
│   └── student/           # Student interface
├── lib/                   # Utility functions and helpers
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Prisma schema definition
│   └── seed.ts            # Database seeding script
├── public/                # Static assets
└── components/            # Reusable React components
```

---

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio for database management
- `npx prisma db seed` - Seed the database with initial data

---

## 📚 Learn More

### Next.js Resources

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial

### Prisma Resources

- [Prisma Documentation](https://www.prisma.io/docs) - Database toolkit documentation
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference) - Schema syntax guide

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

## 📄 License

This project is developed for Chiang Mai University.

---

Built with ❤️ for CMU
