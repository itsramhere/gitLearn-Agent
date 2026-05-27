export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn("⚠️ GEMINI_API_KEY is missing or invalid. Using a mock response for testing.");
    return '{"mocked": "response"}'; // Fallback so tests don't crash if they haven't set it yet
  }

  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  let lastError = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let retries = 0;
    const maxRetries = 3;
    const delays = [2000, 4000, 8000];

    while (true) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      }

      if (response.status === 503) {
        if (retries < maxRetries) {
          const delay = delays[retries];
          console.warn(`⚠️ [Gemini API] Got 503 (Service Unavailable) for ${model}. Retrying in ${delay / 1000}s (Retry ${retries + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue; // retry the same model
        } else {
          console.warn(`❌ [Gemini API] Got 503 for ${model} and exhausted all ${maxRetries} retries.`);
          lastError = `503 Service Unavailable after ${maxRetries} retries`;
          break; // Try the next model
        }
      }

      if (response.status === 429) {
        console.warn(`\n⚠️ [Gemini API] Quota exceeded for ${model}. Falling back to next model...`);
        lastError = await response.text();
        break; // Try the next model
      }

      const errorText = await response.text();
      throw new Error(`Gemini API Error (${model}): ${errorText}`);
    }
  }

  throw new Error(`Gemini API Error: Quota exceeded for all available models. Last error: ${lastError}`);
}

export async function inferSkillLevelWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return "Intermediate"; // Mocked response if no API key
  }

  const rawResponse = await generateWithGemini(
    prompt + "\n\nBased on these answers, reply ONLY with a single word skill level (e.g., 'Beginner', 'Intermediate', 'Advanced'). Do not include any other text."
  );
  
  return rawResponse.trim();
}
