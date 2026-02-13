# PrepGenie - Backend Server

Backend server for the AI Voice Interview Simulator built with Node.js, Express, TypeScript, and PostgreSQL.

## Tech Stack

- **Node.js** + **Express.js** - Server framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **Prisma ORM** - Database toolkit
- **WebSocket (ws)** - Real-time communication
- **OpenAI API** - Whisper (STT), GPT (AI), TTS
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Project Structure

```
server/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication (signup, login)
│   │   ├── interview/         # Interview CRUD operations
│   │   ├── ai/                # OpenAI integrations
│   │   └── websocket/         # WebSocket server & handlers
│   ├── middleware/            # Auth middleware
│   ├── prisma/                # Prisma client
│   └── server.ts              # Main entry point
├── prisma/
│   └── schema.prisma          # Database schema
├── .env                       # Environment variables
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the values:
- `DATABASE_URL` - Your PostgreSQL connection string (NeonDB recommended)
- `JWT_SECRET` - Random secret for JWT tokens
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Interviews
- `POST /api/interviews` - Create new interview
- `GET /api/interviews` - Get all interviews for user
- `GET /api/interviews/:id` - Get interview details
- `PATCH /api/interviews/:id/status` - Update interview status

### WebSocket
- `ws://localhost:5000/ws?token=<JWT_TOKEN>` - WebSocket connection for real-time interview

## WebSocket Events

### Client → Server
- `START_SETUP` - Begin voice-based setup
- `AUDIO_CHUNK` - Send audio data
- `START_INTERVIEW` - Start interview with questions
- `NEXT_QUESTION` - Move to next question
- `END_INTERVIEW` - Complete interview

### Server → Client
- `AI_SPEAKING` - AI voice response
- `TRANSCRIPT` - User speech transcription
- `QUESTION` - New interview question
- `INTERVIEW_COMPLETED` - Interview finished
- `ERROR` - Error message

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Notes

- This is a school project - keep it simple!
- Webcam video stays on client side only
- Audio is sent as base64 encoded chunks
- JWT tokens expire in 7 days
- Use NeonDB for free PostgreSQL hosting
