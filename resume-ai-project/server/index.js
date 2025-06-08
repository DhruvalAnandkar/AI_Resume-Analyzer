import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import mongoose from "mongoose";
import { createRequire } from "module";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import OpenAI from "openai";  // Changed import style here

dotenv.config();
console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI ? "Yes" : "No");
console.log("Loaded OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Yes" : "No");
console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET ? "Yes" : "No");

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const app = express();
const upload = multer();

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const resumeSchema = new mongoose.Schema({
  filename: String,
  text: String,
  skills: [String],
  uploadedAt: { type: Date, default: Date.now },
});

const Resume = mongoose.model("Resume", resumeSchema);

// Initialize OpenAI client with default import style
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// Dummy in-memory user store (for demo)
const users = new Set();

// Login route
app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Optional: You could store and verify users in MongoDB
  users.add(username);

  // Create a simple token using JWT
  const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return res.json({ accessToken });
});

app.post(
  "/api/upload",
  upload.single("resume"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const skillKeywords = [
        "react",
        "node.js",
        "mongodb",
        "rest api",
        "aws",
        "azure",
        "git",
        "ci/cd",
        "agile",
        "javascript",
        "typescript",
        "html",
        "css",
      ];

      let text = "";
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else if (filename.endsWith(".pdf")) {
        const result = await pdfParse(req.file.buffer);
        text = result.text;
      } else {
        return res.status(400).json({
          error: "Unsupported file format. Only .docx and .pdf allowed.",
        });
      }

      const lowerText = text.toLowerCase();
      const skills = skillKeywords.filter((skill) => lowerText.includes(skill));

      const resume = new Resume({
        filename: req.file.originalname,
        text,
        skills,
      });
      await resume.save();

      const prompt = `
You are an expert career coach.

Analyze the resume text below based on the following skill keywords:
[${skillKeywords.map((s) => `"${s}"`).join(", ")}]

Return ONLY a valid JSON object with two fields:
{
  "score": number (0-100),
  "feedback": string (1-3 sentence advice to improve resume)
}

Do not include any explanations or extra text.


Resume text:
${text}
`;

      // Use createChatCompletion as per new client
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;

      let aiAnalysis;
      try {
        aiAnalysis = JSON.parse(aiResponse);
      } catch (e) {
        aiAnalysis = {
          score: null,
          feedback:
            "Could not parse AI response. Please try again or improve your resume content.",
        };
      }

      res.json({
        text,
        skills,
        aiAnalysis,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process the file" });
    }
  }
);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
