// src/lib/gemini.js - ✅ FULLY FIXED (Your version corrected)
import { GoogleGenerativeAI } from "@google/generative-ai";  // ✅ FIXED: Correct import & package

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);  // ✅ Constructor matches import

export const sendGeminiMessage = async (message, context = "home service") => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", 
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    const prompt = `You are a helpful assistant for home service estimations. Help with:
- Cost estimates for repairs/renovations
- Service descriptions  
- Timelines and materials
- Provider recommendations

Context: ${context}
User: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return { success: true, text };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      success: false, 
      text: "Sorry, I'm having trouble responding. Please try again." 
    };
  }
};

// For streaming (chat-like typing effect)
export const streamGeminiMessage = async (message, onToken) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(message);
    const stream = result.response.stream;  // ✅ FIXED: No await needed, direct .stream
    
    let fullText = '';
    for await (const chunk of stream) {
      const text = chunk.text();
      fullText += text;
      onToken(text);
    }
    
    return { success: true, text: fullText };
  } catch (error) {
    return { success: false, text: "Streaming error occurred." };
  }
};
