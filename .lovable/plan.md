

# AI Chatbot Assistant for Students

## What We're Building
A floating chat widget on the Student Dashboard that lets students ask questions to an AI assistant during class. The AI will have context about the classroom (subject, quiz topics) and provide helpful explanations.

## Architecture

```text
Student Dashboard
  └─ ChatWidget (floating button + slide-up panel)
       ├─ Message list (scrollable, markdown-rendered)
       ├─ Input bar + send button
       └─ Calls edge function via streaming SSE

Edge Function: supabase/functions/classroom-chat/index.ts
  ├─ Receives: messages array, classroomId
  ├─ Adds system prompt (classroom tutor context)
  ├─ Streams response from Lovable AI Gateway
  └─ Returns SSE stream
```

## Implementation Steps

### 1. Create Edge Function (`supabase/functions/classroom-chat/index.ts`)
- Accept `{ messages, classroomId }` in request body
- System prompt: "You are a helpful classroom assistant. Help students understand concepts, answer questions about their coursework, and explain quiz topics. Keep answers clear, concise, and educational."
- Use `google/gemini-3-flash-preview` model with streaming
- Handle CORS, 429/402 errors properly

### 2. Create Chat Components
- **`src/components/ChatWidget.tsx`** — Floating chat button (bottom-right) with expandable chat panel
  - Message list with markdown rendering (react-markdown)
  - Text input + send button
  - Streaming token-by-token display
  - Loading indicator while AI responds
  - Close/minimize button
- Uses `MessageCircle` icon from lucide-react for the floating button

### 3. Integrate into Student Dashboard
- Import and render `<ChatWidget />` at the bottom of `StudentDashboard.tsx`
- Only shown when classroom is active

### 4. Install Dependencies
- `react-markdown` for rendering AI responses with proper formatting

## Technical Details
- Messages stored in local state only (no persistence needed)
- Streaming via `fetch` + SSE parsing for real-time token display
- Chat panel: fixed position, z-50, responsive width (full on mobile, 400px on desktop)
- Pause tab detection when chat is focused to avoid false tab-switch counts

