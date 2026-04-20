import { GoogleGenAI } from "@google/genai";

// Initialization following skill guidelines
export const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Extracts structured talent profile from resume text
 */
export async function parseResumeWithAI(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
        Extract the following information from this resume text according to the Talent Profile Schema Specification.
        
        Schema:
        {
          "firstName": "string",
          "lastName": "string",
          "email": "string",
          "headline": "string (Short professional summary)",
          "bio": "string (Detailed professional biography)",
          "location": "string (City, Country)",
          "skills": [
            { "name": "string", "level": "Beginner | Intermediate | Advanced | Expert", "yearsOfExperience": number }
          ],
          "languages": [
            { "name": "string", "proficiency": "Basic | Conversational | Fluent | Native" }
          ],
          "experience": [
            {
              "company": "string",
              "role": "string",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM | Present",
              "description": "string",
              "technologies": ["string"],
              "isCurrent": boolean
            }
          ],
          "education": [
            {
              "institution": "string",
              "degree": "string",
              "fieldOfStudy": "string",
              "startYear": number,
              "endYear": number
            }
          ],
          "certifications": [
            { "name": "string", "issuer": "string", "issueDate": "YYYY-MM" }
          ],
          "projects": [
            {
              "name": "string",
              "description": "string",
              "technologies": ["string"],
              "role": "string",
              "link": "string",
              "startDate": "YYYY-MM",
              "endDate": "YYYY-MM"
            }
          ],
          "availability": {
            "status": "Available | Open to Opportunities | Not Available",
            "type": "Full-time | Part-time | Contract",
            "startDate": "YYYY-MM-DD"
          },
          "socialLinks": {
            "linkedin": "string",
            "github": "string",
            "portfolio": "string"
          }
        }

        Resume Text:
        ${text.substring(0, 15000)}

        Return ONLY the JSON object. Ensure all fields are extracted accurately. If a field is not found, use null or an empty array as appropriate.
      `,
      config: {
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Gemini parsing error:', error);
    throw error;
  }
}

/**
 * Generates job description details based on title and type
 */
export async function generateJobDetails(title: string, type: string) {
  try {
    const prompt = `
      You are an expert technical recruiter and HR manager.
      I need to write a job description for a "${title}" position.
      The position type is: ${type === 'internship' ? 'Internship' : type === 'part-time' ? 'Part-time Job' : 'Full-time Job'}.
      
      Please generate the following details in JSON format:
      {
        "requirements": "A concise paragraph or bullet points describing the main responsibilities and requirements.",
        "skills": "A comma-separated list of 5-8 key skills required.",
        "experience": "A short string describing the required experience level."
      }
      
      Only return the JSON object, no markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('AI Generation error:', error);
    throw error;
  }
}

/**
 * Recommends skills based on job title
 */
export async function recommendSkills(title: string) {
  try {
    const prompt = `
      As a technical recruiter, suggest exactly 10 most relevant skills for the job title: "${title}".
      Return them as a JSON object with a "skills" property containing an array of strings.
      Example: { "skills": ["React", "TypeScript", "Node.js"] }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '{}');
    return data.skills || [];
  } catch (error) {
    console.error('Skill recommendation error:', error);
    return [];
  }
}

/**
 * Screens multiple applicants against a job description
 */
export async function screenApplicants(job: any, applicants: any[]) {
  try {
    const prompt = `
      You are an expert AI recruiter. Evaluate the following candidates against the job description using their structured Talent Profile data.
      
      Job Details:
      Title: ${job.title}
      Requirements: ${job.requirements}
      Skills: ${job.skills}
      Experience: ${job.experience}
      Passing Score: ${job.passingScore || 70} / 100

      Evaluation Criteria:
      1. Required Fields Check: Ensure the candidate has provided First Name, Last Name, Email, Headline, Location, Skills, Experience, Education, Projects, and Availability.
      2. Skill Match: Compare candidate's skills (name, level, years) against job requirements.
      3. Experience Relevance: Evaluate if the work history and projects align with the role.
      4. Overall Fit: Assess the headline, bio, and certifications.

      Candidates Data (JSON):
      ${JSON.stringify(applicants.map((a: any) => ({ 
        applicantId: a.id || a.applicantId, 
        profile: a.profileData || a.profile
      })), null, 2)}

      Analyze all applicants against the job criteria. Score (0-100) and rank them.
      A candidate passes if their matchScore >= ${job.passingScore || 70}.
      
      Return a JSON array of results in this format:
      [
        {
          "applicantId": "string",
          "rank": number,
          "matchScore": number,
          "strengths": ["string"],
          "gaps": ["string"],
          "finalRecommendation": "string",
          "emailDraft": "string (Professional invitation or polite rejection based on score)"
        }
      ]
      Only return the JSON array.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error('AI Screening error:', error);
    throw error;
  }
}
