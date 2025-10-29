
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import { Analysis, ChatMessage, Document } from '../types';

// IMPORTANT: In a real production app, use a backend proxy to protect this API key.
const API_KEY = "YOUR_GEMINI_API_KEY"; 

// Fix: Correctly compare against the actual placeholder key.
export const isApiKeySet = API_KEY.length > 0 && !API_KEY.includes("YOUR_GEMINI_API_KEY");

// Fix: Create a function to check for the API key, which will be called by API-dependent functions.
function checkApiKey() {
  if (!isApiKeySet) {
    throw new Error("API_KEY has not been set. Please add your Gemini API key in services/gemini.ts to run the application.");
  }
}

const genAI = new GoogleGenerativeAI(API_KEY);
const analysisModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Extract text from PDFs and images using Gemini vision capability
 * With retry logic for handling rate limits
 */
export async function extractTextWithGemini(base64Data: string, mimeType: string, retries = 3): Promise<string> {
  checkApiKey();
  
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Create the prompt for text extraction
      const prompt = `Extract all text from this document. Return ONLY the extracted text, preserving the structure, formatting, and content as it appears in the document. Do not add any explanations, analysis, or comments. Just return the raw text content.`;
      
      // Generate content using the document as an image
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      if (text && text.trim().length > 0) {
        return text;
      } else {
        throw new Error("Empty response from Gemini");
      }
      
    } catch (error: any) {
      console.error(`Gemini text extraction attempt ${attempt}/${retries} failed:`, error);
      
      // Check if it's a rate limit or service unavailable error
      if ((error.message?.includes('503') || error.message?.includes('overloaded') || error.message?.includes('unavailable')) && attempt < retries) {
        const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Service overloaded, waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await sleep(waitTime);
        continue;
      }
      
      // If this was the last attempt or not a retryable error, throw
      if (attempt === retries) {
        throw new Error(`Failed to extract text using Gemini after ${retries} attempts. The document might not be readable or the service is unavailable.`);
      }
    }
  }
  
  throw new Error("Failed to extract text using Gemini after all retries.");
}

export async function analyzeDocumentCompliance(documentText: string): Promise<Omit<Analysis, 'id' | 'documentId' | 'createdAt' | 'processingTime'>> {
  // Fix: Check for the API key at the time of the call.
  checkApiKey();
  
  const prompt = `
    You are "IndiaLawAI", a specialized legal compliance analysis agent. Your task is to analyze the provided document text against the context of Indian law.

    You must evaluate the document based on four key compliance categories:
    1. GST (Goods and Services Tax)
    2. Labor Laws (e.g., Payment of Wages Act, Shops and Establishment Act)
    3. Contract Validity (as per the Indian Contract Act, 1872)
    4. Data Protection (as per the Digital Personal Data Protection Act, 2023)

    Based on your analysis, you must perform the following actions:
    1.  Identify specific clauses or omissions that pose a compliance risk.
    2.  Classify each risk as HIGH, MEDIUM, or LOW.
    3.  Provide a specific citation from an Indian Act, Rule, or legal precedent for each risk.
    4.  Suggest a concrete, actionable recommendation to remediate each risk.
    5.  Calculate a score (0-100) for each of the four categories based on compliance level.
    6.  Calculate a final "IndiaLaw Score" (0-100). The base score is 100. Apply penalties for each identified risk: -15 for each HIGH risk, -8 for each MEDIUM risk, and -3 for each LOW risk. The score cannot go below 0.

    You MUST return your entire output as a single, valid JSON object. Do not include any text or explanations outside of the JSON structure.
    The JSON structure should be:
    {
      "indiaLawScore": number,
      "riskSummary": { "high": number, "medium": number, "low": number },
      "categoryScores": [ { "category": "GST" | "Labor" | "Contract Validity" | "Data Protection", "score": number } ],
      "risks": [ { "level": "HIGH" | "MEDIUM" | "LOW", "category": "...", "description": string, "citation": string, "recommendation": string } ]
    }

    Here is the document text to analyze:
    ---
    ${documentText.substring(0, 30000)}
    ---
  `;

  try {
    const generationConfig: GenerationConfig = {
        temperature: 0.1,
    };

    const result = await analysisModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
    });

    const response = result.response;
    const jsonText = response.text();
    
    // Try to extract JSON from the response text
    let analysisResult;
    try {
      // Look for JSON block in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse JSON from response:", jsonText);
      throw new Error("AI response was not in valid JSON format");
    }
    
    if (analysisResult.risks) {
        analysisResult.risks = analysisResult.risks.map((risk: any, index: number) => ({
            ...risk,
            id: `risk-${Date.now()}-${index}`
        }));
    }

    return analysisResult;
  } catch (error) {
    console.error("Error analyzing document with Gemini:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("Your Gemini API key is not valid. Please check the key in services/gemini.ts.");
    }
    throw new Error("Failed to get a valid analysis from the AI model. Check if the API key is correct and the model is available.");
  }
}

export async function* startChatStream(document: Document, history: ChatMessage[], newMessage: string): AsyncGenerator<Partial<ChatMessage>, void, unknown> {
  // Fix: Check for the API key at the time of the call.
  checkApiKey();

  // Build the context prompt
  const contextPrompt = `You are a "Grounded Legal Q&A Agent" for IndiaLawAI. Your purpose is to answer user questions about a specific legal document they have provided.
- Your answers must be grounded *only* in the provided document text and your knowledge of relevant Indian laws.
- When you cite a law, be specific (e.g., "Section 73 of the Indian Contract Act, 1872").
- If the document does not contain information to answer the question, state that clearly.
- Keep your answers concise and to the point.
- Do not answer questions that are outside the scope of the provided document or Indian law.

The user has uploaded a document named "${document.name}". Here is a summary of its analysis:
${document.analysis?.risks.map(r => `- ${r.description} (${r.level} risk)`).join('\n') || 'No analysis available.'}
Here are the first 5000 characters of the document:
---
${atob(document.content).substring(0, 5000)}
---
Now, answer the user's questions based on this context.`;

  const modelWithSystemInstruction = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const chat = modelWithSystemInstruction.startChat({
      history: [
        ...history.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        { role: 'user', parts: [{ text: contextPrompt }] }
      ]
  });

  try {
    const result = await chat.sendMessageStream(newMessage);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield { content: chunkText };
      }
    }
  } catch (error) {
      console.error("Error in chat stream:", error);
      yield { content: "Sorry, an error occurred while processing your request. Please check your API key and network connection." };
  }
}
