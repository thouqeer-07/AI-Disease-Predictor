const { GoogleGenerativeAI } = require("@google/generative-ai");


// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Predicts potential diseases based on symptoms and behavioral data.
 * @param {string} symptoms - The symptoms described by the user.
 * @param {Array} behavioralData - 7 days of health metrics (steps, water, sleep).
 * @returns {Promise<Object>} - A structured prediction object.
 */
exports.getDiseasePrediction = async (symptoms, behavioralData = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // 1. Prepare Behavioral Context Summary
    const lifestyleSummary = behavioralData.length > 0
      ? behavioralData.map(d => {
        const date = new Date(d.date).toLocaleDateString();
        return `Date: ${date} | Steps: ${d.steps || 0} | Sleep: ${d.sleep_hours || 0}h | Water: ${d.water_ml || 0}ml | Calories: ${d.calories_burned || 0}kcal`;
      }).join('\n')
      : "No behavioral data available for the past 7 days.";

    // 2. Construct the Clinical Prompt
    const prompt = `
      As an advanced AI Medical Diagnostic System, analyze the following patient data for potential conditions.
      
      PATIENT SYMPTOMS:
      ${symptoms}

      PAST 7 DAYS BEHAVIORAL/LIFESTYLE HISTORY:
      ${lifestyleSummary}

      INSTRUCTIONS:
      1. Identify the TOP 3 most likely diseases or conditions based on this data.
      2. For the #1 TOP PREDICTION, provide a detailed medical explanation connecting it to the symptoms and the 7-day behavioral data.
      3. Assign a probability percentage to each of the 3 conditions.

      RESPONSE FORMAT (Strict JSON ONLY):
      {
        "topPredictions": [
          { "condition": "Name of Condition 1", "probability": "85%" },
          { "condition": "Name of Condition 2", "probability": "10%" },
          { "condition": "Name of Condition 3", "probability": "5%" }
        ],
        "topExplanation": "A detailed, structured explanation for the #1 prediction, highlighting how their symptoms correlate with behavioral patterns like dehydration, low sleep, or activity levels.",
        "recommendations": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
      }

      Return ONLY the raw JSON object.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean and parse the AI response
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return {
      topPredictions: [
        { condition: "System Connectivity Issue", probability: "0%" },
        { condition: "Data Processing Error", probability: "0%" },
        { condition: "Network Timeout", probability: "0%" }
      ],
      topExplanation: "The AI engine encountered an error while analyzing your health data. Please verify your internet connection and API configuration.",
      recommendations: ["Check GEMINI_API_KEY", "Try again in a few moments"]
    };
  }
};

/**
 * Generates a chat response using conversation history.
 * @param {string} message - The new user message.
 * @param {Array} history - The chat history formatted for Gemini.
 * @returns {Promise<string>} - The model's response.
 */
exports.getChatResponse = async (message, history = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    // Start chat session with history
    const chat = model.startChat({
      history: history
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again in a moment.";
  }
};

/**
 * Stub for medical report analysis (to be fully implemented later).
 * @param {string} fileUrl - The URL of the uploaded report.
 * @returns {Promise<Object>} - A notification that the feature is disabled.
 */
exports.analyzeMedicalReport = async (fileUrl) => {
  return {
    error: "Medical report analysis is currently disabled. Chatbot and Symptom Diagnostics are fully active."
  };
};

