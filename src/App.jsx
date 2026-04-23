// ====================================================================
// ClearPath — AI-Powered Hospital Emergency Triage System
// Main Application Component
// Powered by Z.AI GLM — UMHackathon 2026 Domain 1
// ====================================================================

import { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { callGLMTriage } from './glmApi';
import {
  DEMO_SCENARIOS,
  PRESEEDED_PATIENTS,
  generatePatientId,
  INITIAL_HOSPITAL_STATS,
} from './demoData';

// ====================================================================
// State Reducer — Clean state transitions for the entire system
// ====================================================================
const initialState = {
  apiKey: '',
  // Patient intake form
  intake: {
    complaint: '',
    age: '',
    allergies: '',
    medications: '',
    vitals: { bp: '', hr: '', spo2: '', temp: '' },
  },
  // Current triage result
  currentResult: null,
  isLoading: false,
  error: null,
  // Workflow task statuses for current patient
  workflowStatuses: {},
  // Patient history log
  patients: [...PRESEEDED_PATIENTS],
  // Hospital dashboard stats
  hospitalStats: { ...INITIAL_HOSPITAL_STATS },
  // Activity feed
  activityFeed: [
    { id: 1, time: new Date(Date.now() - 180000).toLocaleTimeString(), message: 'PT-2026-0046 triaged as P2 — Possible dengue, urgent labs ordered', type: 'triage' },
    { id: 2, time: new Date(Date.now() - 300000).toLocaleTimeString(), message: 'PT-2026-0045 assigned to Outpatient general bed', type: 'bed' },
    { id: 3, time: new Date(Date.now() - 600000).toLocaleTimeString(), message: 'PT-2026-0044 — Nebulizer treatment initiated', type: 'treatment' },
  ],
  // Demo mode
  isDemoRunning: false,
  demoStep: -1,
  // Detail view
  detailPatient: null,
  // Tab state
  activeTab: 'dashboard',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };

    case 'UPDATE_INTAKE':
      return { ...state, intake: { ...state.intake, ...action.payload } };

    case 'UPDATE_VITALS':
      return {
        ...state,
        intake: {
          ...state.intake,
          vitals: { ...state.intake.vitals, ...action.payload },
        },
      };

    case 'RESET_INTAKE':
      return {
        ...state,
        intake: {
          complaint: '',
          age: '',
          allergies: '',
          medications: '',
          vitals: { bp: '', hr: '', spo2: '', temp: '' },
        },
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_RESULT': {
      const { result, patientData } = action.payload;
      const patientId = generatePatientId();
      const newPatient = {
        id: patientId,
        timestamp: new Date().toISOString(),
        complaint: patientData.complaint,
        age: patientData.age || 'N/A',
        triageLevel: result.triage_level,
        triageScore: result.triage_score,
        status: 'TRIAGED',
        fullResult: result,
      };

      // Update queue counts
      const newQueue = { ...state.hospitalStats.queue };
      const level = result.triage_level;
      if (newQueue[level] !== undefined) newQueue[level]++;

      // Update bed availability
      const newBeds = JSON.parse(JSON.stringify(state.hospitalStats.beds));
      const bedType = result.workflow_orders?.bed_assignment?.bed_type;
      if (bedType && newBeds[bedType] && newBeds[bedType].available > 0) {
        newBeds[bedType].available--;
      }

      // New activity feed item
      const newActivity = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        message: `${patientId} triaged as ${level} (Score: ${result.triage_score}) — ${result.chief_complaint?.substring(0, 60)}`,
        type: 'triage',
      };

      return {
        ...state,
        currentResult: result,
        isLoading: false,
        error: null,
        patients: [newPatient, ...state.patients],
        workflowStatuses: {
          bed_assignment: 'PENDING',
          doctor_alert: 'PENDING',
          lab_orders: 'PENDING',
          imaging_orders: 'PENDING',
          pharmacy_prep: 'PENDING',
          nursing_actions: 'PENDING',
        },
        hospitalStats: {
          ...state.hospitalStats,
          totalPatientsToday: state.hospitalStats.totalPatientsToday + 1,
          queue: newQueue,
          beds: newBeds,
        },
        activityFeed: [newActivity, ...state.activityFeed].slice(0, 20),
      };
    }

    case 'UPDATE_WORKFLOW_STATUS':
      return {
        ...state,
        workflowStatuses: {
          ...state.workflowStatuses,
          [action.payload.task]: action.payload.status,
        },
        activityFeed: action.payload.activity
          ? [action.payload.activity, ...state.activityFeed].slice(0, 20)
          : state.activityFeed,
      };

    case 'SET_DEMO_RUNNING':
      return { ...state, isDemoRunning: action.payload };

    case 'SET_DEMO_STEP':
      return { ...state, demoStep: action.payload };

    case 'SET_DETAIL_PATIENT':
      return { ...state, detailPatient: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'INCREMENT_PATIENT_COUNT':
      return {
        ...state,
        hospitalStats: {
          ...state.hospitalStats,
          totalPatientsToday: state.hospitalStats.totalPatientsToday + 1,
        },
      };

    default:
      return state;
  }
}

