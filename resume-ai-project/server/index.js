import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import mongoose from "mongoose";
import { createRequire } from "module";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import OpenAI from "openai";

dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");  // <== YOU INSTALL THIS LIBRARY BELOW

const app = express();
const upload = multer();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const resumeSchema = new mongoose.Schema({
  filename: String,
  text: String,
  skills: [String],
  uploadedAt: { type: Date, default: Date.now },
});
const Resume = mongoose.model("Resume", resumeSchema);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const users = new Set();

app.get("/", (req, res) => {
  res.send("✅ AI Resume Analyzer Backend is running!");
});

app.post("/api/login", async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  users.add(username);

  const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return res.json({ accessToken });
});

app.post("/api/upload", upload.single("resume"), async (req, res) => {
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
      try {
        const result = await pdfParse(req.file.buffer);
        text = result.text;
      } catch (e) {
        return res.status(400).json({
          error: "Error reading PDF file. Try uploading a .docx instead.",
        });
      }
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    console.log("🔍 AI Raw Response:", aiResponse); // Optional: for debugging

    let aiAnalysis;
    try {
      const match = aiResponse.match(/\{[\s\S]*?\}/); // Extract JSON safely
      aiAnalysis = match ? JSON.parse(match[0]) : {
        score: null,
        feedback: "AI response could not be parsed. Try again later.",
      };
    } catch (e) {
      aiAnalysis = {
        score: null,
        feedback: "Could not parse AI response. Please try again later.",
      };
    }

    res.json({
      text,
      skills,
      aiAnalysis,
    });
  } catch (error) {
    console.error("❌ Resume upload error:", error);
    res.status(500).json({ error: "Failed to process the file" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
