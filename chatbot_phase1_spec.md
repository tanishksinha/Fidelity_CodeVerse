# Pre-Contextualized Chatbot: Phase 1 Implementation Guide

Welcome to the Chatbot Implementation team! Your goal is to build the architecture that routes specific, frustrated users into an AI Chatbot that already knows *exactly* what they are struggling with before they even say hello.

## 1. The Idea & The "Why"
**The Problem:** Traditional "Can we help you?" popups are annoying. Furthermore, standard AI chatbots start with a blank slate ("How can I help you today?"), forcing frustrated users to explain their technical issues from scratch. This leads to high abandonment rates, especially for users who are stuck on critical pages like KYC or Payments.

**The Solution:** A **Pre-Contextualized Chatbot**. Because our Behavioral Engine tracks mouse movements, rage clicks, and DOM context, we know *exactly* why the user is struggling. If a user rage-clicks a "Submit ID" button 5 times, our chatbot should open and immediately say: *"Hey, I see you're having trouble uploading your Government ID. Let me help you with that."*

## 2. Phase 1: Smart Routing & Context Passing
We only want to deploy the chatbot when a user is experiencing negative friction or needs an advisor. For all other profiles (like High Intent, Exploring, Confused, or Disengaging), they will continue to receive the standard UI nudges as usual. You do not need to make any changes to those.

### The Routing Rules
You must implement a strict routing fork based on the user's Behavioral Profile:

*   **Route to CHATBOT:**
    *   `BLOCKED`: User is rage-clicking or completely stuck. (Bot acts as technical support).
    *   `STRUGGLING`: User is hitting form validation errors. (Bot acts as a co-pilot).
    *   `HESITANT`: User is reading fees/pricing carefully for a long time. (Bot acts as a trusted advisor to answer questions).

## 3. How to Build It (Implementation Guide)

### A. Backend Updates (`main.py` / `processor.py`)
Currently, when `main.py` fires the Socket.io `receive_nudge` event, it sends a payload like this:
```json
{
  "message": "I see you're stuck on the ID upload...",
  "type": "urgent",
  "offerLabel": "AI Insight",
  "offerAdvisor": true
}
```
**Your Task:** You need to update the payload in `main.py` to include a new field:
1.  `routing_target`: Set this to `"CHATBOT"` if the behavior is BLOCKED, STRUGGLING, or HESITANT. Otherwise, omit it or set it to `"UI_WIDGET"`.

### B. Frontend Updates (`NudgeOverlay.js`)
Currently, clicking the CTA button on the Nudge toast executes a simple `window.location.href = '/some-page'`.
**Your Task:**
1.  Modify the `handleAction` click handler in `NudgeOverlay.js`.
2.  Read `toast.routing_target`.
3.  If it equals `"CHATBOT"`, **prevent the redirect**. Instead, open a new Chat UI Modal.
4.  **The Initial Message:** The chat window MUST open with the AI-generated prompt that was sent in `toast.message` as the very first message from the bot.
5.  **The Hardcoded Fallback (Phase 1 Hack):** For Phase 1, we are not connecting the chat interface back to the LLM yet. Whenever the user types and sends a reply, the bot should simply respond with a hardcoded fallback message, e.g., *"Thank you for providing that detail. Let me connect you to a human advisor."*

## 4. Comprehensive Testing Requirements
Before you commit and push these changes, you **MUST** run and pass the following tests locally to ensure the routing is flawless.

> [!IMPORTANT]
> Do not push your branch until all 3 tests pass perfectly. A broken routing logic will trap users on the frontend.

### Test 1: The Chatbot Route
1.  Navigate to your app.
2.  Spam-click (rage click) a button 4-5 times quickly to trigger the `BLOCKED` profile.
3.  When the Nudge appears, click the CTA button.
4.  **Verification:** The page *must not* redirect. The new Chat UI Modal must open immediately. The first message inside the chat UI must accurately display the AI-generated text from the nudge.

### Test 2: The Standard Route
1.  Refresh the page.
2.  Scroll deeply down the page efficiently without stopping, triggering the `HIGH_INTENT` profile.
3.  When the Nudge appears, click the CTA button.
4.  **Verification:** The Chat UI Modal *must not* open. The browser should seamlessly redirect you to the standard target URL just like it normally does.

### Test 3: The Hardcoded Fallback
1.  Open the Chatbot Route again.
2.  Type "Hello, yes I am stuck on the ID" into the chat input and hit send.
3.  **Verification:** The bot must immediately reply with the hardcoded string (e.g., "Thank you for providing that detail. Let me connect you to a human advisor.").
