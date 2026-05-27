# MIT AOE Classrooms

![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=white)

**MIT AOE Classrooms** is a modern classroom focus platform for MIT Academy of Engineering. Create live classroom sessions, share a join code, mark attendance, run quizzes, share learning materials, and detect tab-switching — all without cameras or video calls.

**Live Demo:** https://mitclassrooms.lovable.app

---

## ✨ Highlights

- **Live classroom sessions** with shareable join codes
- **Attendance in one click** with real-time presence tracking
- **MCQ quizzes** delivered instantly to students
- **Material sharing** for PDFs, docs, images, and slides
- **Tab activity detection** to reduce distractions
- **Teacher & student dashboards** with role-aware experiences

## 🎓 Roles & Workflows

**Teachers** can create sessions, share resources, publish quizzes, mark attendance, and monitor class activity.

**Students** join with a class code, answer quizzes, access shared materials, and stay focused during class.

## 🧱 Tech Stack

- **Frontend:** React, TypeScript, Vite
- **UI:** Tailwind CSS, shadcn-ui, Radix UI
- **State/Data:** React Query
- **Backend:** Supabase (Auth, Storage, Realtime)

## 🚀 Getting Started

### Prerequisites

- Node.js (recommended via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Setup

```sh
# Clone the repository
git clone https://github.com/anshul1058/mitclassrooms.git

# Go to the project folder
cd mitclassrooms

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Environment Variables

Create a `.env` file (or update the existing one) with your Supabase credentials:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

## 🧪 Scripts

- `npm run dev` – start the development server
- `npm run build` – create a production build
- `npm run lint` – run ESLint
- `npm test` – run unit tests with Vitest

## 📦 Deployment

If you are using Lovable, open the project and go to **Share → Publish** to deploy.

## 🤝 Contributing

PRs and improvements are welcome. If you plan a larger change, please open an issue first to discuss.

---

Built for MIT Academy of Engineering, Pune.
