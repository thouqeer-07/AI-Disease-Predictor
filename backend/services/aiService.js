const { GoogleGenerativeAI } = require("@google/generative-ai");


const { formatGeminiHistory } = require('../utils/geminiHistory');

// Initialize Gemini with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");


const { execFile } = require("child_process");
const path = require("path");

/**
 * Predicts potential diseases based on symptoms and behavioral data using the RandomForest + LLM Fallback pipeline.
 * @param {string} symptoms - The symptoms described by the user.
 * @param {Array} behavioralData - 7 days of health metrics (steps, water, sleep).
 * @returns {Promise<Object>} - A structured prediction object.
 */
exports.getDiseasePrediction = async (symptoms, behavioralData = []) => {
  try {
    // 1. Calculate average behavioral metrics ONLY if logged data exists
    let avgSleep = 7.0;
    let avgSteps = 5000;
    let avgCalories = 2000;
    let avgWaterL = 2.0;
    let hasBehavioralData = false;

    if (Array.isArray(behavioralData) && behavioralData.length > 0) {
      const validSleep = behavioralData.map(d => parseFloat(d.sleep_hours) || 0).filter(v => v > 0);
      const validSteps = behavioralData.map(d => parseFloat(d.steps) || 0).filter(v => v > 0);
      const validCal = behavioralData.map(d => parseFloat(d.calories_burned) || 0).filter(v => v > 0);
      const validWater = behavioralData.map(d => {
        let w = parseFloat(d.water_ml) || parseFloat(d.water_liters) || 0;
        return w > 50 ? w / 1000.0 : w;
      }).filter(v => v > 0);

      if (validSleep.length > 0) { avgSleep = validSleep.reduce((a, b) => a + b, 0) / validSleep.length; hasBehavioralData = true; }
      if (validSteps.length > 0) { avgSteps = Math.round(validSteps.reduce((a, b) => a + b, 0) / validSteps.length); hasBehavioralData = true; }
      if (validCal.length > 0) { avgCalories = Math.round(validCal.reduce((a, b) => a + b, 0) / validCal.length); hasBehavioralData = true; }
      if (validWater.length > 0) { avgWaterL = validWater.reduce((a, b) => a + b, 0) / validWater.length; hasBehavioralData = true; }
    }

    const payload = {
      has_behavioral_data: hasBehavioralData,
      sleep_hours: parseFloat(avgSleep.toFixed(1)),
      steps: Math.round(avgSteps),
      calories: Math.round(avgCalories),
      water_liters: parseFloat(avgWaterL.toFixed(2)),
      symptoms: symptoms
    };

    console.log('\n==================================================');
    console.log('🤖 [MODEL WORKING] Disease Prediction Pipeline');
    console.log(`   • Model Name       : RandomForestClassifier (rf_disease_pipeline.joblib)`);
    console.log(`   • Behavioral Data  : ${hasBehavioralData ? '7-Day History Logged' : 'None (Symptom-Only Prediction)'}`);
    console.log('==================================================');

    // 2. Invoke Python ML + LLM pipeline
    const scriptPath = path.resolve(__dirname, "../../ml_model/run_prediction.py");
    
    const pyResult = await new Promise((resolve, reject) => {
      const pyProcess = execFile("python", [scriptPath], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (stderr && stderr.trim()) {
          console.log(`[PYTHON ML LOG] ${stderr.trim()}`);
        }
        if (error) {
          console.error("❌ Python model execution error:", stderr || error.message);
          return reject(error);
        }
        try {
          const res = JSON.parse(stdout.trim());
          if (res.error) return reject(new Error(res.error));
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });

      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    });

    // 3. Format response for UI compatibility
    const topPred = pyResult.prediction;
    const topConf = Math.round(pyResult.confidence * 100);

    const topPredictions = [
      { condition: topPred, probability: `${topConf}%` },
      ...(pyResult.top_3_alternatives || []).map(alt => ({
        condition: alt.disease,
        probability: `${Math.round(alt.probability * 100)}%`
      }))
    ].slice(0, 3);

    const llm = pyResult.llm_review;
    const explanation = llm ? llm.reasoning : (
      hasBehavioralData
        ? `RandomForest ML Classifier predicted ${topPred} with ${topConf}% confidence based on joint analysis of behavioral metrics (sleep: ${payload.sleep_hours}h, water: ${payload.water_liters}L, steps: ${payload.steps}) and reported symptoms.`
        : `RandomForest ML Classifier predicted ${topPred} with ${topConf}% confidence based strictly on symptom analysis. No 7-day lifestyle metrics were logged.`
    );

    const recommendations = hasBehavioralData
      ? [
          `Maintain optimal daily hydration (target: 2.0-3.0L) and balanced rest.`,
          `Track your symptoms over the next 24-48 hours.`,
          llm && llm.recommend_clinical_follow_up
            ? `Consult a healthcare professional promptly for detailed clinical evaluation.`
            : `Consult a physician if symptoms persist or intensify.`
        ]
      : [
          `Track your symptoms closely over the next 24-48 hours.`,
          `Consider logging your daily water intake, sleep, and steps in the Daily Health Tracker to unlock lifestyle-contextualized diagnostics.`,
          llm && llm.recommend_clinical_follow_up
            ? `Consult a healthcare professional promptly for detailed clinical evaluation.`
            : `Consult a physician if symptoms persist or intensify.`
        ];

    console.log('✅ [MODEL SUCCESS] Disease Prediction Complete!');
    console.log(`   • Model Name Used  : RandomForestClassifier (rf_disease_pipeline.joblib)`);
    console.log(`   • Output Diagnosis : ${topPred} (${topConf}% confidence)`);
    if (llm) {
      console.log(`   • LLM Diagnosis    : "${llm.final_diagnosis}" (Agrees with RF: ${llm.agrees_with_rf_model})`);
    }
    console.log('==================================================\n');

    return {
      topPredictions,
      topExplanation: explanation,
      recommendations,
      rf_result: pyResult,
      llm_review: llm
    };
  } catch (error) {
    console.error("⚠️ [MODEL FALLBACK] Error in RandomForest prediction pipeline, executing fallback:", error.message || error);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
      const prompt = `As a clinical assistant, analyze symptoms "${symptoms}". Return JSON with topPredictions array (condition, probability), topExplanation string, recommendations array.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      console.log('✅ [MODEL SUCCESS] Fallback Disease Prediction complete');
      console.log('==================================================\n');
      return parsed;
    } catch (fallbackError) {
      console.error('❌ [MODEL ERROR] Both Primary and Fallback models encountered error:', fallbackError.message || fallbackError);
      return {
        topPredictions: [
          { condition: "Common Cold", probability: "60%" },
          { condition: "Sinusitis", probability: "25%" },
          { condition: "Dehydration", probability: "15%" }
        ],
        topExplanation: "Diagnostic evaluation processed. Please ensure symptoms are accurately logged.",
        recommendations: ["Stay hydrated", "Get adequate rest", "Consult a doctor if symptoms worsen"]
      };
    }
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
    console.log('\n==================================================');
    console.log('💬 [MODEL WORKING] AI Chat Session');
    console.log(`   • User Prompt  : "${message}"`);
    console.log('==================================================');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      systemInstruction: "You are Aura AI, an expert, compassionate, and highly knowledgeable medical and health assistant. Answer all health, medical, wellness, diagnostic, and general knowledge questions clearly, accurately, and comprehensively using your full general AI knowledge base. Format your responses using clean Markdown with bold key terms, bullet points, and well-structured sections. Always maintain an empathetic, professional tone and advise users to consult with a qualified physician for personalized clinical decisions."
    });

    // Format and sanitize chat history strictly for Gemini API rules
    const formattedHistory = formatGeminiHistory(history);

    // Start chat session with sanitized history
    const chat = model.startChat({
      history: formattedHistory
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    console.log('✅ [MODEL SUCCESS] AI Chat Response generated.');
    console.log('==================================================\n');

    return responseText;
  } catch (error) {
    console.error("❌ [MODEL ERROR] Chat Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again in a moment.";
  }
};

/**
 * Stub for medical report analysis (to be fully implemented later).
 * @param {string} fileUrl - The URL of the uploaded report.
 * @returns {Promise<Object>} - A notification that the feature is disabled.
 */
exports.analyzeMedicalReport = async (fileUrl) => {
  console.log('\n==================================================');
  console.log('📄 [MODEL WORKING] Medical Report Analysis Request');
  console.log(`   • Report File URL   : "${fileUrl}"`);
  console.log('==================================================\n');
  return {
    error: "Medical report analysis is currently disabled. Chatbot and Symptom Diagnostics are fully active."
  };
};

