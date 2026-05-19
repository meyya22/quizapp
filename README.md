# Quiz Application

A full-stack web quiz application with Admin and Participant roles.

## Tech Stack

- **Backend**: Node.js + Express + TypeScript + Prisma + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Auth**: JWT + Google OAuth 2.0

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values (especially GOOGLE_CLIENT_ID)
npm run db:migrate
npm run db:seed
npm run dev
```

Backend runs at `http://localhost:3001`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your VITE_GOOGLE_CLIENT_ID
npm run dev
```

Frontend runs at `http://localhost:5173`

## Default Credentials

- **Admin**: admin@quizapp.com / AdminSecurePassword123
- **Participant**: Register via /register

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable Google Identity API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:5173` to Authorized JavaScript origins
6. Copy the Client ID to both `.env` files

## CSV Import Format

```csv
QuestionText,Type,OptionA,OptionB,OptionC,OptionD,CorrectAnswer
"What is 2+2?",MULTIPLE_CHOICE,2,3,4,5,C
"Earth is flat",TRUE_FALSE,,,,,False
"Select primes < 10",MULTIPLE_RESPONSE,2,3,4,6,"A,B"
"Capital of France?",FREE_TEXT,,,,,"Paris"
```

- **MULTIPLE_CHOICE**: CorrectAnswer = A, B, C, or D
- **MULTIPLE_RESPONSE**: CorrectAnswer = comma-separated letters e.g. "A,B"
- **TRUE_FALSE**: CorrectAnswer = True or False
- **FREE_TEXT**: CorrectAnswer = expected text (case-insensitive match)
