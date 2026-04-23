// ====================================================================
// ClearPath — Z.AI GLM API Integration
// OpenAI-compatible endpoint for medical triage reasoning
// ====================================================================

const GLM_ENDPOINT = '/api/ilmu/v1/chat/completions';

const SYSTEM_PROMPT = `You are ClearPath's medical triage AI for a Malaysian public hospital emergency department. You receive unstructured patient intake data (which may be in English, Bahasa Malaysia, or mixed Manglish) and incomplete vitals. You must:

1. Parse the chief complaint and extract: primary symptom, duration, severity indicators, red flag symptoms
2. Classify using Malaysian Emergency Triage (P1=Immediate/life-threatening, P2=Emergency, P3=Urgent, P4=Semi-urgent, P5=Non-urgent)
3. Assign a triage score (1-100, where 100 = most critical)
4. Generate a clinical reasoning summary (2-3 sentences explaining your classification)
5. List specific red flag symptoms detected (or state none)
6. Generate workflow orders — a JSON list of actions to trigger downstream:
   - bed_assignment: { ward: string, bed_type: "resus"/"critical"/"general", urgency: "immediate"/"within_30min"/"within_2hr" }
   - doctor_alert: { specialty: string, message: string, urgency: "stat"/"urgent"/"routine" }
   - lab_orders: array of { test: string, urgency: string }
   - imaging_orders: array of { type: string, body_part: string, urgency: string }
   - pharmacy_prep: array of { medication: string, reason: string }
   - nursing_actions: array of strings (immediate bedside actions)
7. Flag if the case has ambiguity or missing data and what you'd need to improve accuracy
8. Output ONLY valid JSON in this exact schema — no prose, no markdown, no code fences:

{
  "triage_level": "P1|P2|P3|P4|P5",
  "triage_score": number,
  "chief_complaint": "string",
  "red_flags": ["string"],
  "clinical_reasoning": "string",
  "confidence": "high|medium|low",
  "ambiguity_flags": ["string"],
  "workflow_orders": {
    "bed_assignment": { "ward": "string", "bed_type": "string", "urgency": "string" },
    "doctor_alert": { "specialty": "string", "message": "string", "urgency": "string" },
    "lab_orders": [{ "test": "string", "urgency": "string" }],
    "imaging_orders": [{ "type": "string", "body_part": "string", "urgency": "string" }],
    "pharmacy_prep": [{ "medication": "string", "reason": "string" }],
    "nursing_actions": ["string"]
  },
  "estimated_wait_minutes": number
}`;

/**
 * Call Z.AI GLM API for medical triage reasoning
 * @param {string} apiKey - Z.AI API key
 * @param {object} patientData - { complaint, age, allergies, medications, vitals }
 * @returns {object} Parsed triage result JSON
 */
export async function callGLMTriage(apiKey, patientData) {
  const { complaint, age, allergies, medications, vitals } = patientData;

  // Build the user message with all available data
  let userMessage = `PATIENT INTAKE:\nChief Complaint: ${complaint}`;
  if (age) userMessage += `\nAge: ${age}`;
  if (allergies) userMessage += `\nKnown Allergies: ${allergies}`;
  if (medications) userMessage += `\nCurrent Medications: ${medications}`;

  if (vitals) {
    const vitalEntries = [];
    if (vitals.bp) vitalEntries.push(`Blood Pressure: ${vitals.bp}`);
    if (vitals.hr) vitalEntries.push(`Heart Rate: ${vitals.hr} bpm`);
    if (vitals.spo2) vitalEntries.push(`SpO2: ${vitals.spo2}%`);
    if (vitals.temp) vitalEntries.push(`Temperature: ${vitals.temp}°C`);
    if (vitalEntries.length > 0) {
      userMessage += `\n\nVitals:\n${vitalEntries.join('\n')}`;
    } else {
      userMessage += '\n\nVitals: Not recorded';
    }
  } else {
    userMessage += '\n\nVitals: Not recorded';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(GLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'ilmu-glm-5.1',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`GLM API error ${response.status}: ${errorBody || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('GLM returned empty response');
    }

    // Try to parse the JSON from the response (may be wrapped in code fences)
    const parsed = parseGLMResponse(content);
    return parsed;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('GLM API request timed out after 30 seconds. Please retry.');
    }
    throw error;
  }
}

/**
 * Parse GLM response, handling potential markdown code fences
 */
function parseGLMResponse(content) {
  let jsonStr = content.trim();

  // Remove markdown code fences if present
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const result = JSON.parse(jsonStr);
    // Validate required fields
    if (!result.triage_level || !result.workflow_orders) {
      throw new Error('Missing required fields in GLM response');
    }
    return result;
  } catch (e) {
    throw new Error(`Failed to parse GLM triage response: ${e.message}`);
  }
}
