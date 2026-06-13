const aiService = require('../services/aiService');

exports.predictDisease = async (req, res) => {
  try {
    const { symptoms, behavioralData } = req.body;
    const prediction = await aiService.getDiseasePrediction(symptoms, behavioralData);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.chat = async (req, res) => {
  try {
    const { message, history } = req.body;
    const response = await aiService.getChatResponse(message, history);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.analyzeReport = async (req, res) => {
  try {
    const { fileUrl } = req.body;
    // In a real app, you'd use OCR here
    const analysis = await aiService.analyzeMedicalReport(fileUrl);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
