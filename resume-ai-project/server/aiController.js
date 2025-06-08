import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // make sure you add this to your env variables
});
const openai = new OpenAIApi(configuration);

export async function analyzeResume(req, res) {
  try {
    const { resumeText, jobDescription } = req.body;

    const prompt = `
You are a helpful assistant that analyzes a candidate's resume text against a job description. 
Extract the main skills mentioned, suggest any missing skills relevant to the job, and provide an overall match score (0-100%).

Job Description:
${jobDescription}

Candidate Resume Text:
${resumeText}

Please respond in JSON with fields:
{
  "matchedSkills": [ ... ],
  "missingSkills": [ ... ],
  "summary": "...",
  "matchScore": 0-100
}
`;

    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content = response.data.choices[0].message.content;
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      // if GPT doesn't respond with perfect JSON, just send raw content
      return res.status(200).json({ raw: content });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("AI analyze error:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
}
