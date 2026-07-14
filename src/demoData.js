// ====================================================================
// demoData.js — Static Demo & Seed Data for ClearPath
//
// Purpose:
//   Provides three categories of static data that make the app feel
//   populated from the moment it loads:
//
//   1. DEMO_SCENARIOS   — 5 pre-written patient cases for Demo Mode.
//                         Each one covers a different triage priority (P1–P5)
//                         so the audience can see the full range in one run.
//
//   2. PRESEEDED_PATIENTS — 3 "already-triaged" patients pre-loaded into
//                           the patient history log on first render, so the
//                           dashboard is never empty.
//
//   3. generatePatientId / INITIAL_HOSPITAL_STATS — Helpers for numbering
//                           new patients and initialising the stats widgets.
// ====================================================================

/**
 * DEMO_SCENARIOS
 * --------------
 * An array of 5 patient intake objects used by the "Demo Mode" button.
 * Each object mirrors exactly what a nurse would type into the intake form
 * (complaint, age, allergies, medications, vitals).
 *
 * The scenarios deliberately span all 5 triage levels so a demo audience
 * can see every badge colour and workflow response:
 *   Index 0 → P1 (chest pain / possible MI)
 *   Index 1 → P2 (head injury / road accident)
 *   Index 2 → P2/P3 (high fever + respiratory)
 *   Index 3 → P4/P5 (minor sports injury)
 *   Index 4 → P5 (mild abdominal discomfort)
 *
 * Complaints are written in mixed English/BM/Manglish to showcase the
 * AI's multilingual parsing ability.
 */
export const DEMO_SCENARIOS = [
  {
    // Scenario 1 — Classic STEMI presentation (expected: P1)
    complaint: 'Chest pain radiating to left arm, 55 year old male, sweating profusely, feels like an elephant sitting on my chest',
    age: '55',
    allergies: 'Aspirin',           // Important — affects drug choice (no aspirin for this patient!)
    medications: 'Metformin 500mg, Amlodipine 5mg',
    vitals: { bp: '90/60', hr: '112', spo2: '94', temp: '37.2' },
    // Note: Low BP + high HR + low SpO2 are classic cardiogenic shock signs
  },
  {
    // Scenario 2 — Traumatic head injury with LOC (expected: P2)
    // Written in Manglish to test multilingual complaint parsing
    complaint: 'Kena langgar motor, unconscious for 2 minit, now confused, head injury, ada bleeding kat kepala, tak ingat apa jadi',
    age: '28',
    allergies: '',       // No known allergies
    medications: '',     // No regular medications
    vitals: { bp: '100/70', hr: '105', spo2: '96', temp: '37.0' },
  },
  {
    // Scenario 3 — Pneumonia / severe respiratory infection (expected: P2–P3)
    // Mixed BM complaint: "Demam 39.5" = "Fever 39.5°C", "tak larat langsung" = "completely exhausted"
    complaint: 'Demam 39.5 dah 3 hari, batuk darah sikit, shortness of breath, tak larat langsung, badan sakit semua',
    age: '42',
    allergies: 'Sulfa drugs',        // Rules out sulfamethoxazole/trimethoprim
    medications: 'Paracetamol',
    vitals: { bp: '120/80', hr: '98', spo2: '91', temp: '39.5' },
    // SpO2 of 91% is below the 94% threshold — clinically significant
  },
  {
    // Scenario 4 — Minor musculoskeletal injury (expected: P4–P5)
    complaint: 'Sprained ankle playing futsal, can walk slowly, no swelling but quite painful, happened 1 hour ago',
    age: '22',
    allergies: '',
    medications: '',
    vitals: { bp: '125/82', hr: '78', spo2: '99', temp: '36.8' },
    // Normal vitals — confirms this is non-urgent
  },
  {
    // Scenario 5 — Mild GI complaint (expected: P5)
    // "perut rasa bloated je" = "stomach just feels bloated"
    complaint: 'Sakit perut 2 hari, no vomiting, still eating normally, temp normal, perut rasa bloated je, mild discomfort',
    age: '35',
    allergies: '',
    medications: '',
    vitals: { bp: '118/76', hr: '72', spo2: '99', temp: '36.6' },
    // All vitals completely normal → lowest priority appropriate
  },
];

/**
 * PRESEEDED_PATIENTS
 * ------------------
 * 3 patients that are already "in the system" when the app first loads.
 * This makes the right-panel history log and activity feed non-empty,
 * giving a realistic look for demos and presentations.
 *
 * Each object contains:
 *   id            — Unique patient ID in format PT-YYYY-NNNN
 *   timestamp     — ISO string; set relative to NOW so they look recent
 *   complaint     — Raw intake complaint text
 *   age           — Patient age as string
 *   triageLevel   — Final triage classification (P1–P5)
 *   triageScore   — Numeric score 1–100 (100 = most critical)
 *   status        — Workflow status: 'TRIAGED' | 'ASSIGNED' | 'IN TREATMENT'
 *   fullResult    — The complete GLM response object (same shape as real API calls)
 */
