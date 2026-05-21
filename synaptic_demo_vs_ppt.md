# Synaptic — Demo vs PPT Breakdown

> A clear guide on what to deliver live in the demo and what needs a PPT slide to explain.

---

## ✅ Can Be Delivered Through Live Demo

These are things judges can **see working in real time** — the product speaks for itself.

### Native Platform

| Feature | What You Show |
|---|---|
| Native Platform UI | Browse Investments, Insurance, and Checkout pages live |
| User Registration | Register a new account live, show Ghost ID assigned in localStorage |
| Behavioral Tracking (Silent) | Show console — scroll events and hesitation zones being logged |
| Rage Click Detection | Triple-click on Checkout → AI popup appears in real time |
| AI Nudge on Native Site | Judges read the live Gemini-generated message on your own platform |
| Backend Terminal | Show churn score, behavior profile, and Gemini message in the logs |

### Ghost SDK (The Killer Feature)

| Feature | What You Show |
|---|---|
| Ghost SDK on Wikipedia | Switch to Wikipedia → SDK log in console → triple-click → toast pops up |
| Cross-Domain AI Nudge | Context-specific message generated about the exact Wikipedia page |
| Semantic Mapper | Terminal log: *"Classified unknown site as Exploration Stage"* |
| WhatsApp / Email Alert | Trigger escalation live and show the notification arriving *(if configured)* |

---

## 📊 Needs a PPT Slide to Explain

These are things that are either **invisible infrastructure**, **future work**, or too complex to show in 8 minutes without context.

### Architecture & Engineering

| Slide Topic | Why PPT? |
|---|---|
| System Architecture Diagram | The data flow (tracker → FastAPI → Gemini → WebSocket) is invisible — judges need a diagram |
| ML Model — Random Forest | You cannot "show" a trained model — explain features, training data, and accuracy on a slide |
| Churn Probability Scoring | The 87% score flashes in the terminal for one second — a slide explains what it means |
| Semantic Mapper Logic | NLP classification of unknown websites into funnel stages is backend-only — needs a diagram |
| Tech Stack | Full list of technologies: Next.js, FastAPI, Gemini, Socket.IO, scikit-learn |

### Business & Impact

| Slide Topic | Why PPT? |
|---|---|
| The Problem Statement | Financial platforms lose 60%+ users at KYC — cite real industry data |
| Market Opportunity / TAM | Numbers on the financial advisory software market |
| Why Existing Solutions Fail | Chatbots are reactive, not proactive — Synaptic intercepts at the moment of friction |
| Revenue Model | SaaS licensing to financial firms, per-session pricing model |
| Scalability | How the Ghost SDK works at scale across millions of users |

### Admin Dashboard *(not built yet — show as concept)*

| Slide Topic | Why PPT? |
|---|---|
| Constellation Map | Show the design mockup — explain each galaxy = funnel stage |
| XAI Feed (Explainability) | Show terminal-style reasoning feed as a screenshot or animation |
| God Mode Override | Explain the Force Intervention button and its advisor use case |
| Butterfly Effect Calculator | Show the revenue-retained ticker as a concept with mock numbers |

---

## 🎯 The Golden Rule

> **If judges can watch it happen and understand it in 10 seconds → Demo it.**
>
> **If it requires more than one sentence to explain → Put it on a slide.**

---

## 🗂️ Suggested Presentation Flow

```
PPT  (~3 min)             DEMO  (~8 min)              PPT  (~2 min)
──────────────────        ───────────────────         ──────────────────────
Problem Statement    →    Live Platform Demo      →   Architecture Diagram
Market Opportunity   →    Ghost SDK on Wikipedia  →   ML Model Explanation
Our Solution         →    Backend Terminal         →   Business Model & Roadmap
```

This structure hooks judges with context, **wows them with the live demo**, then closes with the engineering depth that proves it is not just a prototype.

---

## 📋 Quick Checklist Before Presenting

- [ ] PPT slides cover: Problem, Market, Architecture, ML Model, Business Model
- [ ] Demo covers: Registration, Rage Click Nudge on native site, Ghost SDK on Wikipedia
- [ ] Backend terminal is visible on screen during demo
- [ ] Admin Dashboard mockup slide is ready as a "coming soon" concept
- [ ] Closing line memorized: *"Synaptic is not a chatbot. It is the nervous system for the next generation of financial advisory."*
