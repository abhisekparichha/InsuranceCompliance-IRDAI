import { GoogleGenAI } from "@google/genai";
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
      model: "gemini-2.5-flash-preview-05-20",
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

const ENTITY_CONTEXT: Record<string, string> = {
  insurance_company: 'The user is an Insurance Company licensed by IRDAI (Life, General, or Health insurer). Focus on obligations applicable to insurers — solvency margins, product approval, policy disclosures, claims settlement timelines, underwriting standards, grievance redressal, and statutory reporting.',
  corporate_agent: 'The user is a Corporate Agent (bank, NBFC, or other entity) engaged in insurance distribution under IRDAI Corporate Agents Regulations. Focus on bancassurance obligations, registration and renewal requirements, permissible activities, dos and don\'ts for corporate agents, insurer tie-up limits, and training mandates for specified persons.',
  specified_person: 'The user is a Specified Person — an individual agent or employee authorised to solicit and service insurance under a corporate agent. Focus on individual obligations, dos and don\'ts for specified persons, mandatory training and certification, customer disclosure requirements, and prohibited activities.',
  general: 'The user is making a general compliance query. Provide comprehensive guidance covering all applicable IRDAI and RBI regulations.',
};

export const queryCompliance = async (
  query: string,
  urls: string[],
  history: { role: string; content: string }[],
  entityType: string = 'general'
) => {
  const entityCtx = ENTITY_CONTEXT[entityType] || ENTITY_CONTEXT.general;

  const systemInstruction = `
    You are an expert Insurance Compliance Consultant specializing in IRDAI (Insurance Regulatory and Development Authority of India) and RBI (Reserve Bank of India) regulations. You serve as a front-facing compliance advisor for insurance companies, corporate agents (banks/NBFCs), and specified persons.

    Entity Context: ${entityCtx}

    Your primary knowledge base consists of the following regulatory documents:
    ${urls.join('\n')}

    Guidelines for your response:
    1. ALWAYS use your tools to access the provided URLs and find the most relevant regulatory provisions.
    2. Quote or reference specific sections, clauses, or regulation numbers wherever possible.
    3. Tailor your advice specifically to the entity type context provided above.
    4. If a query is outside the scope of these documents, state that clearly but offer guidance based on standard IRDAI/RBI practices if you are certain.
    5. Be professional, authoritative, and actionable. Provide clear, numbered compliance steps where appropriate.
    6. Use Markdown formatting — bullet points, **bold** for key terms, numbered lists for action steps, and headers for structure.
    7. End complex answers with: "_Always verify with the latest official IRDAI/RBI circulars and consult a qualified compliance officer._"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: `Referencing the provided regulatory documents, please answer: ${query}` }] }
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