export const PRESEEDED_PATIENTS = [
  {
    // Patient 1: Asthma exacerbation — moderate-high priority, already in treatment
    id: 'PT-2026-0044',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(), // 2.5 hours ago
    complaint: 'Shortness of breath, wheezing for 4 hours, history of asthma, tak boleh tidur',
    age: '34',
    triageLevel: 'P2',  // Emergency — requires prompt intervention
    triageScore: 78,
    status: 'IN TREATMENT', // Already receiving care (nebulizer, steroids)
    fullResult: {
      triage_level: 'P2',
      triage_score: 78,
      chief_complaint: 'Acute asthma exacerbation with prolonged wheezing and dyspnea',
      red_flags: ['Prolonged respiratory distress', 'Inability to sleep due to breathing difficulty'],
      clinical_reasoning: 'Patient presents with acute exacerbation of known asthma with 4-hour duration of wheezing and dyspnea. The inability to lie flat suggests moderate-to-severe airway compromise. Given the history and duration, this requires emergency-level response to prevent respiratory failure.',
      confidence: 'high',
      ambiguity_flags: [], // No ambiguity — clear asthma picture
      workflow_orders: {
        bed_assignment: { ward: 'Emergency', bed_type: 'critical', urgency: 'immediate' },
        doctor_alert: { specialty: 'Emergency Medicine', message: 'Acute asthma exacerbation, 4hr wheezing, consider nebulization and IV steroids', urgency: 'urgent' },
        lab_orders: [{ test: 'ABG', urgency: 'stat' }, { test: 'FBC', urgency: 'urgent' }],
        imaging_orders: [{ type: 'Chest X-ray', body_part: 'Chest', urgency: 'urgent' }],
        pharmacy_prep: [
          { medication: 'Salbutamol nebulizer 5mg', reason: 'Acute bronchospasm relief' },
          { medication: 'Ipratropium bromide 500mcg', reason: 'Combination bronchodilation' },
          { medication: 'IV Hydrocortisone 200mg', reason: 'Systemic anti-inflammatory' },
        ],
        nursing_actions: ['Continuous SpO2 monitoring', 'Position patient upright', 'Prepare nebulizer', 'Establish IV access'],
      },
      estimated_wait_minutes: 5,
    },
  },
  {
    // Patient 2: Minor cut — lowest priority, waiting for wound care
    id: 'PT-2026-0045',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(), // 1.2 hours ago
    complaint: 'Small cut on finger while cooking, bleeding controlled with plaster, tak sakit sangat',
    age: '29',
    triageLevel: 'P5',  // Non-urgent — can safely wait
    triageScore: 12,
    status: 'ASSIGNED', // Bed assigned but not yet seen by doctor
    fullResult: {
      triage_level: 'P5',
      triage_score: 12,
      chief_complaint: 'Minor laceration on finger, bleeding controlled',
      red_flags: [], // No red flags — reassuringly simple case
      clinical_reasoning: 'Minor superficial laceration with controlled bleeding. No signs of deep tissue involvement or neurovascular compromise. Patient is hemodynamically stable and can wait for wound care during routine processing.',
      confidence: 'high',
      ambiguity_flags: [],
      workflow_orders: {
        bed_assignment: { ward: 'Outpatient', bed_type: 'general', urgency: 'within_2hr' },
        doctor_alert: { specialty: 'General Practice', message: 'Minor finger laceration for wound care', urgency: 'routine' },
        lab_orders: [],    // No labs needed for a minor cut
        imaging_orders: [], // No imaging needed
        pharmacy_prep: [{ medication: 'Tetanus toxoid (if due)', reason: 'Laceration wound prophylaxis' }],
        nursing_actions: ['Clean wound with saline', 'Apply sterile dressing', 'Check tetanus immunization status'],
      },
      estimated_wait_minutes: 120,
    },
  },
  {
    // Patient 3: Post-travel fever with rash — suspicious for dengue/malaria
    id: 'PT-2026-0046',
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(), // 30 minutes ago (most recent)
    complaint: 'High fever 40.1, very lethargic, rash on both arms, just came back from Sabah trip 5 days ago',
    age: '31',
    triageLevel: 'P2',  // Emergency — travel + fever + rash = red flag combination
    triageScore: 82,
    status: 'TRIAGED',  // Just triaged, workflow just starting
    fullResult: {
      triage_level: 'P2',
      triage_score: 82,
      chief_complaint: 'High fever with rash and travel history to endemic area, possible dengue or tropical infection',
      red_flags: ['High fever >40°C', 'Rash with travel history', 'Lethargy suggesting systemic involvement'],
      clinical_reasoning: 'Patient presents with high-grade fever, bilateral rash, and lethargy following recent travel to Sabah — an area endemic for dengue, malaria, and other tropical infections. The combination of fever, rash, and travel history constitutes a red-flag presentation requiring urgent blood workup and monitoring for complications.',
      confidence: 'medium', // Medium because differential is wide — needs blood tests to confirm
      ambiguity_flags: ['Differential includes dengue, malaria, chikungunya — blood tests essential for definitive diagnosis'],
      workflow_orders: {
        bed_assignment: { ward: 'Medical', bed_type: 'critical', urgency: 'within_30min' },
        doctor_alert: { specialty: 'Infectious Disease / Internal Medicine', message: 'Febrile patient with rash, returning from Sabah. R/O dengue, malaria.', urgency: 'urgent' },
        lab_orders: [
          { test: 'FBC with platelet count', urgency: 'stat' },     // Platelet drop = dengue indicator
          { test: 'Dengue NS1 Ag + IgM/IgG', urgency: 'stat' },    // Dengue rapid test
          { test: 'Malaria BFMP', urgency: 'stat' },                // Malaria blood film
          { test: 'LFT', urgency: 'urgent' },                       // Liver function (dengue can cause hepatitis)
          { test: 'RFT', urgency: 'urgent' },                       // Renal function
        ],
        imaging_orders: [{ type: 'Chest X-ray', body_part: 'Chest', urgency: 'urgent' }],
        pharmacy_prep: [
          { medication: 'IV Normal Saline 1L', reason: 'Hydration and hemodynamic support' },
          { medication: 'Paracetamol 1g IV', reason: 'Antipyretic — avoid NSAIDs until dengue excluded' },
          // NOTE: NSAIDs (e.g. ibuprofen) are contraindicated in dengue due to bleeding risk
        ],
        nursing_actions: ['Hourly vital signs monitoring', 'Strict I/O charting', 'IV access — large bore', 'Dengue warning signs checklist'],
      },
      estimated_wait_minutes: 10,
    },
  },
];