// ====================================================================
// Sound Effect — P1 Alert Beep via Web Audio API
// ====================================================================
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch {
    // Web Audio not supported, fail silently
  }
}

// ====================================================================
// Triage Color / Style Helpers
// ====================================================================
function getTriageColor(level) {
  const colors = {
    P1: '#ff2d55',
    P2: '#ff6b2d',
    P3: '#ff9f0a',
    P4: '#00a3c4',
    P5: '#30d158',
  };
  return colors[level] || '#8899aa';
}

function getTriageBg(level) {
  const bgs = {
    P1: 'rgba(255,45,85,0.15)',
    P2: 'rgba(255,107,45,0.15)',
    P3: 'rgba(255,159,10,0.12)',
    P4: 'rgba(0,163,196,0.12)',
    P5: 'rgba(48,209,88,0.12)',
  };
  return bgs[level] || 'rgba(136,153,170,0.1)';
}

function getTriageLabel(level) {
  const labels = {
    P1: 'IMMEDIATE',
    P2: 'EMERGENCY',
    P3: 'URGENT',
    P4: 'SEMI-URGENT',
    P5: 'NON-URGENT',
  };
  return labels[level] || '';
}

function getUrgencyColor(urgency) {
  if (!urgency) return '#8899aa';
  const u = urgency.toLowerCase();
  if (u === 'stat' || u === 'immediate') return '#ff2d55';
  if (u === 'urgent' || u === 'within_30min') return '#ff9f0a';
  return '#00a3c4';
}

// ====================================================================
// TriageScoreRing Component — Radial progress visualization
// ====================================================================
function TriageScoreRing({ score, color, size = 120 }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="font-mono text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Score</div>
      </div>
    </div>
  );
}

// ====================================================================
// WorkflowCard Component — Individual task in the orchestration panel
// ====================================================================
function WorkflowCard({ icon, title, details, urgency, status, delay }) {
  const statusColors = {
    PENDING: 'var(--color-text-muted)',
    'IN PROGRESS': 'var(--color-warning)',
    DONE: 'var(--color-success)',
  };
  const statusBg = {
    PENDING: 'rgba(74,92,110,0.2)',
    'IN PROGRESS': 'rgba(255,159,10,0.15)',
    DONE: 'rgba(48,209,88,0.15)',
  };

  return (
    <div
      className="glass-card p-3 animate-slide-in-right"
      style={{
        animationDelay: `${delay}ms`,
        borderLeft: `3px solid ${statusColors[status]}`,
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {urgency && (
            <span
              className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
              style={{ color: getUrgencyColor(urgency), background: `${getUrgencyColor(urgency)}20` }}
            >
              {urgency}
            </span>
          )}
          <span
            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
            style={{ color: statusColors[status], background: statusBg[status] }}
          >
            {status === 'IN PROGRESS' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ background: 'var(--color-warning)' }} />}
            {status === 'DONE' && <span className="mr-1">✓</span>}
            {status}
          </span>
        </div>
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{details}</div>
    </div>
  );
}

