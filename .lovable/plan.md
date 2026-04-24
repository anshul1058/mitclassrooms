

## Generate a Product Experience PDC Canvas (PDF)

I'll create a downloadable PDF document summarizing the **Product Development Canvas (PDC)** — specifically the **Product Experience** section — for your MIT AOE Classrooms / ClassPulse project. It will include the user journey, the strong points of the product, and the iterative changes you've made along the way.

### What the PDF will contain

**1. Cover / Header**
- Project name: MIT AOE Classrooms (ClassPulse)
- Section: Product Development Canvas — Product Experience
- Tagline: "Offline classroom distraction management platform"

**2. User Personas**
- **Teacher** — runs a class, monitors students, shares materials, runs quizzes
- **Student** — joins via class code, attends lecture, uses AI assistant, takes quizzes

**3. Product Experience — User Journey (step by step)**

Teacher flow:
1. Sign up / log in → land on Teacher Dashboard
2. Create a classroom → 6-character code generated
3. Share code with students in the physical classroom
4. Watch live grid of joined students, presence, and tab-switch counts
5. Toggle AI Assistant and Notifications on/off
6. Share files (PDFs, slides) and launch MCQ quizzes
7. Mark attendance (auto 5-minute rule applied) and export to Excel
8. Stop the class when done

Student flow:
1. Sign up with PRN → log in
2. Enter class code on Student Dashboard
3. See "ClassPulse" live dashboard with attendance, tab switches, score
4. Receive shared materials and quizzes in real time
5. Ask questions to the floating AI chatbot (when teacher allows)
6. Get a soft amber warning if they switch tabs (when notifications are on)
7. Auto-removed and banned if they switch tabs more than 5 times
8. Marked Present only if they stayed at least 5 minutes

**4. Good Points (Strengths of the Experience)**
- Fully offline-classroom focused — no camera, no video calls, low friction
- Real-time sync between teacher and student dashboards (Supabase Realtime)
- Beautiful glassmorphism UI with light/dark mode and Framer Motion animations
- PRN-based identity makes attendance reliable across sessions
- Built-in AI tutor (Gemini) with no extra API key for students
- Teacher has fine-grained control: AI on/off, notifications on/off, stop class
- Wake Lock keeps phone screens awake during class — no missed activity
- Secure by default: RLS on every table, separate `user_roles` table
- One-click Excel export of attendance

**5. Changes / Improvements Made (Iteration Log)**
- Rebranded student dashboard to **ClassPulse** with premium glass UI, gradient background, animated Live badge, stats cards with hover lift
- Replaced harsh red tab-switch alert with a soft amber, dismissible toast banner
- Added **AI Chatbot** for students with streaming responses + teacher toggle
- Added **Notifications toggle** so teachers can mute student-side warnings
- Redesigned **Teacher Dashboard** to match ClassPulse glass aesthetic, added 4 stats cards and unified control panel
- Implemented **5-minute attendance rule** — students must stay ≥ 5 min to be Present
- Implemented **Tab-switch ban system** — > 5 switches auto-removes the student and blocks rejoin via `classroom_kicks` table
- Added **Screen Wake Lock** across both dashboards so phones don't sleep mid-class
- Pause-tab-detection logic so opening shared files or using the AI chatbot doesn't falsely count as a distraction

### Format & delivery
- Clean, branded A4 PDF (indigo accent, Inter-style typography)
- 2–3 pages, well-spaced, easy to paste into a PDC canvas template
- Saved to `/mnt/documents/ClassPulse_PDC_ProductExperience.pdf`
- Delivered via a `presentation-artifact` tag so you can preview and download

### Technical approach
- Generate the PDF in default mode using Python (`reportlab`) via `code--exec`
- QA: convert each page to image and inspect for layout/clipping before delivering

