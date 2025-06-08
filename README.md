# 🧠 AI Resume Analyzer

An AI-powered resume analysis tool that evaluates resumes against job descriptions and provides a match percentage using OpenAI's GPT models.

### 🚀 Live Demo
👉 Try it Now on Vercel: https://ai-resume-analyzer-indol.vercel.app/

---

## 📌 Features

- 📄 Upload Resume (PDF/DOCX)
- 🧠 Analyze Resume with OpenAI GPT
- ✅ View Match % Based on Job Description
- 🔐 Secure User Authentication (Login/Register)
- 🌐 Fully Deployed (Frontend + Backend + DB)

---

## ⚙️ Tech Stack

| Layer         | Tools Used                          |
|---------------|-------------------------------------|
| **Frontend**  | React.js, React Router, Vite        |
| **Backend**   | Node.js, Express.js, JWT            |
| **Database**  | MongoDB Atlas                       |
| **AI API**    | OpenAI (via `openai` npm package)   |
| **Deployment**| Vercel (Frontend), Render (Backend) |

---

## 🛠 How It Works

1. User logs in or registers
2. Uploads a resume file (PDF/DOCX)
3. Backend extracts content using `pdf-parse` or `mammoth`
4. Sends resume + job prompt to OpenAI API
5. Receives match % and response, then displays in UI

---

## 👤 Author

Made with 💻 by Dhruval Anandkar: https://www.linkedin.com/in/dhruvalanandkar/

---
