# Application Architecture & Workflow

## High-Level Flow

```
┌─────────────┐     ┌──────────┐     ┌───────────────────┐
│  Auth Page   │────▶│  Role?   │────▶│ Teacher Dashboard │
│ (Login/Sign) │     │ teacher/ │     │ or                │
└─────────────┘     │ student  │     │ Student Dashboard │
                    └──────────┘     └───────────────────┘
```

## Teacher Workflow

```
┌──────────────────┐
│ Create Classroom │  ← generates 6-char code
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Share Code with  │
│ Students         │
└───────┬──────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│            Active Classroom                   │
│                                               │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Attendance  │  │  Quiz    │  │  File    │ │
│  │ Management  │  │ Creation │  │ Sharing  │ │
│  │             │  │          │  │          │ │
│  │ • Mark all  │  │ • Add Qs │  │ • Upload │ │
│  │ • Toggle    │  │ • View   │  │ • Preview│ │
│  │   presence  │  │   results│  │ • Delete │ │
│  └─────────────┘  └──────────┘  └──────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ Tab Monitoring (real-time)              │  │
│  │ • Track student tab switches            │  │
│  │ • Show active/inactive status           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌──────────────┐                             │
│  │ Stop Class   │ ← deactivates classroom     │
│  └──────────────┘                             │
└──────────────────────────────────────────────┘
```

## Student Workflow

```
┌──────────────────┐
│ Join Classroom   │  ← enter 6-char code
└───────┬──────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│            Student View                       │
│                                               │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Attendance  │  │  Quiz    │  │  Shared  │ │
│  │ Status      │  │ Answering│  │  Files   │ │
│  │ (view only) │  │          │  │          │ │
│  │             │  │ • Answer │  │ • View   │ │
│  │             │  │ • Score  │  │ • Preview│ │
│  └─────────────┘  └──────────┘  └──────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ Tab Detection (runs in background)      │  │
│  │ • Reports tab switches to teacher       │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Data Flow

```
┌────────┐      ┌──────────────┐      ┌──────────────┐
│ React  │◀────▶│  Supabase    │◀────▶│  PostgreSQL  │
│ Client │      │  Client SDK  │      │  Database    │
└────┬───┘      └──────┬───────┘      └──────────────┘
     │                 │
     │                 │ Real-time subscriptions
     │                 │ (postgres_changes)
     │                 ▼
     │          ┌──────────────┐
     │          │  Supabase    │
     └─────────▶│  Storage     │  ← shared files
                └──────────────┘
```

## Key Database Tables

```
classrooms ──────┬──── classroom_members
                 │
                 ├──── quizzes ──── quiz_questions ──── quiz_answers
                 │
                 ├──── shared_files
                 │
profiles ────────┘
user_roles
```

## File Structure

```
src/
├── pages/
│   ├── Auth.tsx              ← Login/Signup
│   ├── TeacherDashboard.tsx  ← Teacher classroom view
│   ├── StudentDashboard.tsx  ← Student classroom view
│   └── Index.tsx             ← Landing / role router
├── hooks/
│   ├── useAuth.tsx           ← Auth state management
│   ├── useClassroomData.ts   ← Data fetching + actions
│   └── useTabDetection.ts   ← Tab visibility tracking
└── components/
    ├── FilePreviewDialog.tsx ← In-app file preview
    └── ui/                   ← shadcn components
```
