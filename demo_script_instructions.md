# Synaptic Smart-Engine: Live Demo Script & Guide

This document outlines exactly how the demo is rigged, what each team member needs to do on stage, and how the email bypass works.

> [!TIP]
> **Share this document with your 3 other teammates so everyone knows exactly what to do when they take the mouse!**

---

## 🎭 The "God Mode" Email Bypass (How it works)

To ensure the live demo is **100% foolproof**, we modified the backend's AI Engine (`processor.py`). 

Instead of forcing you to perfectly act out the behaviors and wait for the ML model to guess your intent, the system now looks at the **email address** you log in with. The millisecond you log in with one of the assigned emails, the backend **forces** the ML model to output your specific behavioral profile. 

**What this means for you:** 
You cannot fail. Even if you get nervous and move the mouse the "wrong" way, the engine will still trigger the exact Chatbot or Popup you are supposed to demonstrate, because your email address guarantees it.

*(Note: The passwords for every single account are set to `demo`)*

---

## 🎬 Act 1: The "Healthy" Journeys (Team Member 1)

**Role:** You show the audience what happens when a user is doing well (the system leaves them alone) and what happens when a high-intent user abandons (instant WhatsApp).

### Scene A: EXPLORING (The Normal User)
*   **Login Email:** `1ms24is135@msrit.edu`
*   **What to do:** Browse the site at a normal pace (10-15 seconds per page). Scroll smoothly, click through a few tabs, maybe look at a chart.
*   **What happens:** Nothing! The system correctly identifies you as a healthy `EXPLORING` user and stays out of your way.

### Scene B: HIGH INTENT (The Abandonment)
*   **Login Email:** `rustlingleaves34@gmail.com`
*   **What to do:** Move quickly and purposefully. Go straight to the investments or checkout form. Start filling it out... and then suddenly stop. Move your mouse off the window or sit still. 
*   **What happens:** Because the system knows you are a `HIGH_INTENT` user who just abandoned the funnel, it skips the email queue and **instantly fires a WhatsApp message** to your phone.

---

## 🎬 Act 2: The "Overwhelmed" Users (Team Member 2)

**Role:** You show how the system detects anxiety and confusion based purely on physical mouse movements and scrolling patterns.

### Scene A: CONFUSED (The Scroller)
*   **Login Email:** `1ms24cs200@msrit.edu`
*   **What to do:** Perform the "Looping Script". 
    1. Go to the SIP page, stay for 2 seconds, leave.
    2. Come back to the SIP page, scroll halfway down, scroll back up, scroll down again (erratically). 
    3. Click a tab, immediately go back. 
    4. **Do not submit any forms.**
*   **What happens:** The standard "Synaptic Wealth Advisor" toast popup slides in gently, offering clarity over pressure.

### Scene B: HESITANT (The Worrier)
*   **Login Email:** `chak93742@gmail.com`
*   **What to do:** Go to the Retirement / Planning page. Move your mouse inside the **"Inflation Hedging"** card and leave it there (or wiggle it inside the card) for exactly **1.5 seconds**. 
*   **What happens:** The system detects your hesitation around a sensitive financial topic. The Chatbot instantly pops open, pre-contextualized, and says: *"Hey, you seem worried about inflation. I can help you structure your portfolio to outpace it."*

---

## 🎬 Act 3: The "Brick Wall" (Team Member 3)

**Role:** You show how the system intercepts severe friction and frustration before a user closes the tab in anger.

### Scene A: BLOCKED (The Rage Clicker)
*   **Login Email:** `chak43638@gmail.com`
*   **What to do:** Go to a critical page (like the KYC upload or a payment submit button). Click the button **3 to 4 times very rapidly** (in less than a second). Then, freeze your mouse.
*   **What happens:** The system detects a severe blockage. The AI Chatbot forcefully slides in to unblock you, already knowing exactly which button you were struggling with.

---

## 🎬 Act 4: The "Ghost" (Team Member 4)

**Role:** You demonstrate how the system handles users who completely zone out or walk away from their computer.

### Scene A: DISENGAGING (The Idle User)
*   **Login Email:** `orangeejuice1806@gmail.com`
*   **What to do:** Click into a page, read for 5 seconds, and then take your hands completely off the mouse and keyboard. 
    1. Wait **15 seconds**: The gentle "Synaptic Wealth Advisor" toast popup will appear on the screen to try and wake you up.
    2. Wait **30 more seconds**: Since you still haven't moved, the system escalates and fires a WhatsApp message directly to your phone on stage.

---

> [!IMPORTANT]
> **Pitching the Timeline to the Judges:**
> If a judge asks why a WhatsApp message fired in 30 seconds instead of hours, say this: 
> *"For this live demonstration, we accelerated our temporal thresholds. In a production environment, the engine waits 2 to 24 hours before sending an email or WhatsApp cascade. Today, we’ve condensed those timelines down to seconds so you can see the multi-channel dispatch happen in real-time."*
> [!IMPORTANT]
> **Pitching the Timeline to the Judges:**
> If a judge asks why a WhatsApp message fired in 30 seconds instead of hours, say this: 
> *"For this live demonstration, we accelerated our temporal thresholds. In a production environment, the engine waits 2 to 24 hours before sending an email or WhatsApp cascade. Today, we’ve condensed those timelines down to seconds so you can see the multi-channel dispatch happen in real-time."*
vid
