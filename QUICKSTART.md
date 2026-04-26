# Trio - Balanced Life App

## 🚀 Quick Start

**Live App:** http://localhost:3000

**GitHub:** https://github.com/helenazhang425/dbs-final-project-v1

## 📖 How to Use Discovery UI

1. **Open** http://localhost:3000
2. **Sign in** (top right corner)
3. **Click** "Discover & Start" on any hobby slot
4. **Answer** 5 conversational questions about your preferences
5. **Get** personalized hobby suggestions with reasoning
6. **Select** a hobby to activate

## 🎨 Features Built

✅ Three-category dashboard (Physical/Intellectual/Creative)
✅ Clerk authentication 
✅ Conversational discovery flow
✅ Hobby suggestions with AI-generated reasoning
✅ Progress tracking
✅ Responsive UI

## 🛠️ Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Clerk Auth
- Supabase (ready to connect)
- OpenAI Codex (ready to integrate)

## 📝 Next Steps

1. Set up Supabase database (run schema.sql)
2. Add API routes for Codex integration
3. Connect Google Calendar API
4. Add adaptive plan generation

## 📂 Repository Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── dashboard/        # Main dashboard
│   ├── discover/         # Discovery UI flow
│   └── page.tsx          # Homepage
├── components/           # React components
│   ├── ui/              # Header, etc.
│   └── discovery/       # Discovery flow components
└── lib/                 # Utilities
    ├── supabase/        # DB client & schema
    └── types/           # TypeScript types
```
