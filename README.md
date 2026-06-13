# 🧠 AuraHealth: AI Disease Predictor & Telehealth Platform

AuraHealth is a comprehensive, full-stack medical helper and telehealth monorepo featuring an AI-driven symptom diagnostic engine, a medical chatbot, a real-time health metrics tracker, a doctor-patient teleconnect portal, and an automated Emergency SOS system.

This project is organized as a monorepo containing a web dashboard, a cross-platform mobile application, an Express API gateway, and shared database scripts.

---

## 📂 Repository Structure

The project is divided into four main sections:

```
├── backend/          # Node.js & Express API (Gemini AI, Twilio, Supabase)
├── web/              # React (Vite) Telehealth Web App
├── mobile/           # React Native (Expo) Mobile App
└── shared/           # PostgreSQL Schema (Supabase RLS & DB Triggers)
```

---

## 🚀 Key Features

### 1. 🔍 AI Symptom Diagnostics
- Leverages the **Google Gemini API** (`gemini-2.5-flash-lite`) to analyze patient-reported symptoms.
- Contextual analysis: Integrates the patient's past 7 days of lifestyle data (water, steps, sleep, calories) to predict the top 3 most likely conditions with probability ratings.
- Provides actionable recommendations and clinical explanations.

### 2. 💬 AI Medical Chatbot
- Interactive AI conversation helper trained on medical contexts.
- Tracks message history dynamically and logs chat sessions securely in the database.

### 3. 🚨 Emergency SOS (with Twilio Integration)
- Web & Mobile **Press & Hold SOS** button (with a 3-second safety circle animation).
- Automatically retrieves patient GPS coordinates.
- Registers emergency logs in the DB and immediately dispatches SMS and WhatsApp alerts to guardians via the **Twilio API**.

### 4. 🩺 Doctor-Patient Teleconnect
- Dual-role portal: Supports both **Patients** and **Doctors**.
- **Patients**: Find doctors by specialty, read reviews, book appointments, send inquiries, and chat in real-time.
- **Doctors**: Manage upcoming appointments, respond to patient inquiries, track patient metrics, and review patient health history.

### 5. 📊 Health Metrics Tracker
- Track steps, sleep hours, water intake, and calories burned.
- Database-level trigger automatically computes a daily overall **Health Score** (Poor, Fair, Good, Excellent) based on logged achievements.

### 6. 💊 Pill Reminders & Stock Tracker
- Keep track of medication schedules.
- Log intake status (taken/skipped) and monitor pill stock counts to prompt refills.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, `@google/generative-ai`, `@supabase/supabase-js`, Twilio API.
- **Web Frontend**: React 19, Vite, Tailwind CSS (v4), Redux Toolkit, Recharts (analytics), Lucide Icons.
- **Mobile App**: React Native, Expo, React Navigation, Redux Toolkit.
- **Database & Auth**: Supabase (PostgreSQL) with Row Level Security (RLS) and custom PL/pgSQL database triggers.

---

## ⚙️ Environment Configurations

Each subfolder contains its own environment setup. Copy the placeholders and fill in your keys:

### 1. Backend (`backend/.env`)
```env
PORT=5000
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
JWT_SECRET=your-jwt-auth-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-sms-number
TWILIO_WHATSAPP_NUMBER=your-twilio-whatsapp-number
```

### 2. Web Frontend (`web/.env`)
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:5000/api
```

### 3. Mobile Frontend (`mobile/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your phone (for mobile testing)
- Supabase account

---

### 🗄️ Database Setup
1. Create a new Supabase project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of [`shared/schema.sql`](file:///c:/Users/senth/Videos/TqPdd/shared/schema.sql) and execute the query.
   - This sets up tables, triggers, and Row Level Security policies.

---

### 💻 Running the Services

#### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```

#### 2. Start the Web App
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### 3. Start the Mobile App
```bash
cd mobile
npm install
npx expo start
```
Scan the QR code using the Expo Go app on Android or iOS camera.

---

## 📸 Output Preview

<img width="1727" height="951" alt="Screenshot 2026-02-19 121628" src="https://github.com/user-attachments/assets/0b1addcb-daa9-43a1-8e23-bafbe5e8596a" />
