# ClearPath — System Architecture

> Technical design document for judges and code reviewers

---

## System Overview

ClearPath is a **single-page React application** that uses Z.AI's GLM-4 as its central reasoning engine for emergency department triage in Malaysian public hospitals. The system is designed so that **GLM is not just a feature — it IS the system**. Without GLM, there is no triage, no clinical reasoning, no workflow generation.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ClearPath Frontend                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  INTAKE FORM │  │   TRIAGE RESULT      │  │  ACTIVITY FEED   │  │
│  │              │  │   ┌────────────────┐  │  │  PATIENT HISTORY │  │
│  │ • Complaint  │  │   │ P1 - IMMEDIATE │  │  │                  │  │
│  │ • Age        │  │   │ Score: 95/100  │  │  │  [Live updates]  │  │
│  │ • Allergies  │  │   │ Red Flags: ⚠️  │  │  │  [Session log]   │  │
│  │ • Meds       │  │   └────────────────┘  │  │                  │  │
│  │ • Vitals     │  │                        │  │                  │  │
│  │              │  │  ┌──────────────────┐  │  │                  │  │
│  │  [SUBMIT]    │──│→ │ WORKFLOW PANEL   │  │  │                  │  │
│  │              │  │  │ 🛏️ Bed → DONE   │  │  │                  │  │
│  └──────────────┘  │  │ 👨‍⚕️ Doctor → IP │  │  │                  │  │
│                    │  │ 🧪 Lab → PENDING │  │  │                  │  │
│                    │  │ 💊 Pharma → PEND │  │  │                  │  │
│                    │  └──────────────────┘  │  │                  │  │
│                    └──────────────────────┘  └──────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   HOSPITAL DASHBOARD BAR                     │   │
│  │  Patients: 47  │  Beds: R:9 C:21 G:67  │  Queue: P1-P5     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS POST (JSON)
                             │ Authorization: Bearer <API_KEY>
                             ▼
                ┌────────────────────────┐
                │    Z.AI GLM-4 API      │
                │                        │
                │  System Prompt:        │
                │  • Malaysian Triage    │
                │  • P1-P5 Classification│
                │  • Multilingual NLP    │
                │  • Workflow Generation │
                │                        │
                │  Output:               │
                │  Structured JSON with  │
                │  triage + orders       │
                └────────────────────────┘
```

---

## Data Flow

### 1. Patient Intake → GLM Reasoning

```
User Input (unstructured):
  "My chest sakit sangat, dah 2 jam, shortness of breath"
  + Age: 55
  + Vitals: BP 90/60, HR 112, SpO2 94

        ↓ Formatted as structured prompt

GLM System Prompt:
  - Parse chief complaint (multilingual)
  - Classify P1-P5 triage level
  - Generate clinical reasoning
  - Detect red flags
  - Generate workflow orders
  - Flag ambiguities

        ↓ Returns valid JSON

Parsed Result:
  {
    triage_level: "P1",
    triage_score: 95,
    chief_complaint: "Acute STEMI ...",
    workflow_orders: { ... }
  }
```

### 2. GLM Result → Workflow Orchestration

The workflow orchestrator receives the GLM's structured `workflow_orders` and simulates real-time task execution:

```
Result received (t=0s)
  ↓
🩺 Nursing Actions → IN PROGRESS (t=1.5s) → DONE (t=3.5s)
  ↓
🛏️ Bed Assignment → IN PROGRESS (t=3s) → DONE (t=5s)
  ↓
👨‍⚕️ Doctor Alert → IN PROGRESS (t=4.5s) → DONE (t=6.5s)
  ↓
🧪 Lab Orders → IN PROGRESS (t=6.5s) → DONE (t=8.5s)
  ↓
🩻 Imaging → IN PROGRESS (t=8s) → DONE (t=10s)
  ↓
