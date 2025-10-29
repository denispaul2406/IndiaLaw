import { VertexAI } from '@google-cloud/vertexai';
import * as path from 'path';

const projectId = process.env.GCP_PROJECT_ID || '';
const location = process.env.VERTEX_AI_LOCATION || 'asia-south1';

const vertexAI = new VertexAI({ project: projectId, location });

export class VertexAIService {
  private static dataStoreId = process.env.VERTEX_AI_SEARCH_DATA_STORE_ID;
  private static dataStoreLocation = process.env.VERTEX_AI_SEARCH_LOCATION || 'asia-south1';

  /**
   * Query knowledge base for relevant legal information
   */
  static async queryKnowledgeBase(query: string, maxResults: number = 5): Promise<any[]> {
    if (!this.dataStoreId) {
      console.warn('Vertex AI Search data store not configured');
      return [];
    }

    // This is a placeholder - actual implementation would use Vertex AI Search API
    // For now, return empty array - will be implemented with proper API calls
    try {
      // TODO: Implement actual Vertex AI Search query
      // const searchClient = new SearchServiceClient();
      // ... actual API call
      return [];
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      return [];
    }
  }

  /**
   * Analyze document with enhanced prompt and knowledge base grounding
   */
  static async analyzeDocument(
    documentText: string,
    referencedDocs: string[],
    knowledgeBaseContext: string[]
  ): Promise<any> {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const knowledgeBaseText = knowledgeBaseContext.join('\n\n---\n\n');

    const prompt = `
You are "IndiaLawAI", a specialized legal compliance analysis agent for Indian law.

CONTEXT PROVIDED:
1. Main Document Text:
---
${documentText.substring(0, 100000)}${documentText.length > 100000 ? '\n[... document truncated]' : ''}
---

2. Referenced Documents Mentioned:
${referencedDocs.length > 0 ? referencedDocs.map(doc => `- ${doc}`).join('\n') : 'None detected'}

3. Relevant Legal Knowledge Base Context:
${knowledgeBaseText || 'No additional context available'}

INSTRUCTIONS:
1. First, analyze if clauses exist in the main document OR referenced documents
2. Only flag risks if clause is missing in BOTH main doc AND incorporated docs
3. For RCM (Reverse Charge Mechanism):
   - Check Notification 13/2017 carefully
   - Works contracts are NOT generally under RCM
   - Only flag RCM if it's in the notified categories
4. Context-dependent analysis:
   - Data processing present → DPDP risk (HIGH if missing)
   - No data processing → No DPDP risk (or LOW)
5. Provide confidence scores (HIGH/MEDIUM/LOW) for each risk
6. For missing clauses, provide EXACT recommended clause text

You MUST return valid JSON with this structure:
{
  "indiaLawScore": number (0-100),
  "riskSummary": { "high": number, "medium": number, "low": number },
  "categoryScores": [
    { "category": "GST" | "Labor" | "Contract Validity" | "Data Protection", "score": number }
  ],
  "risks": [
    {
      "level": "HIGH" | "MEDIUM" | "LOW",
      "category": string,
      "description": string,
      "citation": string (specific section number),
      "recommendation": string,
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "foundInReferencedDocs": boolean,
      "contextReasoning": string (why this is/isn't a risk)
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "clauseTitle": string,
      "currentClause": string (what's missing) | null,
      "recommendedClause": string (EXACT text to add),
      "legalBasis": string
    }
  ],
  "knowledgeBaseCitations": ["Section X of Act Y", ...]
}

Return ONLY the JSON object, no other text.
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
        },
      });

      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Add IDs to risks
      if (analysis.risks) {
        analysis.risks = analysis.risks.map((risk: any, index: number) => ({
          ...risk,
          id: `risk-${Date.now()}-${index}`,
        }));
      }

      return analysis;
    } catch (error) {
      console.error('Error in document analysis:', error);
      throw error;
    }
  }

  /**
   * Generate answer for Q&A with multilingual support
   */
  static async generateAnswer(
    question: string,
    questionLanguage: string,
    documentText: string,
    analysisResults: any,
    knowledgeBaseContext: string[],
    conversationHistory: any[] = []
  ): Promise<string> {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const knowledgeBaseText = knowledgeBaseContext.join('\n\n---\n\n');

    const prompt = `
You are a "Grounded Legal Q&A Agent" for IndiaLawAI.

CONTEXT:
1. Document Text (first 10000 chars):
---
${documentText.substring(0, 10000)}
---

2. Document Analysis Results:
- IndiaLaw Score: ${analysisResults.indiaLawScore}
- Risks: ${analysisResults.risks?.length || 0} identified
- Category Scores: ${JSON.stringify(analysisResults.categoryScores || [])}

3. Relevant Legal Knowledge:
${knowledgeBaseText || 'None'}

4. Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER'S QUESTION (in ${questionLanguage}): ${question}

INSTRUCTIONS:
1. Answer based ONLY on the provided document and legal knowledge
2. Cite specific laws and sections when relevant
3. If information is not in the document, state that clearly
4. Answer in ${questionLanguage} language
5. Keep answers concise and accurate
6. Include legal citations when applicable

Answer in ${questionLanguage}:
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const response = result.response;
      return response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Error generating answer:', error);
      throw error;
    }
  }

  /**
   * Stream answer generation for real-time Q&A
   */
  static async* streamAnswer(
    question: string,
    questionLanguage: string,
    documentText: string,
    analysisResults: any,
    knowledgeBaseContext: string[],
    conversationHistory: any[] = []
  ): AsyncGenerator<string, void, unknown> {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const knowledgeBaseText = knowledgeBaseContext.join('\n\n---\n\n');

    const prompt = `
You are a "Grounded Legal Q&A Agent" for IndiaLawAI.

CONTEXT:
1. Document Text (first 10000 chars):
---
${documentText.substring(0, 10000)}
---

2. Document Analysis:
- IndiaLaw Score: ${analysisResults.indiaLawScore}
- ${analysisResults.risks?.length || 0} risks identified

3. Legal Knowledge:
${knowledgeBaseText || 'None'}

USER'S QUESTION (in ${questionLanguage}): ${question}

Answer in ${questionLanguage}, cite laws when relevant:
`;

    try {
      const result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      for await (const chunk of result.stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      console.error('Error streaming answer:', error);
      throw error;
    }
  }
}

