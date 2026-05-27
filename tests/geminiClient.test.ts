import { generateWithGemini } from '../src/core/geminiClient';
import { config } from 'dotenv';

config();

async function runTest() {
  console.log("Starting geminiClient 503 backoff tests...");

  const originalFetch = global.fetch;
  const originalSetTimeout = global.setTimeout;

  // Track the delays requested
  const actualDelays: number[] = [];
  (global as any).setTimeout = (cb: any, ms: number) => {
    actualDelays.push(ms);
    return originalSetTimeout(cb, 0);
  };

  try {
    // Test Case 1: 503 errors followed by a success
    let callCount = 0;
    (global as any).fetch = async (url: string, init: any) => {
      callCount++;
      if (callCount <= 3) {
        console.log(`[Mock Fetch] Call ${callCount}: returning 503`);
        return {
          ok: false,
          status: 503,
          text: async () => "Service Unavailable"
        } as any;
      }
      console.log(`[Mock Fetch] Call ${callCount}: returning 200 Success`);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Successful response after retries!" }] } }]
        })
      } as any;
    };

    console.log("\n--- Running Test 1: Successful response after 3 retries ---");
    // Ensure we have a valid key environment variable so it doesn't use the mock fallback
    process.env.GEMINI_API_KEY = "dummy_api_key";
    
    const response = await generateWithGemini("Hello");
    console.log(`Response received: "${response}"`);

    if (response !== "Successful response after retries!") {
      throw new Error(`Expected 'Successful response after retries!' but got '${response}'`);
    }

    console.log("Delays recorded:", actualDelays);
    if (JSON.stringify(actualDelays) !== JSON.stringify([2000, 4000, 8000])) {
      throw new Error(`Expected delays [2000, 4000, 8000] but got ${JSON.stringify(actualDelays)}`);
    }
    console.log("✅ Test 1 Passed!");

    // Test Case 2: 503 errors exceeding 3 retries, falls back to the next model
    console.log("\n--- Running Test 2: 503 errors exceeding max retries ---");
    callCount = 0;
    actualDelays.length = 0; // reset delays array
    let modelsCalled: string[] = [];

    (global as any).fetch = async (url: string, init: any) => {
      // Extract model name from URL
      const match = url.match(/\/models\/([^:]+):/);
      if (match) {
        modelsCalled.push(match[1]);
      }
      callCount++;
      console.log(`[Mock Fetch] Model: ${match ? match[1] : 'unknown'} - Call ${callCount} returning 503`);
      return {
        ok: false,
        status: 503,
        text: async () => "Service Unavailable"
      } as any;
    };

    try {
      await generateWithGemini("Hello");
      throw new Error("Expected generateWithGemini to fail after all models and retries failed");
    } catch (err: any) {
      console.log(`Expected failure received: "${err.message}"`);
      if (!err.message.includes("Quota exceeded for all available models") && !err.message.includes("503 Service Unavailable")) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    console.log("Models called:", modelsCalled);
    // Should have tried gemini-2.5-flash (4 times total: 1 initial + 3 retries)
    // and then fell back to gemini-2.5-flash-lite (4 times total: 1 initial + 3 retries)
    if (modelsCalled.length !== 8) {
      throw new Error(`Expected 8 total fetch calls (4 for flash, 4 for flash-lite), got ${modelsCalled.length}`);
    }

    const firstModelCalls = modelsCalled.filter(m => m === 'gemini-2.5-flash');
    const secondModelCalls = modelsCalled.filter(m => m === 'gemini-2.5-flash-lite');

    if (firstModelCalls.length !== 4 || secondModelCalls.length !== 4) {
      throw new Error(`Expected 4 calls per model, got Flash: ${firstModelCalls.length}, Lite: ${secondModelCalls.length}`);
    }

    console.log("Delays recorded for Test 2:", actualDelays);
    // 3 retries per model, so [2000, 4000, 8000] twice
    if (JSON.stringify(actualDelays) !== JSON.stringify([2000, 4000, 8000, 2000, 4000, 8000])) {
      throw new Error(`Expected delays [2000, 4000, 8000, 2000, 4000, 8000], got ${JSON.stringify(actualDelays)}`);
    }

    console.log("✅ Test 2 Passed!");
    console.log("\n🎉 All 503 Backoff Unit Tests Passed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Restore globals
    global.fetch = originalFetch;
    global.setTimeout = originalSetTimeout;
  }
}

runTest().catch(console.error);
