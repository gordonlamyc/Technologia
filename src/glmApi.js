// ====================================================================
// glmApi.js — Z.AI GLM API Integration Layer
//
// This module is the bridge between the ClearPath UI and the Z.AI
// language model (ilmu-glm-5.1). It has two responsibilities:
//
//   1. callGLMTriage()    — Builds the API request and returns parsed JSON
//   2. parseGLMResponse() — Cleans up the raw string the model returns
//
// The model receives a structured prompt and responds with a JSON object
// containing the triage classification, clinical reasoning, and a full
// set of downstream workflow orders for the hospital.
//
// The endpoint is proxied through Vite's dev server (see vite.config.js)
// to avoid CORS issues — any request to /api/ilmu/* is forwarded to
// https://api.ilmu.ai/*.
// ====================================================================

// Relative URL — resolved to https://api.ilmu.ai/v1/chat/completions
// by the Vite proxy (configured in vite.config.js)
const GLM_ENDPOINT = '/api/ilmu/v1/chat/completions';

// ====================================================================
// SYSTEM PROMPT
// This is the instruction given to the AI at the start of every chat.
// It tells the model exactly what role it plays, what inputs to expect,
// how to classify patients (Malaysian triage scale P1–P5), and — most
// importantly — the exact JSON schema it must return.
//
// Key design decisions:
//   • Multilingual: explicitly tells the model to handle English, BM, Manglish
//   • Strict output: "Output ONLY valid JSON" prevents prose or markdown wrapping
//   • Workflow orders: the model generates structured downstream actions
//     (bed assignment, doctor alert, lab/imaging/pharmacy/nursing orders)
//     so the UI can animate these tasks automatically
// ====================================================================
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
 * callGLMTriage()
 * ---------------
 * Sends patient intake data to the Z.AI GLM API and returns a parsed
 * triage result object.
 *
 * How it works:
 *   1. Destructures patientData into its components
 *   2. Builds a plain-text "user message" that the AI receives alongside
 *      the SYSTEM_PROMPT above
 *   3. Sends a POST request to the GLM endpoint (via Vite proxy)
 *   4. Parses the JSON response and validates required fields
 *
 * A 30-second AbortController timeout is attached to prevent the UI from
 * hanging indefinitely if the API is slow or unreachable.
 *
 * @param {string} apiKey        - Z.AI API key (entered by the user in the header)
 * @param {object} patientData   - Patient intake form data with shape:
 *                                   { complaint, age, allergies, medications, vitals }
 *                                   where vitals = { bp, hr, spo2, temp }
 * @returns {Promise<object>}    - Parsed triage JSON matching the SYSTEM_PROMPT schema
 * @throws {Error}               - If API call fails, times out, or response is invalid JSON
 */
