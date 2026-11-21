/**
 * Utility function to sanitize and format chat history for Google Generative AI (Gemini) SDK.
 * 
 * Gemini API rules for startChat({ history }):
 * 1. The history must start with a 'user' turn (cannot start with 'model').
 * 2. Roles must strictly alternate between 'user' and 'model'.
 * 3. History must end with a 'model' turn so that a subsequent sendMessage call (which sends a 'user' turn) maintains proper alternation.
 */
function formatGeminiHistory(history) {
  const formatted = [];
  if (!Array.isArray(history)) return formatted;

  for (const item of history) {
    if (!item) continue;

    let role = (item.role === 'user' || item.role === 'human') ? 'user' : 'model';
    let text = '';

    if (item.parts && Array.isArray(item.parts) && item.parts[0]) {
      text = typeof item.parts[0] === 'string' ? item.parts[0] : (item.parts[0].text || '');
    } else if (typeof item.content === 'string') {
      text = item.content;
    }

    text = text.trim();
    if (!text) continue;

    // Discard any initial 'model' turn before the first 'user' turn
    if (formatted.length === 0 && role === 'model') {
      continue;
    }

    // Merge adjacent turns with the same role to enforce strict alternating order
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      formatted.push({ role, parts: [{ text }] });
    }
  }

  // History for startChat must end with a 'model' turn so sendMessage (the new 'user' turn) alternates properly.
  if (formatted.length > 0 && formatted[formatted.length - 1].role === 'user') {
    formatted.pop();
  }

  return formatted;
}

module.exports = { formatGeminiHistory };