// ====================================================================
// Main App Component
// ====================================================================
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const demoTimerRef = useRef(null);
  const workflowTimerRef = useRef([]);
  const [typewriterText, setTypewriterText] = useState('');
  const typewriterRef = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      workflowTimerRef.current.forEach(clearTimeout);
    };
  }, []);

  // Typewriter effect for clinical reasoning
  useEffect(() => {
    if (state.currentResult?.clinical_reasoning) {
      const text = state.currentResult.clinical_reasoning;
      setTypewriterText('');
      let i = 0;
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      typewriterRef.current = setInterval(() => {
        if (i < text.length) {
          setTypewriterText(text.substring(0, i + 1));
          i++;
        } else {
          clearInterval(typewriterRef.current);
        }
      }, 18);
    }
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [state.currentResult]);

  // Simulate background patient counter increment
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        dispatch({ type: 'INCREMENT_PATIENT_COUNT' });
      }
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // ================================================================
  // Workflow animation — auto-advance task statuses after triage
  // ================================================================
  const animateWorkflow = useCallback((result) => {
    workflowTimerRef.current.forEach(clearTimeout);
    workflowTimerRef.current = [];

    const tasks = [
      { task: 'nursing_actions', delay: 1500, label: 'Nursing actions initiated' },
      { task: 'bed_assignment', delay: 3000, label: `Bed assigned: ${result.workflow_orders?.bed_assignment?.ward} (${result.workflow_orders?.bed_assignment?.bed_type})` },
      { task: 'doctor_alert', delay: 4500, label: `Doctor alerted: ${result.workflow_orders?.doctor_alert?.specialty}` },
      { task: 'lab_orders', delay: 6500, label: 'Lab orders dispatched' },
      { task: 'imaging_orders', delay: 8000, label: 'Imaging orders sent' },
      { task: 'pharmacy_prep', delay: 10000, label: 'Pharmacy prepping medications' },
    ];

    tasks.forEach(({ task, delay, label }) => {
      // IN PROGRESS
      const t1 = setTimeout(() => {
        dispatch({
          type: 'UPDATE_WORKFLOW_STATUS',
          payload: {
            task,
            status: 'IN PROGRESS',
            activity: {
              id: Date.now() + Math.random(),
              time: new Date().toLocaleTimeString(),
              message: `⏳ ${label}`,
              type: 'workflow',
            },
          },
        });
      }, delay);

      // DONE
      const t2 = setTimeout(() => {
        dispatch({
          type: 'UPDATE_WORKFLOW_STATUS',
          payload: {
            task,
            status: 'DONE',
            activity: {
              id: Date.now() + Math.random(),
              time: new Date().toLocaleTimeString(),
              message: `✅ ${label}`,
              type: 'workflow',
            },
          },
        });
      }, delay + 2000);

      workflowTimerRef.current.push(t1, t2);
    });
  }, []);

  // ================================================================
  // Submit patient for triage
  // ================================================================
  const handleSubmit = useCallback(async (intakeData) => {
    if (!state.apiKey.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter your Z.AI API key above.' });
      return;
    }
    if (!intakeData.complaint.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please describe the patient\'s condition.' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const result = await callGLMTriage(state.apiKey, intakeData);
      dispatch({ type: 'SET_RESULT', payload: { result, patientData: intakeData } });

      // Play alert beep for P1/P2
      if (result.triage_level === 'P1' || result.triage_level === 'P2') {
        playAlertBeep();
      }

      // Animate workflow
      animateWorkflow(result);

      // Reset form
      dispatch({ type: 'RESET_INTAKE' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'An unexpected error occurred.' });
    }
  }, [state.apiKey, animateWorkflow]);

  // ================================================================
  // Demo Mode — auto-run 5 scenarios
  // ================================================================
  const runDemoMode = useCallback(async () => {
    if (state.isDemoRunning) return;
    if (!state.apiKey.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter your Z.AI API key to run Demo Mode.' });
      return;
    }

    dispatch({ type: 'SET_DEMO_RUNNING', payload: true });

    for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
      dispatch({ type: 'SET_DEMO_STEP', payload: i });
      const scenario = DEMO_SCENARIOS[i];

      dispatch({
        type: 'UPDATE_INTAKE',
        payload: {
          complaint: scenario.complaint,
          age: scenario.age,
          allergies: scenario.allergies,
          medications: scenario.medications,
        },
      });
      dispatch({ type: 'UPDATE_VITALS', payload: scenario.vitals });

      // Wait a moment for the form to populate visually
      await new Promise((r) => setTimeout(r, 1500));

      // Submit
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const result = await callGLMTriage(state.apiKey, scenario);
        dispatch({
          type: 'SET_RESULT',
          payload: { result, patientData: scenario },
        });
        if (result.triage_level === 'P1' || result.triage_level === 'P2') {
          playAlertBeep();
        }
        animateWorkflow(result);
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: `Demo scenario ${i + 1} failed: ${err.message}` });
      }

      // Wait before next scenario
      if (i < DEMO_SCENARIOS.length - 1) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    dispatch({ type: 'SET_DEMO_RUNNING', payload: false });
    dispatch({ type: 'SET_DEMO_STEP', payload: -1 });
  }, [state.apiKey, state.isDemoRunning, animateWorkflow]);

  // ================================================================
  // Determine if P1 screen glow should be active
  // ================================================================
  const isP1Active = state.currentResult?.triage_level === 'P1';

  return (
    <div className={`min-h-screen flex flex-col ${isP1Active ? 'p1-screen-glow' : ''}`}>
      {/* ============================================================
          TOP BAR — API Key, Branding, Demo Mode
          ============================================================ */}
      <header className="glass-card-glow mx-3 mt-3 mb-2 px-4 py-3 flex items-center justify-between gap-4 flex-wrap relative overflow-hidden">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--color-cyan-glow)] to-transparent animate-[scanline_4s_linear_infinite]" />
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-cyan)] to-[#006994] flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-[var(--color-cyan-glow)]">
            ⚕
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)] leading-none">
              ClearPath
            </h1>
            <p className="text-[10px] text-[var(--color-text-muted)] font-mono tracking-widest uppercase">
              AI Triage System
            </p>
          </div>
        </div>

        {/* API Key Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase whitespace-nowrap">
            Z.AI Key:
          </label>
          <input
            id="api-key-input"
            type="password"
            value={state.apiKey}
            onChange={(e) => dispatch({ type: 'SET_API_KEY', payload: e.target.value })}
            placeholder="Enter Z.AI GLM API Key"
            className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
          />
        </div>

        {/* Demo Mode + Powered By */}
        <div className="flex items-center gap-3">
          <button
            id="demo-mode-btn"
            onClick={runDemoMode}
            disabled={state.isDemoRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: state.isDemoRunning
                ? 'rgba(255,159,10,0.2)'
                : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,105,148,0.15))',
              border: `1px solid ${state.isDemoRunning ? 'var(--color-warning)' : 'var(--color-cyan-dim)'}`,
              color: state.isDemoRunning ? 'var(--color-warning)' : 'var(--color-cyan)',
            }}
          >
            {state.isDemoRunning ? (
              <>
                <span className="spinner" />
                Demo Running... ({state.demoStep + 1}/5)
              </>
            ) : (
              <>🎬 Demo Mode</>
            )}
          </button>

          <div className="text-[9px] text-[var(--color-text-muted)] font-mono text-right leading-tight">
            Powered by<br />
            <span className="text-[var(--color-cyan)] font-bold">Z.AI GLM</span>
          </div>
        </div>
      </header>

      {/* ============================================================
          LIVE HOSPITAL DASHBOARD — Top Stats Bar
          ============================================================ */}
      <div className="mx-3 mb-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {/* Total Patients */}
        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Patients Today</div>
          <div className="text-2xl font-mono font-bold text-[var(--color-cyan)]">{state.hospitalStats.totalPatientsToday}</div>
        </div>

        {/* Bed Stats */}
        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Beds — Resus</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-[var(--color-danger)]">{state.hospitalStats.beds.resus.available}</span>
            <span className="text-xs text-[var(--color-text-muted)]">/ {state.hospitalStats.beds.resus.total}</span>
          </div>
        </div>

        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Beds — Critical</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-[var(--color-warning)]">{state.hospitalStats.beds.critical.available}</span>
            <span className="text-xs text-[var(--color-text-muted)]">/ {state.hospitalStats.beds.critical.total}</span>
          </div>
        </div>

        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Beds — General</div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-[var(--color-success)]">{state.hospitalStats.beds.general.available}</span>
            <span className="text-xs text-[var(--color-text-muted)]">/ {state.hospitalStats.beds.general.total}</span>
          </div>
        </div>

        {/* Queue by Triage Level */}
        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Queue</div>
          <div className="flex gap-2">
            {['P1', 'P2', 'P3', 'P4', 'P5'].map((level) => (
              <div key={level} className="text-center">
                <div className="text-[10px] font-mono font-bold" style={{ color: getTriageColor(level) }}>{level}</div>
                <div className="text-sm font-mono font-bold text-[var(--color-text-primary)]">{state.hospitalStats.queue[level]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Avg Wait Times */}
        <div className="glass-card px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider mb-1">Avg Wait (min)</div>
          <div className="flex gap-2">
            {['P1', 'P2', 'P3'].map((level) => (
              <div key={level} className="text-center">
                <div className="text-[10px] font-mono font-bold" style={{ color: getTriageColor(level) }}>{level}</div>
                <div className="text-sm font-mono text-[var(--color-text-primary)]">{state.hospitalStats.avgWait[level]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN CONTENT — 3-Column Layout
          ============================================================ */}
      <div className="flex-1 mx-3 mb-3 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* ============================================================
            LEFT PANEL — Patient Intake Form
            ============================================================ */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="glass-card-glow p-4 flex flex-col gap-3 flex-1">
            <h2 className="text-sm font-bold text-[var(--color-cyan)] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-cyan)] animate-pulse" />
              Patient Intake
            </h2>

            {/* Chief Complaint */}
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-1">
                Describe Condition (BM / EN / Manglish)
              </label>
              <textarea
                id="complaint-input"
                value={state.intake.complaint}
                onChange={(e) => dispatch({ type: 'UPDATE_INTAKE', payload: { complaint: e.target.value } })}
                placeholder="e.g. My chest sakit sangat, dah 2 jam, shortness of breath, sweating..."
                className="w-full h-28 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors resize-none"
              />
            </div>

            {/* Age, Allergies, Medications */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-1">Age</label>
                <input
                  id="age-input"
                  type="text"
                  value={state.intake.age}
                  onChange={(e) => dispatch({ type: 'UPDATE_INTAKE', payload: { age: e.target.value } })}
                  placeholder="e.g. 55"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-1">Allergies</label>
                <input
                  id="allergies-input"
                  type="text"
                  value={state.intake.allergies}
                  onChange={(e) => dispatch({ type: 'UPDATE_INTAKE', payload: { allergies: e.target.value } })}
                  placeholder="e.g. Penicillin"
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-1">Current Medications</label>
              <input
                id="medications-input"
                type="text"
                value={state.intake.medications}
                onChange={(e) => dispatch({ type: 'UPDATE_INTAKE', payload: { medications: e.target.value } })}
                placeholder="e.g. Metformin, Amlodipine"
                className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
              />
            </div>

            {/* Vitals */}
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider block mb-1">
                Vitals <span className="text-[var(--color-text-muted)]">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="vitals-bp"
                  type="text"
                  value={state.intake.vitals.bp}
                  onChange={(e) => dispatch({ type: 'UPDATE_VITALS', payload: { bp: e.target.value } })}
                  placeholder="BP (e.g. 120/80)"
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
                <input
                  id="vitals-hr"
                  type="text"
                  value={state.intake.vitals.hr}
                  onChange={(e) => dispatch({ type: 'UPDATE_VITALS', payload: { hr: e.target.value } })}
                  placeholder="HR (e.g. 80)"
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
                <input
                  id="vitals-spo2"
                  type="text"
                  value={state.intake.vitals.spo2}
                  onChange={(e) => dispatch({ type: 'UPDATE_VITALS', payload: { spo2: e.target.value } })}
                  placeholder="SpO2 (e.g. 98)"
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
                <input
                  id="vitals-temp"
                  type="text"
                  value={state.intake.vitals.temp}
                  onChange={(e) => dispatch({ type: 'UPDATE_VITALS', payload: { temp: e.target.value } })}
                  placeholder="Temp °C (e.g. 37.5)"
                  className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="submit-triage-btn"
              onClick={() => handleSubmit(state.intake)}
              disabled={state.isLoading}
              className="w-full mt-auto py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--color-cyan), #006994)',
                color: '#fff',
                boxShadow: '0 0 20px var(--color-cyan-glow)',
              }}
            >
              {state.isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" style={{ borderTopColor: '#fff' }} />
                  GLM Reasoning...
                </span>
              ) : (
                '⚡ Submit to Triage AI'
              )}
            </button>

            {/* Error Display */}
            {state.error && (
              <div className="bg-[var(--color-danger-glow)] border border-[rgba(255,45,85,0.3)] rounded-lg p-3 text-xs text-[var(--color-danger)] animate-fade-in">
                <div className="font-bold mb-1">⚠ Error</div>
                {state.error}
                <button
                  onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
                  className="block mt-2 text-[10px] underline cursor-pointer opacity-70 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            CENTER PANEL — Triage Result + Clinical Reasoning
            ============================================================ */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {state.currentResult ? (
            <TriageResultPanel result={state.currentResult} typewriterText={typewriterText} />
          ) : (
            <div className="glass-card flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-5xl mb-4 opacity-30">⚕</div>
              <h3 className="text-lg font-bold text-[var(--color-text-secondary)] mb-2">
                Awaiting Patient Intake
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-md">
                Enter a patient's condition in the left panel and submit to the GLM Triage AI.
                The system supports Bahasa Malaysia, English, and Manglish.
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4 font-mono">
                Or press <span className="text-[var(--color-cyan)]">🎬 Demo Mode</span> to auto-run 5 scenarios
              </p>
            </div>
          )}

          {/* Workflow Orchestration Panel */}
          {state.currentResult && (
            <WorkflowOrchestrationPanel
              result={state.currentResult}
              statuses={state.workflowStatuses}
            />
          )}
        </div>

        {/* ============================================================
            RIGHT PANEL — Activity Feed + Patient History
            ============================================================ */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          {/* Tab Switcher */}
          <div className="flex gap-1">
            {[
              { key: 'dashboard', label: '📊 Activity' },
              { key: 'history', label: '📋 Patients' },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.key })}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer"
                style={{
                  background: state.activeTab === tab.key ? 'var(--color-bg-glass)' : 'transparent',
                  color: state.activeTab === tab.key ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  border: `1px solid ${state.activeTab === tab.key ? 'var(--color-border-strong)' : 'transparent'}`,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Activity Feed */}
          {state.activeTab === 'dashboard' && (
            <div className="glass-card flex-1 p-3 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <h3 className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                Live Activity Feed
              </h3>
              <div className="flex flex-col gap-2">
                {state.activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="activity-feed-item bg-[var(--color-bg-secondary)] rounded-lg px-3 py-2 border-l-2"
                    style={{
                      borderLeftColor:
                        item.type === 'triage' ? 'var(--color-cyan)' :
                        item.type === 'workflow' ? 'var(--color-warning)' :
                        'var(--color-text-muted)',
                    }}
                  >
                    <div className="text-[10px] font-mono text-[var(--color-text-muted)] mb-0.5">{item.time}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{item.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient History */}
          {state.activeTab === 'history' && (
            <div className="glass-card flex-1 p-3 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              <h3 className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                Patient History Log
              </h3>
              <div className="flex flex-col gap-2">
                {state.patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    onViewDetails={() => dispatch({ type: 'SET_DETAIL_PATIENT', payload: patient })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          DETAIL MODAL — Full patient details
          ============================================================ */}
      {state.detailPatient && (
        <PatientDetailModal
          patient={state.detailPatient}
          onClose={() => dispatch({ type: 'SET_DETAIL_PATIENT', payload: null })}
        />
      )}
    </div>
  );
}

// ====================================================================
// TriageResultPanel — The dramatic triage result display
// ====================================================================
function TriageResultPanel({ result, typewriterText }) {
  const level = result.triage_level;
  const color = getTriageColor(level);
  const isPulsing = level === 'P1' || level === 'P2';

  return (
    <div
      className="glass-card-glow p-5 animate-fade-in-up"
      style={{
        borderColor: `${color}40`,
        boxShadow: isPulsing
          ? `0 0 30px ${color}30, inset 0 0 30px ${color}05`
          : `0 0 15px var(--color-cyan-glow)`,
      }}
    >
      {/* Header with badge + score */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Big Triage Badge */}
          <div
            className={`triage-badge text-3xl px-5 py-3 ${isPulsing ? (level === 'P1' ? 'animate-pulse-p1' : 'animate-pulse-p2') : ''}`}
            style={{
              background: `${color}20`,
              color: color,
              border: `2px solid ${color}60`,
            }}
          >
            {level}
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
              {getTriageLabel(level)}
            </div>
            <div
              className="text-[10px] font-mono uppercase tracking-wider mt-0.5 flex items-center gap-2"
              style={{ color }}
            >
              {level === 'P1' && <span className="inline-block w-2 h-2 rounded-full animate-ping" style={{ background: color }} />}
              Triage Classification
            </div>
          </div>
        </div>

        {/* Radial Score Ring */}
        <TriageScoreRing score={result.triage_score} color={color} />
      </div>

      {/* Chief Complaint */}
      <div className="mb-3 p-3 rounded-lg" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
        <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Chief Complaint</div>
        <div className="text-sm text-[var(--color-text-primary)] font-medium">{result.chief_complaint}</div>
      </div>

      {/* Red Flags */}
      {result.red_flags && result.red_flags.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-mono text-[var(--color-danger)] uppercase tracking-wider mb-1.5">⚠️ Red Flags Detected</div>
          <div className="flex flex-wrap gap-1.5">
            {result.red_flags.map((flag, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-danger-glow)] text-[var(--color-danger)] border border-[rgba(255,45,85,0.2)]"
              >
                ⚠ {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Reasoning — Typewriter Effect */}
      <div className="mb-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
        <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          🧠 Clinical Reasoning
          {typewriterText !== result.clinical_reasoning && <span className="spinner" style={{ width: 10, height: 10 }} />}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {typewriterText}
          {typewriterText !== result.clinical_reasoning && (
            <span className="inline-block w-[2px] h-[14px] bg-[var(--color-cyan)] ml-0.5 animate-pulse" />
          )}
        </div>
      </div>

      {/* Bottom row: Confidence + Wait Time + Ambiguity */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Confidence */}
        <span
          className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded"
          style={{
            background: result.confidence === 'high' ? 'var(--color-success-glow)' : result.confidence === 'medium' ? 'var(--color-warning-glow)' : 'var(--color-danger-glow)',
            color: result.confidence === 'high' ? 'var(--color-success)' : result.confidence === 'medium' ? 'var(--color-warning)' : 'var(--color-danger)',
          }}
        >
          {result.confidence === 'high' ? '✓' : result.confidence === 'medium' ? '~' : '!'} Confidence: {result.confidence}
        </span>

        {/* Wait Time */}
        <span className="text-[10px] font-mono text-[var(--color-text-muted)] px-2.5 py-1 rounded bg-[var(--color-bg-secondary)]">
          ⏱ Est. Wait: {result.estimated_wait_minutes} min
        </span>
      </div>

      {/* Ambiguity Flags */}
      {result.ambiguity_flags && result.ambiguity_flags.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-[var(--color-warning-glow)] border border-[rgba(255,159,10,0.2)]">
          <div className="text-[10px] font-mono text-[var(--color-warning)] uppercase tracking-wider mb-1">⚡ Ambiguity Flags</div>
          {result.ambiguity_flags.map((flag, i) => (
            <div key={i} className="text-xs text-[var(--color-text-secondary)] leading-relaxed mt-0.5">• {flag}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// WorkflowOrchestrationPanel — Animated task board
// ====================================================================
function WorkflowOrchestrationPanel({ result, statuses }) {
  const orders = result.workflow_orders;
  if (!orders) return null;

  const tasks = [
    {
      key: 'nursing_actions',
      icon: '🩺',
      title: 'Nursing Actions',
      details: orders.nursing_actions?.join(' • ') || 'No nursing actions',
      urgency: null,
    },
    {
      key: 'bed_assignment',
      icon: '🛏️',
      title: 'Bed Assignment',
      details: `${orders.bed_assignment?.ward} — ${orders.bed_assignment?.bed_type} bed`,
      urgency: orders.bed_assignment?.urgency,
    },
    {
      key: 'doctor_alert',
      icon: '👨‍⚕️',
      title: 'Doctor Alert',
      details: `${orders.doctor_alert?.specialty} — ${orders.doctor_alert?.message}`,
      urgency: orders.doctor_alert?.urgency,
    },
    {
      key: 'lab_orders',
      icon: '🧪',
      title: 'Lab Orders',
      details: orders.lab_orders?.map((l) => `${l.test} (${l.urgency})`).join(', ') || 'None',
      urgency: orders.lab_orders?.[0]?.urgency,
    },
    {
      key: 'imaging_orders',
      icon: '🩻',
      title: 'Imaging',
      details: orders.imaging_orders?.map((im) => `${im.type}: ${im.body_part}`).join(', ') || 'None',
      urgency: orders.imaging_orders?.[0]?.urgency,
    },
    {
      key: 'pharmacy_prep',
      icon: '💊',
      title: 'Pharmacy Prep',
      details: orders.pharmacy_prep?.map((p) => `${p.medication}`).join(', ') || 'None',
      urgency: null,
    },
  ];

  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
      <h3 className="text-[10px] font-mono font-bold text-[var(--color-cyan)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-cyan)]" />
        Workflow Orchestration
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tasks.map((task, i) => (
          <WorkflowCard
            key={task.key}
            icon={task.icon}
            title={task.title}
            details={task.details}
            urgency={task.urgency}
            status={statuses[task.key] || 'PENDING'}
            delay={i * 150}
          />
        ))}
      </div>
    </div>
  );
}

// ====================================================================
// PatientRow — Single row in the patient history log
// ====================================================================
function PatientRow({ patient, onViewDetails }) {
  const color = getTriageColor(patient.triageLevel);

  const statusColor = {
    TRIAGED: 'var(--color-cyan)',
    ASSIGNED: 'var(--color-warning)',
    'IN TREATMENT': 'var(--color-success)',
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[var(--color-cyan)]">{patient.id}</span>
          <span
            className="triage-badge text-[10px] px-2 py-0.5"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            {patient.triageLevel}
          </span>
          <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
            Score: {patient.triageScore}
          </span>
        </div>
        <span
          className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
          style={{
            color: statusColor[patient.status] || 'var(--color-text-muted)',
            background: `${statusColor[patient.status] || 'var(--color-text-muted)'}15`,
          }}
        >
          {patient.status}
        </span>
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] mb-1.5 line-clamp-1">
        {patient.complaint}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
          {new Date(patient.timestamp).toLocaleTimeString()} • Age: {patient.age}
        </span>
        <button
          onClick={onViewDetails}
          className="text-[10px] text-[var(--color-cyan)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer font-semibold"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}

// ====================================================================
// PatientDetailModal — Expanded view of patient + GLM reasoning
// ====================================================================
function PatientDetailModal({ patient, onClose }) {
  const result = patient.fullResult;
  if (!result) return null;

  const color = getTriageColor(result.triage_level);
  const orders = result.workflow_orders;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card-glow w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-[var(--color-cyan)]">{patient.id}</span>
            <span
              className="triage-badge text-sm px-3 py-1"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
            >
              {result.triage_level} — {getTriageLabel(result.triage_level)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xl cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Score + Confidence */}
        <div className="flex items-center gap-4 mb-4">
          <TriageScoreRing score={result.triage_score} color={color} size={80} />
          <div>
            <div className="text-sm font-bold text-[var(--color-text-primary)]">{result.chief_complaint}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">
              Confidence: <span style={{ color: result.confidence === 'high' ? 'var(--color-success)' : 'var(--color-warning)' }}>{result.confidence}</span>
              &nbsp;• Est. Wait: {result.estimated_wait_minutes} min
            </div>
          </div>
        </div>

        {/* Red Flags */}
        {result.red_flags?.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-mono text-[var(--color-danger)] uppercase tracking-wider mb-1">⚠️ Red Flags</div>
            <div className="flex flex-wrap gap-1.5">
              {result.red_flags.map((f, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-danger-glow)] text-[var(--color-danger)]">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Reasoning */}
        <div className="mb-3 p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
          <div className="text-[10px] font-mono text-[var(--color-text-muted)] uppercase tracking-wider mb-1">🧠 Clinical Reasoning</div>
          <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{result.clinical_reasoning}</div>
        </div>

        {/* Ambiguity */}
        {result.ambiguity_flags?.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-[var(--color-warning-glow)] border border-[rgba(255,159,10,0.2)]">
            <div className="text-[10px] font-mono text-[var(--color-warning)] uppercase tracking-wider mb-1">⚡ Ambiguity Flags</div>
            {result.ambiguity_flags.map((f, i) => (
              <div key={i} className="text-xs text-[var(--color-text-secondary)]">• {f}</div>
            ))}
          </div>
        )}

        {/* Workflow Orders */}
        {orders && (
          <div>
            <div className="text-[10px] font-mono text-[var(--color-cyan)] uppercase tracking-wider mb-2">Workflow Orders</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {orders.bed_assignment && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">🛏️ Bed Assignment</div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">
                    {orders.bed_assignment.ward} — {orders.bed_assignment.bed_type} ({orders.bed_assignment.urgency})
                  </div>
                </div>
              )}
              {orders.doctor_alert && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">👨‍⚕️ Doctor Alert</div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">
                    {orders.doctor_alert.specialty} — {orders.doctor_alert.urgency}
                  </div>
                </div>
              )}
              {orders.lab_orders?.length > 0 && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">🧪 Lab Orders</div>
                  {orders.lab_orders.map((l, i) => (
                    <div key={i} className="text-[11px] text-[var(--color-text-secondary)]">• {l.test} ({l.urgency})</div>
                  ))}
                </div>
              )}
              {orders.imaging_orders?.length > 0 && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">🩻 Imaging</div>
                  {orders.imaging_orders.map((im, i) => (
                    <div key={i} className="text-[11px] text-[var(--color-text-secondary)]">• {im.type}: {im.body_part} ({im.urgency})</div>
                  ))}
                </div>
              )}
              {orders.pharmacy_prep?.length > 0 && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">💊 Pharmacy</div>
                  {orders.pharmacy_prep.map((p, i) => (
                    <div key={i} className="text-[11px] text-[var(--color-text-secondary)]">• {p.medication} — {p.reason}</div>
                  ))}
                </div>
              )}
              {orders.nursing_actions?.length > 0 && (
                <div className="p-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                  <div className="text-xs font-bold text-[var(--color-text-primary)] mb-0.5">🩺 Nursing</div>
                  {orders.nursing_actions.map((n, i) => (
                    <div key={i} className="text-[11px] text-[var(--color-text-secondary)]">• {n}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
