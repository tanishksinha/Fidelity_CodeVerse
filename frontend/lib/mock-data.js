/**
 * MOCK TELEMETRY DATA
 * Simulated behavioral sessions for the War Room demo.
 * Each session represents a user who bounced with captured hesitation signals.
 */

export const sessions = [
  {
    id: 'USR-9F42A',
    stage: 'Checkout',
    intent: 'Liquidity Anxiety',
    severity: 'high',
    hovered: 'exit_load_penalty_growth_fund',
    hoverDuration: '14.2s',
    scrollDepth: '88%',
    velocity: 'high',
    confidence: 92,
    profile:
      'User compared SIP returns extensively, hovered on exit-load language for 14.2 seconds, then abandoned during KYC attestations. Behavioral signature consistent with growth interest constrained by short-term cash access anxiety.',
    emailSubject: 'Understanding SIP liquidity before you commit',
    emailBody:
      'We noticed you were exploring growth-oriented SIP strategies. Many investors share your concern about exit loads and liquidity terms — it\'s a sign of careful planning, not hesitation.',
    emailCta:
      'We\'ve prepared a personalized liquidity timeline showing exactly when your funds become penalty-free. Would you like us to walk through it with you?',
  },
  {
    id: 'USR-18C7D',
    stage: 'Investments',
    intent: 'Fee Sensitivity',
    severity: 'medium',
    hovered: 'expense_ratio_balanced_fund',
    hoverDuration: '9.6s',
    scrollDepth: '72%',
    velocity: 'normal',
    confidence: 78,
    profile:
      'User studied expense ratio details across three fund cards and opened Know More twice without proceeding to checkout. Pattern suggests comparison shopping behavior with cost as primary decision factor.',
    emailSubject: 'A clearer look at SIP costs and net returns',
    emailBody:
      'We see you were comparing fund expense ratios — that\'s exactly the kind of diligence that leads to better outcomes. Here\'s what most investors miss about net-of-fee returns.',
    emailCta:
      'Our fee transparency calculator can show you the actual dollar impact of expense ratios over your investment horizon. Try it here — no account needed.',
  },
  {
    id: 'USR-44B90',
    stage: 'Checkout',
    intent: 'Identity Friction',
    severity: 'high',
    hovered: 'checkout_pan_ssn_sensitive_field',
    hoverDuration: '18.9s',
    scrollDepth: '64%',
    velocity: 'high',
    confidence: 95,
    profile:
      'User paused on sensitive identity collection fields (PAN/SSN) for 18.9 seconds, exhibited erratic mouse velocity, then moved cursor toward browser chrome before closing. High-confidence identity trust friction.',
    emailSubject: 'How Fidelity protects your tax and identity details',
    emailBody:
      'Your privacy matters. We understand that sharing personal identification details requires trust. Here\'s exactly how Fidelity encrypts, segregates, and protects every piece of identity data.',
    emailCta:
      'Read our institutional-grade data protection summary — or connect with our security team directly for a private walkthrough.',
  },
  {
    id: 'USR-72E1B',
    stage: 'Investments',
    intent: 'Lock-in Aversion',
    severity: 'medium',
    hovered: 'lock_in_clause_tax_saver',
    hoverDuration: '11.3s',
    scrollDepth: '91%',
    velocity: 'normal',
    confidence: 84,
    profile:
      'User scrolled through the entire investments page (91%) but stalled specifically on the ELSS lock-in clause. Pattern indicates tax benefit interest undermined by commitment horizon anxiety.',
    emailSubject: 'ELSS lock-in explained: what you actually gain in 3 years',
    emailBody:
      'The 3-year lock-in period on ELSS funds often feels like a constraint — but historically, it\'s been one of the strongest forced-discipline mechanisms for building wealth.',
    emailCta:
      'See how our ELSS investors have performed over completed lock-in cycles versus flexible alternatives.',
  },
  {
    id: 'USR-33FA9',
    stage: 'Landing',
    intent: 'General Skepticism',
    severity: 'low',
    hovered: 'landing_trust_badge',
    hoverDuration: '6.8s',
    scrollDepth: '45%',
    velocity: 'normal',
    confidence: 61,
    profile:
      'User spent time hovering on the fiduciary trust badge but only scrolled 45% of the landing page. Low engagement depth suggests informational browsing without conversion intent.',
    emailSubject: 'What a fiduciary standard actually means for your money',
    emailBody:
      'You were looking at our fiduciary commitment — and we think that\'s the right place to start. Unlike commission-based advisors, a fiduciary is legally bound to act in your interest.',
    emailCta:
      'Here\'s a plain-language breakdown of what fiduciary duty means in practice — and why it changes how advice is structured.',
  },
];

export const funnel = [
  { label: 'Landing', users: 1240, status: 'healthy', caption: 'Trusted entry' },
  { label: 'SIPs', users: 842, status: 'healthy', caption: 'Chart viewed' },
  { label: 'Checkout', users: 104, status: 'hesitating', caption: 'KYC friction' },
  { label: 'Bounce', users: 738, status: 'loss', caption: 'Exit captured' },
];

export const liveEvents = [
  'USR-9F42A hover exit_load_penalty_growth_fund 14.2s',
  'USR-18C7D selected text "expense ratio"',
  'USR-44B90 cursor velocity HIGH before tab_hidden',
  'USR-72E1B hover lock_in_clause_tax_saver 11.3s',
  'BATCH_QUEUE semantic-intent-v3 ready',
  'USR-33FA9 scroll_depth 45% — low engagement',
];
