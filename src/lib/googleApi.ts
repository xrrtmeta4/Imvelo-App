/**
 * Google API utility - Securely manages Google API access
 * API Key is loaded from environment variables and never exposed in the client-side code
 */

const getGoogleApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google API Key not configured. Please add VITE_GOOGLE_API_KEY to .env');
  }
  
  return apiKey;
};

/**
 * Call Google Gemini API for AI functions
 * Use this instead of directly accessing the API key
 */
export const callGoogleGeminiAPI = async (
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
) => {
  const apiKey = getGoogleApiKey();
  
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 1024,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${options?.model ?? 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Call Google Vision API for image analysis
 * Use this for pest identification, disease detection, etc.
 */
export const callGoogleVisionAPI = async (
  imageUrl: string,
  feature: 'LABEL_DETECTION' | 'OBJECT_LOCALIZATION' | 'TEXT_DETECTION' | 'DOCUMENT_TEXT_DETECTION'
) => {
  const apiKey = getGoogleApiKey();

  const requestBody = {
    requests: [
      {
        image: {
          source: {
            imageUri: imageUrl,
          },
        },
        features: [
          {
            type: feature,
            maxResults: 10,
          },
        ],
      },
    ],
  };

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.statusText}`);
  }

  return response.json();
};

export default {
  getGoogleApiKey,
  callGoogleGeminiAPI,
  callGoogleVisionAPI,
};
