# PrepGenie - Frontend

Frontend application for the AI Voice Interview Simulator built with React, TypeScript, Vite, and TailwindCSS.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **WebSocket API** - Real-time communication
- **MediaDevices API** - Webcam & microphone access

## Project Structure

```
client/
├── src/
│   ├── features/
│   │   ├── auth/              # Login & Signup pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── interview/         # Interview setup & session
│   │   ├── results/           # Results & feedback
│   │   └── history/           # Interview history
│   ├── components/            # Reusable components
│   │   ├── Avatar.tsx
│   │   ├── WebcamPreview.tsx
│   │   ├── AudioControls.tsx
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── useMicRecorder.ts
│   │   ├── useWebcam.ts
│   │   └── useWebSocket.ts
│   ├── store/                 # State management
│   │   └── authStore.ts
│   ├── lib/                   # Utilities & API client
│   │   └── api.ts
│   ├── App.tsx                # Main app component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── .env                       # Environment variables
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment Variables

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000/ws
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend will start on `http://localhost:5173`

## Features

### Authentication
- User signup with name, email, password
- Login with JWT token
- Protected routes
- Persistent auth state

### Dashboard
- Overview of past interviews
- Create new interview button
- Interview cards with status and scores
- Logout functionality

### Interview Setup
- Configure interview type (Technical/Non-Technical/Mixed)
- Set job role and tech stack
- Choose experience level
- Select number of questions (3-10)

### Interview Session
- Real-time WebSocket communication
- AI avatar with speaking animations
- Webcam preview (stays local, not uploaded)
- Microphone recording
- Audio controls (mic/camera toggle)
- Question display
- Live transcript
- End interview option

### Results Page
- Overall score display
- Detailed feedback breakdown
- Strengths, weaknesses, improvements
- AI-generated summary
- Option to start new interview

### History Page
- List all past interviews
- Filter by status (all/completed/in_progress)
- View detailed results
- Resume incomplete interviews

## Custom Hooks

### `useMicRecorder`
Handles microphone recording and audio capture
- Request permission
- Start/stop recording
- Convert audio to base64
- Real-time chunks

### `useWebcam`
Manages webcam video stream
- Request permission
- Start/stop camera
- Video element reference
- Local preview only

### `useWebSocket`
WebSocket connection management
- Auto-connect with JWT token
- Send/receive messages
- Connection status
- Error handling

## API Integration

### REST Endpoints
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile
- `POST /api/interviews` - Create interview
- `GET /api/interviews` - List all interviews
- `GET /api/interviews/:id` - Get interview details

### WebSocket Events
- `START_INTERVIEW` - Begin interview
- `AUDIO_CHUNK` - Send audio data
- `NEXT_QUESTION` - Move to next question
- `END_INTERVIEW` - Complete interview
- `AI_SPEAKING` - AI response event
- `QUESTION` - New question event
- `TRANSCRIPT` - Speech transcription

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Browser Requirements

- Modern browser with support for:
  - MediaDevices API (getUserMedia)
  - WebSocket API
  - MediaRecorder API
  - ES2022+

## Notes

- Webcam video never leaves the browser
- Audio is encoded as base64 and sent via WebSocket
- JWT token stored in sessionStorage (session ends when tab/browser is closed)
- State persisted with Zustand
- Fully responsive design with TailwindCSS