💊 Pharmacy Prep → IN PROGRESS (t=10s) → DONE (t=12s)
```

### 3. State Management

All application state is managed via `useReducer` with a single centralized reducer. Actions include:

| Action | Effect |
|---|---|
| `SET_RESULT` | Store GLM result, add patient to history, update dashboard stats |
| `UPDATE_WORKFLOW_STATUS` | Advance task status (PENDING → IN PROGRESS → DONE) |
| `UPDATE_INTAKE` | Update form fields |
| `SET_DEMO_RUNNING` | Control demo mode execution |
| `SET_DETAIL_PATIENT` | Open/close patient detail modal |

---

## GLM Integration Details

### API Configuration
- **Endpoint**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Model**: `glm-4`
- **Temperature**: `0.3` (low for consistent clinical reasoning)
- **Max Tokens**: `2000`
- **Timeout**: `30 seconds`

### System Prompt Design

The system prompt is engineered to:
1. **Parse multilingual input** — handles English, BM, and Manglish code-switching
2. **Apply medical knowledge** — Malaysian Emergency Triage (P1-P5)
3. **Generate structured output** — Strict JSON schema for downstream automation
4. **Handle uncertainty** — Explicit confidence levels and ambiguity flags
5. **Detect conflicts** — Flag when subjective complaints conflict with objective vitals

### Error Handling

| Scenario | Behavior |
|---|---|
| API timeout (>30s) | AbortController cancels, error message with retry option |
| Invalid JSON response | Attempt code-fence stripping, then show parse error |
| Empty response | "GLM returned empty response" error |
| Missing API key | Validation error before API call |
| Network error | Caught and displayed with retry option |

---

## Multilingual Support

ClearPath handles the linguistic reality of Malaysian hospitals:

| Input Type | Example |
|---|---|
| English | "Chest pain radiating to left arm, sweating" |
| Bahasa Malaysia | "Demam 3 hari, batuk, tak mau makan" |
| Manglish | "My chest sakit sangat, shortness of breath" |
| Code-switching | "Kena langgar kereta, kaki tak boleh move" |

GLM processes all of these natively without translation steps.

---

## Visual Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg-primary` | `#050d1a` | Main background |
| `--color-cyan` | `#00d4ff` | Primary accent, active elements |
| `--color-danger` | `#ff2d55` | P1 triage, alerts, errors |
| `--color-warning` | `#ff9f0a` | P3, in-progress states |
| `--color-success` | `#30d158` | P5, completed states |

### Triage Level Visual Mapping

| Level | Color | Effect |
|---|---|---|
| P1 IMMEDIATE | `#ff2d55` | Pulsing glow, screen-edge red, audio beep |
| P2 EMERGENCY | `#ff6b2d` | Pulsing glow |
| P3 URGENT | `#ff9f0a` | Static badge |
| P4 SEMI-URGENT | `#00a3c4` | Static badge |
| P5 NON-URGENT | `#30d158` | Static badge |

### Animation System

- **fadeInUp** — Panel entry animations
- **slideInRight** — Workflow card staggered entry
- **pulseP1/P2** — Critical triage badge glow
- **screenEdgeGlow** — P1 red vignette overlay
- **typewriter** — Clinical reasoning text appearance
- **scanline** — Header cyberpunk scanline effect

---

## Why GLM is Irreplaceable

Remove the GLM API and the following happens:

| Component | Without GLM |
|---|---|
| Triage classification | ❌ No P1-P5 assignment |
| Clinical reasoning | ❌ No AI reasoning summary |
| Red flag detection | ❌ No symptom analysis |
| Workflow generation | ❌ No bed/doctor/lab/pharmacy orders |
| Multilingual parsing | ❌ No Manglish understanding |
| Confidence assessment | ❌ No reliability metric |
| Ambiguity detection | ❌ No missing data flagging |

A human clerk would need to manually read the complaint, mentally translate mixed-language input, consult triage guidelines, call 4+ departments, and make judgment calls. ClearPath does this in ~3 seconds.

---

**ClearPath — Built for UMHackathon 2026**
**Domain 1: AI Systems & Agentic Workflow Automation**
