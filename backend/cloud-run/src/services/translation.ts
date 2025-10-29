import { v2 } from '@google-cloud/translate';

const translate = new v2.Translate({
  keyFilename: process.env.SERVICE_ACCOUNT_PATH || './config/service-account.json',
  projectId: process.env.GCP_PROJECT_ID,
});

export class TranslationService {
  /**
   * Detect language of text
   */
  static async detectLanguage(text: string): Promise<string> {
    try {
      const [detections] = await translate.detect(text.substring(0, 1000));
      // Handle DetectResult type - it might be an array or object
      const detection = Array.isArray(detections) ? detections[0] : detections;
      if (!detection || typeof detection !== 'object') return 'en';
      return (detection as any).language || 'en';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Translate text to target language
   */
  static async translateText(text: string, targetLanguage: string): Promise<string> {
    if (!text || !targetLanguage || targetLanguage === 'en') {
      return text; // No translation needed
    }

    try {
      const [translation] = await translate.translate(text, targetLanguage);
      return translation || text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original on error
    }
  }

  /**
   * Translate with glossary support (preserve legal terms)
   */
  static async translateWithGlossary(
    text: string,
    targetLanguage: string,
    glossaryTerms: string[] = []
  ): Promise<string> {
    // Simple implementation - can be enhanced with custom glossary
    let translated = await this.translateText(text, targetLanguage);

    // Preserve common legal terms
    const legalTerms: Record<string, Record<string, string>> = {
      hi: {
        'GST': 'जीएसटी',
        'Reverse Charge Mechanism': 'रिवर्स चार्ज मैकेनिज्म',
      },
      ta: {
        'GST': 'ஜி.எஸ்.டி',
      },
      // Add more language mappings as needed
    };

    const terms = legalTerms[targetLanguage] || {};
    for (const [english, translated] of Object.entries(terms)) {
      // Replace translated term with correct translation
      translated.replace(new RegExp(english, 'gi'), translated);
    }

    return translated;
  }
}

