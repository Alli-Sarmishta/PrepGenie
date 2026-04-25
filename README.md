## AI Voice Interview Simulator

A full-stack web application that simulates real-life interviews using AI. Users can practice interviews with voice interaction, receive real-time questions, and get detailed AI-powered feedback.

## Repository

https://github.com/Alli-Sarmishta/PrepGenie

## Version

v1.0.0

## Features

- **Voice-Based Interviews** - Speak naturally with AI interviewer using microphone
- **Real-Time Interaction** - WebSocket-powered instant communication
- **Webcam Preview** - See yourself during the interview (stays local, never uploaded)
- **AI-Powered Questions** - GPT generates relevant questions based on your profile
- **Intelligent Feedback** - Comprehensive analysis with strengths, weaknesses, and improvements
- **Interview History** - Track all past interviews and review feedback
- **Secure Authentication** - JWT-based auth with password hashing

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Router (navigation)
- Zustand (state management)
- WebSocket API (real-time)
- MediaDevices API (mic + webcam)

### Backend
- Node.js + Express
- TypeScript
- WebSocket (ws library)
- PostgreSQL + Prisma ORM
- OpenAI API (Whisper, GPT, TTS)
- JWT + bcrypt (auth)

## Project Structure

```
AIInterviewer/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── features/      # Feature-based modules
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # State management
│   │   └── lib/           # API client & utilities
│   └── package.json
│
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   │   ├── auth/      # Authentication
│   │   │   ├── interview/ # Interview CRUD
│   │   │   ├── ai/        # OpenAI integrations
│   │   │   └── websocket/ # WebSocket server
│   │   ├── middleware/    # Express middleware
│   │   ├── prisma/        # Prisma client
│   │   └── server.ts      # Main entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (or use NeonDB free tier)
- OpenAI API key

### 1. Clone Repository

```bash
cd AIInterviewer
```

### 2. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `server/.env` with your credentials:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="your-random-secret-key"
OPENAI_API_KEY="sk-your-openai-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start backend server
npm run dev
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start frontend dev server
npm run dev
```

Frontend runs on `http://localhost:5173`

### 4. Access Application

Open browser and navigate to:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## How to Use

### 1. Sign Up / Login
- Create an account with name, email, and password
- Login to access dashboard

### 2. Create Interview
- Click "Create New Interview" on dashboard
- Fill in interview details:
  - Job role (e.g., Frontend Developer)
  - Interview type (Technical/Non-Technical/Mixed)
  - Tech stack (comma-separated)
  - Experience level
  - Number of questions (3-10)

### 3. Start Interview
- Grant microphone and camera permissions
- Click "Start Interview"
- AI will ask questions via voice
- Answer using your microphone
- Webcam shows your video locally (not uploaded)

### 4. Complete Interview
- Answer all questions
- Click "End Interview" or let it complete naturally
- AI generates comprehensive feedback

### 5. View Results
- See your overall score
- Read detailed feedback:
  - Strengths
  - Weaknesses
  - Improvement suggestions
  - Summary

### 6. Review History
- Access past interviews from dashboard
- Filter by status
- Review previous feedback

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

### Interviews
- `POST /api/interviews` - Create interview
- `GET /api/interviews` - List all user interviews
- `GET /api/interviews/:id` - Get interview details
- `PATCH /api/interviews/:id/status` - Update status

### WebSocket
- `ws://localhost:5000/ws?token=JWT_TOKEN`

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=          # PostgreSQL connection string
JWT_SECRET=            # Random secret for JWT
OPENAI_API_KEY=        # OpenAI API key
PORT=                  # Server port (default: 5000)
NODE_ENV=              # development/production
FRONTEND_URL=          # Frontend URL for CORS
```

### Frontend (.env)
```env
VITE_API_URL=          # Backend API URL
VITE_WS_URL=           # WebSocket URL
```

## Database Schema

- **User** - User accounts
- **Interview** - Interview sessions
- **Question** - Interview questions
- **Answer** - User answers (transcribed)
- **Feedback** - AI-generated feedback
- **TranscriptChunk** - Full conversation history

## Key Features Explained

### Voice Recognition
- Uses OpenAI Whisper API for speech-to-text
- Accurate transcription in real-time
- Supports multiple accents and languages

### AI Question Generation
- GPT-4 generates contextual questions
- Based on job role, experience level, and tech stack
- Progressive difficulty

### AI Feedback
- Comprehensive analysis after interview
- Scores out of 100
- Actionable improvement suggestions

### WebSocket Communication
- Real-time bidirectional communication
- Low latency for natural conversation
- Persistent connection during interview

### Webcam Privacy
- Video stays completely local in browser
- Never uploaded to server
- Simulates real interview environment

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Ensure OpenAI API key is valid
- Run `npm run prisma:generate` again

### Frontend can't connect
- Check backend is running on port 5000
- Verify .env URLs are correct
- Clear browser cache
- Check browser console for errors

### Microphone not working
- Grant browser permissions
- Check system microphone settings
- Try different browser (Chrome recommended)

### WebSocket connection fails
- Ensure JWT token is valid
- Check firewall settings
- Verify WebSocket URL in .env

## Scripts

### Backend
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Deployment

### Backend (Railway / Heroku)
1. Set environment variables
2. Run `npm run build`
3. Start with `npm start`
4. Ensure PostgreSQL database is accessible

### Frontend (Vercel / Netlify)
1. Set environment variables (VITE_*)
2. Build command: `npm run build`
3. Output directory: `dist`

## Security Notes

- Passwords hashed with bcrypt
- JWT tokens expire in 7 days
- CORS configured for frontend origin
- Environment variables never committed
- SQL injection protected by Prisma

## Known Limitations

- Audio recording requires HTTPS in production
- WebSocket needs secure connection (wss://) in production
- Browser compatibility: Chrome, Firefox, Safari (latest versions)

## Future Enhancements

- [ ] Multiple language support
- [ ] Custom interviewer voice selection
- [ ] Screen sharing for technical interviews
- [ ] Collaborative interviews (multiple participants)
- [ ] Interview replay/recording
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Calendar integration

## Authors and Contributions

The following contributions were made by each author in the design, development, and implementation of the PrepGenie system:

- **Alli Sarmishta** — Led AI system development, including integration of Large Language Models (LLMs), implementation of WebSocket-based real-time communication, and integration of backend with AI services.

- **Kocheruvu Sankeerthana** — Designed and developed the user interface (UI/UX), implemented frontend architecture using modern web technologies, and ensured a responsive and interactive user experience.

- **Gollapelly Rishwitha** — Developed backend services, designed and implemented APIs, and managed integration between backend and database systems.

- **Bojja Srija** — Contributed to frontend development, implemented frontend-to-backend communication, and supported system integration and testing.

All authors contributed to the overall system design, documentation, and final validation of the work.

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the documentation
3. Check browser console for errors
4. Verify all environment variables are set

---

Built with ❤️ for learning and practice