/**
 * generatePatientId()
 * -------------------
 * Returns the next sequential patient ID in the format PT-2026-XXXX.
 * Uses a module-level counter (patientCounter) so IDs increase across
 * multiple calls within the same session.
 *
 * The counter starts at 47 so newly triaged patients are numbered
 * PT-2026-0048 onward (continuing from the 3 pre-seeded patients).
 *
 * @returns {string}  e.g. "PT-2026-0048"
 */
let patientCounter = 47; // Starting point — the 3 seeded patients used 0044, 0045, 0046
export function generatePatientId() {
  patientCounter++;
  // padStart(4, '0') ensures the number is always 4 digits: 48 → "0048"
  return `PT-2026-${String(patientCounter).padStart(4, '0')}`;
}

/**
 * INITIAL_HOSPITAL_STATS
 * ----------------------
 * Starting values for the live dashboard widgets at the top of the screen.
 * These are displayed immediately on load and update dynamically as patients
 * are triaged, beds are assigned, and the background timer fires.
 *
 * Shape:
 *   totalPatientsToday  — Running count of all patients seen today
 *   beds                — Available / total beds broken down by ward type:
 *                           resus    = resuscitation bay (critical, P1)
 *                           critical = high-dependency (P2)
 *                           general  = standard ED beds (P3–P5)
 *   queue               — Number of patients currently waiting at each triage level
 *   avgWait             — Average wait time in minutes per triage level
 */
export const INITIAL_HOSPITAL_STATS = {
  totalPatientsToday: 47, // The 3 seeded patients are counted among these 47
  beds: {
    resus:    { total: 12, available: 9  }, // 3 resus beds occupied (critically ill patients)
    critical: { total: 34, available: 21 }, // 13 critical beds occupied
    general:  { total: 89, available: 67 }, // 22 general beds occupied
  },
  queue: {
    P1: 1,  // 1 immediately life-threatening patient waiting
    P2: 3,  // 3 emergency patients waiting
    P3: 5,  // 5 urgent patients waiting
    P4: 8,  // 8 semi-urgent patients waiting
    P5: 4,  // 4 non-urgent patients waiting
  },
  avgWait: {
    P1: 0,    // P1 = seen immediately, no wait
    P2: 8,    // P2 = within 8 minutes
    P3: 25,   // P3 = within 25 minutes
    P4: 55,   // P4 = within 55 minutes
    P5: 120,  // P5 = within 2 hours
  },
};