export async function callGLMTriage(apiKey, patientData) {
  // Pull individual fields out of the patient data object
  const { complaint, age, allergies, medications, vitals } = patientData;

  // Build the user message — always starts with the chief complaint,
  // then appends optional fields only if they were provided by the nurse
  let userMessage = `PATIENT INTAKE:\nChief Complaint: ${complaint}`;
  if (age) userMessage += `\nAge: ${age}`;
  if (allergies) userMessage += `\nKnown Allergies: ${allergies}`;
  if (medications) userMessage += `\nCurrent Medications: ${medications}`;

  // Append vitals section — only add individual vital signs that were actually recorded
  // This mirrors real ED practice where vitals may be incomplete for walk-in patients
  if (vitals) {
    const vitalEntries = [];
    if (vitals.bp)   vitalEntries.push(`Blood Pressure: ${vitals.bp}`);
    if (vitals.hr)   vitalEntries.push(`Heart Rate: ${vitals.hr} bpm`);
    if (vitals.spo2) vitalEntries.push(`SpO2: ${vitals.spo2}%`);
    if (vitals.temp) vitalEntries.push(`Temperature: ${vitals.temp}°C`);

    if (vitalEntries.length > 0) {
      // At least one vital was recorded — format as a list
      userMessage += `\n\nVitals:\n${vitalEntries.join('\n')}`;
    } else {
      // Vitals object existed but all fields were empty
      userMessage += '\n\nVitals: Not recorded';
    }
  } else {
    // No vitals object at all (e.g. demo scenario without vitals)
    userMessage += '\n\nVitals: Not recorded';
  }

  // ----------------------------------------------------------------
  // Set up a 30-second abort timeout.
  // AbortController lets us cancel the fetch() if it hangs too long.
  // The signal is passed into fetch() and automatically cancels the
  // request when controller.abort() is called.
  // ----------------------------------------------------------------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 000 ms = 30 seconds

  try {
    const response = await fetch(GLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Z.AI requires Bearer token auth
      },
      body: JSON.stringify({
        model: 'ilmu-glm-5.1',  // The specific GLM model to call
        messages: [
          { role: 'system', content: SYSTEM_PROMPT }, // Sets the AI's behaviour
          { role: 'user',   content: userMessage },    // The actual patient data
        ],
        temperature: 0.3,   // Low temperature = more deterministic, less creative
                            // Medical decisions should be consistent, not random
        max_tokens: 2000,   // Upper limit on response length (JSON should be well within this)
      }),
      signal: controller.signal, // Attach the abort signal for the timeout
    });

    // If the fetch succeeded, cancel the timeout — we don't need it anymore
    clearTimeout(timeoutId);

    // HTTP error (4xx / 5xx) — throw with the status code + body for debugging
    if (!response.ok) {
      const errorBody = await response.text().catch(() => ''); // Safely read error body
      throw new Error(`GLM API error ${response.status}: ${errorBody || response.statusText}`);
    }

    // Parse the full response body as JSON
    const data = await response.json();

    // The GLM response follows the OpenAI chat completions format:
    // data.choices[0].message.content is where the AI's text sits
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('GLM returned empty response');
    }

    // Clean and parse the AI's JSON string (the model sometimes adds markdown fences)
    const parsed = parseGLMResponse(content);
    return parsed;

  } catch (error) {
    // Always cancel the timeout on any error path to avoid memory leaks
    clearTimeout(timeoutId);

    // AbortError means the 30-second timeout fired before the API responded
    if (error.name === 'AbortError') {
      throw new Error('GLM API request timed out after 30 seconds. Please retry.');
    }

    // Re-throw all other errors (network failures, parse errors, etc.)
    throw error;
  }
}

/**
 * parseGLMResponse()
 * ------------------
 * Cleans the raw string returned by the GLM model and parses it as JSON.
 *
 * Even though the SYSTEM_PROMPT explicitly says "no code fences", the model
 * occasionally wraps its output in markdown like:
 *   ```json
 *   { ... }
 *   ```
 * This function strips those fences before parsing, making it resilient to
 * slight variations in model behaviour.
 *
 * After parsing, it validates that the two most critical fields are present:
 *   • triage_level    — Needed to display the badge and colour
 *   • workflow_orders — Needed to render the orchestration panel
 *
 * @param {string} content  - Raw text content from the GLM API response
 * @returns {object}        - Validated triage result object
 * @throws {Error}          - If the content can't be parsed or is missing required fields
 */
function parseGLMResponse(content) {
  // Remove leading/trailing whitespace from the model's output
  let jsonStr = content.trim();

  // Strip markdown code fences if the model added them despite instructions
  // Handles both ```json\n...\n``` and ```\n...\n``` variants
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr
      .replace(/^```(?:json)?\s*\n?/, '') // Remove opening fence (with optional "json" tag)
      .replace(/\n?```\s*$/, '');          // Remove closing fence
  }

  try {
    const result = JSON.parse(jsonStr);

    // Basic sanity check — without these fields the UI will break
    if (!result.triage_level || !result.workflow_orders) {
      throw new Error('Missing required fields in GLM response');
    }

    return result; // Return the clean, validated triage object
  } catch (e) {
    // Wrap parse errors with a helpful message for debugging
    throw new Error(`Failed to parse GLM triage response: ${e.message}`);
  }
}
