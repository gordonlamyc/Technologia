// ====================================================================
// ClearPath — Demo Scenarios & Pre-seeded Patient Data
// 5 dramatic patient scenarios for Demo Mode + 3 pre-seeded patients
// ====================================================================

/**
 * 5 demo scenarios for the "Demo Mode" button
 * Each represents a different triage level for maximum visual impact
 */
export const DEMO_SCENARIOS = [
  {
    complaint: 'Chest pain radiating to left arm, 55 year old male, sweating profusely, feels like an elephant sitting on my chest',
    age: '55',
    allergies: 'Aspirin',
    medications: 'Metformin 500mg, Amlodipine 5mg',
    vitals: { bp: '90/60', hr: '112', spo2: '94', temp: '37.2' },
  },
  {
    complaint: 'Kena langgar motor, unconscious for 2 minit, now confused, head injury, ada bleeding kat kepala, tak ingat apa jadi',
    age: '28',
    allergies: '',
    medications: '',
    vitals: { bp: '100/70', hr: '105', spo2: '96', temp: '37.0' },
  },
  {
    complaint: 'Demam 39.5 dah 3 hari, batuk darah sikit, shortness of breath, tak larat langsung, badan sakit semua',
    age: '42',
    allergies: 'Sulfa drugs',
    medications: 'Paracetamol',
    vitals: { bp: '120/80', hr: '98', spo2: '91', temp: '39.5' },
  },
  {
    complaint: 'Sprained ankle playing futsal, can walk slowly, no swelling but quite painful, happened 1 hour ago',
    age: '22',
    allergies: '',
    medications: '',
    vitals: { bp: '125/82', hr: '78', spo2: '99', temp: '36.8' },
  },
  {
    complaint: 'Sakit perut 2 hari, no vomiting, still eating normally, temp normal, perut rasa bloated je, mild discomfort',
    age: '35',
    allergies: '',
    medications: '',
    vitals: { bp: '118/76', hr: '72', spo2: '99', temp: '36.6' },
  },
];

/**
 * 3 pre-seeded patients for the history log so the dashboard is populated on load
 */
export const PRESEEDED_PATIENTS = [
  {
    id: 'PT-2026-0044',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    complaint: 'Shortness of breath, wheezing for 4 hours, history of asthma, tak boleh tidur',
    age: '34',
    triageLevel: 'P2',
    triageScore: 78,
    status: 'IN TREATMENT',
    fullResult: {
      triage_level: 'P2',
      triage_score: 78,
      chief_complaint: 'Acute asthma exacerbation with prolonged wheezing and dyspnea',
      red_flags: ['Prolonged respiratory distress', 'Inability to sleep due to breathing difficulty'],
      clinical_reasoning: 'Patient presents with acute exacerbation of known asthma with 4-hour duration of wheezing and dyspnea. The inability to lie flat suggests moderate-to-severe airway compromise. Given the history and duration, this requires emergency-level response to prevent respiratory failure.',
      confidence: 'high',
      ambiguity_flags: [],
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
    id: 'PT-2026-0045',
    timestamp: new Date(Date.now() - 3600000 * 1.2).toISOString(),
    complaint: 'Small cut on finger while cooking, bleeding controlled with plaster, tak sakit sangat',
    age: '29',
    triageLevel: 'P5',
    triageScore: 12,
    status: 'ASSIGNED',
    fullResult: {
      triage_level: 'P5',
      triage_score: 12,
      chief_complaint: 'Minor laceration on finger, bleeding controlled',
      red_flags: [],
      clinical_reasoning: 'Minor superficial laceration with controlled bleeding. No signs of deep tissue involvement or neurovascular compromise. Patient is hemodynamically stable and can wait for wound care during routine processing.',
      confidence: 'high',
      ambiguity_flags: [],
      workflow_orders: {
        bed_assignment: { ward: 'Outpatient', bed_type: 'general', urgency: 'within_2hr' },
        doctor_alert: { specialty: 'General Practice', message: 'Minor finger laceration for wound care', urgency: 'routine' },
        lab_orders: [],
        imaging_orders: [],
        pharmacy_prep: [{ medication: 'Tetanus toxoid (if due)', reason: 'Laceration wound prophylaxis' }],
        nursing_actions: ['Clean wound with saline', 'Apply sterile dressing', 'Check tetanus immunization status'],
      },
      estimated_wait_minutes: 120,
    },
  },
  {
    id: 'PT-2026-0046',
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    complaint: 'High fever 40.1, very lethargic, rash on both arms, just came back from Sabah trip 5 days ago',
    age: '31',
    triageLevel: 'P2',
    triageScore: 82,
    status: 'TRIAGED',
    fullResult: {
      triage_level: 'P2',
      triage_score: 82,
      chief_complaint: 'High fever with rash and travel history to endemic area, possible dengue or tropical infection',
      red_flags: ['High fever >40°C', 'Rash with travel history', 'Lethargy suggesting systemic involvement'],
      clinical_reasoning: 'Patient presents with high-grade fever, bilateral rash, and lethargy following recent travel to Sabah — an area endemic for dengue, malaria, and other tropical infections. The combination of fever, rash, and travel history constitutes a red-flag presentation requiring urgent blood workup and monitoring for complications.',
      confidence: 'medium',
      ambiguity_flags: ['Differential includes dengue, malaria, chikungunya — blood tests essential for definitive diagnosis'],
      workflow_orders: {
        bed_assignment: { ward: 'Medical', bed_type: 'critical', urgency: 'within_30min' },
        doctor_alert: { specialty: 'Infectious Disease / Internal Medicine', message: 'Febrile patient with rash, returning from Sabah. R/O dengue, malaria.', urgency: 'urgent' },
        lab_orders: [
          { test: 'FBC with platelet count', urgency: 'stat' },
          { test: 'Dengue NS1 Ag + IgM/IgG', urgency: 'stat' },
          { test: 'Malaria BFMP', urgency: 'stat' },
          { test: 'LFT', urgency: 'urgent' },
          { test: 'RFT', urgency: 'urgent' },
        ],
        imaging_orders: [{ type: 'Chest X-ray', body_part: 'Chest', urgency: 'urgent' }],
        pharmacy_prep: [
          { medication: 'IV Normal Saline 1L', reason: 'Hydration and hemodynamic support' },
          { medication: 'Paracetamol 1g IV', reason: 'Antipyretic — avoid NSAIDs until dengue excluded' },
        ],
        nursing_actions: ['Hourly vital signs monitoring', 'Strict I/O charting', 'IV access — large bore', 'Dengue warning signs checklist'],
      },
      estimated_wait_minutes: 10,
    },
  },
];

/**
 * Generate a sequential patient ID
 */
let patientCounter = 47;
export function generatePatientId() {
  patientCounter++;
  return `PT-2026-${String(patientCounter).padStart(4, '0')}`;
}

/**
 * Initial hospital stats
 */
export const INITIAL_HOSPITAL_STATS = {
  totalPatientsToday: 47,
  beds: {
    resus: { total: 12, available: 9 },
    critical: { total: 34, available: 21 },
    general: { total: 89, available: 67 },
  },
  queue: { P1: 1, P2: 3, P3: 5, P4: 8, P5: 4 },
  avgWait: { P1: 0, P2: 8, P3: 25, P4: 55, P5: 120 },
};
