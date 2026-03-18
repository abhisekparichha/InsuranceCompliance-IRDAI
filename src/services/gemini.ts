import { GoogleGenAI, Type } from "@google/genai";
import { Obligation, KnowledgeBaseSummary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const analyzeGuidelines = async (urls: string[]): Promise<{ summary: KnowledgeBaseSummary, obligations: Obligation[] }> => {
  if (urls.length === 0) return { summary: { overview: "", keyThemes: [], regulatoryScope: "" }, obligations: [] };

  const prompt = `
    Analyze the insurance and financial guidelines from the following URLs.
    
    1. Provide a high-level overview of the regulatory landscape covered by these documents.
    2. Identify the key themes (e.g., consumer protection, digital transformation, risk management).
    3. Define the regulatory scope (who do these apply to?).
    4. Perform an itemized extraction of EVERY numbered clause, section, or distinct requirement from the documents.
       Each numbered item in the regulation MUST be an individual obligation item.
       
       For each item, provide:
       - Title (e.g., "Clause 1.1: Registration Requirements").
       - Detailed description of the requirement.
       - Category (e.g., Claims, Underwriting, Privacy, Disclosure).
       - Priority (High, Medium, or Low).
       - The specific source URL.
       - Action Item: Specify a concrete action required for compliance (e.g., "Update policy wording", "Submit quarterly report"). If the item is purely informational or no action is required, state "Not applicable".

    Format the output as a JSON object with this structure:
    {
      "summary": {
        "overview": string,
        "keyThemes": string[],
        "regulatoryScope": string
      },
      "obligations": [
        {
          "title": string,
          "description": string,
          "category": string,
          "priority": "High" | "Medium" | "Low",
          "sourceUrl": string,
          "actionItem": string
        }
      ]
    }

    URLs: ${urls.join(", ")}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ urlContext: {} }]
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text);
    const obligations = (parsed.obligations || []).map((item: any, index: number) => ({
      ...item,
      id: `obl-${Date.now()}-${index}`
    }));

    return {
      summary: parsed.summary || { overview: "", keyThemes: [], regulatoryScope: "" },
      obligations
    };
  } catch (error) {
    console.error("Error analyzing guidelines:", error);
    return { 
      summary: { overview: "Error analyzing guidelines.", keyThemes: [], regulatoryScope: "Unknown" }, 
      obligations: [] 
    };
  }
};

export const queryCompliance = async (query: string, urls: string[], history: { role: string, content: string }[]) => {
  const systemInstruction = `
    You are an expert Insurance Compliance Consultant specializing in IRDAI (Insurance Regulatory and Development Authority of India) and RBI (Reserve Bank of India) regulations.
    
    Your primary knowledge base consists of the following documents:
    ${urls.join('\n')}

    Your goal is to provide accurate, professional, and actionable compliance advice based STRICTLY ON THE PROVIDED GUIDELINES.
    
    Guidelines for your response:
    1. ALWAYS check the provided URLs using your tools to find the most relevant information.
    2. Refer to specific sections, regulation numbers, or clauses from the documents when possible.
    3. If a query is about a topic not covered in these specific documents, state that clearly but offer general guidance based on standard IRDAI/RBI practices if you are certain.
    4. Maintain a professional, authoritative, and helpful tone.
    5. Use Markdown for clear formatting (bullet points, bold text for emphasis).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
        { parts: [{ text: `Referencing the provided regulatory documents, please answer: ${query}` }] }
      ],
      config: {
        systemInstruction,
        tools: [{ urlContext: {} }]
      },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Error querying compliance:", error);
    return "An error occurred while processing your query. Please check your connection and try again.";
  }
};
