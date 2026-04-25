Video Presentation Link:

# ClearPath — AI-Powered Hospital Triage System

> Real-time, AI-powered emergency department triage and workflow automation for Malaysian public hospitals.

![ClearPath](https://img.shields.io/badge/ClearPath-AI%20Triage-00d4ff?style=for-the-badge&labelColor=050d1a)
![Z.AI GLM](https://img.shields.io/badge/Powered%20by-Z.AI%20GLM-ff9f0a?style=for-the-badge&labelColor=050d1a)
![UMHackathon](https://img.shields.io/badge/UMHackathon-2026-30d158?style=for-the-badge&labelColor=050d1a)

---

## 🏥 What is ClearPath?

ClearPath is a production-grade hospital emergency department workflow system where **Z.AI's GLM** acts as the **central triage brain**. A patient walks in, describes their condition in plain language (Bahasa Malaysia, English, or mixed Manglish), and ClearPath instantly:

1. **Reads** unstructured patient intake (text in any language mix)
2. **Reasons** across Malaysian Standard Triage categories (P1–P5)
3. **Orchestrates** downstream hospital workflows — bed assignment, doctor alerts, lab orders, pharmacy prep
4. **Adapts** continuously as new information arrives

**Remove the GLM? The entire triage collapses.** A human clerk would have to manually read everything, call 4 departments, and guess.

---

## Architecture

```
[Patient Intake Interface]
        ↓ (unstructured text — BM/EN/Manglish)
[GLM Reasoning Engine — Z.AI]
        ↓ outputs structured JSON
[Workflow Orchestrator]
    ↙        ↓        ↓        ↘
[Bed Mgmt] [Doctor Alert] [Lab Orders] [Pharmacy Prep]
        ↓ all feed back into →
[Live Hospital Dashboard]
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design document.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Z.AI API Key (GLM-4)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open `http://localhost:5173` in your browser
2. Enter your **Z.AI API key** in the top bar
3. Type a patient condition in the intake form (supports BM/EN/Manglish)
4. Click **"⚡ Submit to Triage AI"**
5. Watch the triage result and workflow orchestration in real-time

### Demo Mode

Press **🎬 Demo Mode** to auto-run 5 dramatic patient scenarios showcasing P1 through P5 triage levels. Perfect for judges and presentations.

---

## 📋 Features

| Feature | Description |
|---|---|
| GLM Triage Engine | Multilingual clinical reasoning with structured JSON output |
| Malaysian Triage Standard | P1 (Immediate) through P5 (Non-urgent) classification |
| Manglish Support | Handles mixed BM/EN/Manglish patient descriptions |
| Live Dashboard | Real-time bed availability, queue counts, activity feed |
| Workflow Orchestration | Animated task board for bed, doctor, lab, imaging, pharmacy, nursing |
| Demo Mode | One-click automated 5-scenario demonstration |
| P1 Alert Effects | Pulsing red badges, screen-edge glow, audio alert beep |
| Patient History | Full session log with expandable GLM reasoning & workflow details |
| Error Resilience | API timeout handling, graceful degradation, retry support |

---

## 🛠️ Tech Stack

- **Frontend**: React + Tailwind CSS v4
- **AI Engine**: Z.AI GLM-4 (OpenAI-compatible API)
- **State**: React useReducer (no backend needed)
- **Fonts**: JetBrains Mono (data) + DM Sans (UI)
- **Audio**: Web Audio API for P1/P2 alert beeps

---

## Project Structure

```
clearpath/
├── src/
│   ├── App.jsx          ← Full system — all UI + state management
│   ├── glmApi.js        ← Z.AI GLM API integration
│   ├── demoData.js      ← Demo scenarios + pre-seeded patients
│   ├── main.jsx         ← Entry point
│   └── index.css        ← Design system + animations
├── public/
│   └── favicon.svg      ← Custom ClearPath icon
├── index.html           ← SEO-optimized HTML shell
├── ARCHITECTURE.md      ← System design document
├── README.md            ← This file
└── package.json
```

---

## Hackathon Criteria Coverage

| Criterion | How ClearPath Delivers |
|---|---|
| Multi-step orchestration | Intake → Triage → Bed → Doctor → Lab → Pharmacy → Nursing |
| GLM is irreplaceable | Remove GLM = no triage, no reasoning, no workflow generation |
| System design clarity | Architecture visible from the UI itself |
| Edge case handling | Ambiguous input, missing vitals, API timeout — all handled |
| Real-world relevance | Malaysian hospitals, Manglish, public health reality |
| Wow factor | Pulsing P1 alerts, live dashboard, animated workflows |

---

**Built for UMHackathon 2026 — Domain 1: AI Systems & Agentic Workflow Automation**
