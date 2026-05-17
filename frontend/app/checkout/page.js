"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, Building2, FileText, LockKeyhole, ShieldCheck, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import ConsumerHeader from "../../components/ConsumerHeader";

const steps = ["Personal identity", "KYC & tax review", "Funding authorization"];

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", dob: "", mobile: "",
    pan: "", govtId: "", income: "Select bracket", source: "Select source",
    checkExit: false, checkRisk: false, checkIdentity: false,
    bankName: "", accountNo: "", routing: ""
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleNextStep0 = () => {
    if (!formData.firstName || !formData.lastName || !formData.dob || !formData.mobile) {
      setFormError("All personal identity fields are required.");
      return;
    }
    setFormError("");
    setCurrentStep(1);
  };

  const handleNextStep1 = () => {
    if (!formData.pan || !formData.govtId || formData.income === "Select bracket" || formData.source === "Select source") {
      setFormError("All KYC and tax verification fields are required.");
      return;
    }
    if (!formData.checkExit || !formData.checkRisk || !formData.checkIdentity) {
      setFormError("You must agree to all suitability attestations to proceed.");
      return;
    }
    setFormError("");
    setCurrentStep(2);
  };

  const handleSubmit = () => {
    if (!formData.bankName || !formData.accountNo || !formData.routing) {
      setFormError("All funding authorization fields are required.");
      return;
    }
    setFormError("");
    setLoading(true);
    // Simulate secure submission
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-950">
        <ConsumerHeader />
        <main className="mx-auto flex max-w-3xl flex-col items-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-synaptic-green/10 text-synaptic-green mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-950">Application submitted!</h1>
          <p className="mt-4 text-lg text-gray-600">
            Your investor profile is under review by our compliance team. You will receive an email once your account is ready for funding.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <ConsumerHeader />

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-synaptic-green">
              Secure account opening
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">Complete your investor profile.</h1>
            <p data-track="checkout_intro_privacy_copy" className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Synaptic is required to verify identity, tax residency, risk suitability, and funding authorization before
              activating investment instructions.
            </p>
          </div>

          <div className="mb-8">
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-md border p-3 ${
                    currentStep === index 
                      ? "border-synaptic-green bg-synaptic-green/5" 
                      : currentStep > index 
                        ? "border-gray-200 bg-gray-100 opacity-60" 
                        : "border-gray-200 bg-gray-50"
                  }`}
                  data-track={`checkout_step_${index + 1}_${step.toLowerCase().replaceAll(" ", "_")}`}
                >
                  <p className="text-xs font-bold text-synaptic-green">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-md bg-gray-200">
              <div 
                className="h-2 rounded-md bg-synaptic-green transition-all duration-500 ease-in-out" 
                style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {formError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                <p className="font-bold flex items-center gap-2"><AlertTriangle size={16}/> Validation Error</p>
                <p className="mt-1">{formError}</p>
              </div>
            )}

            {currentStep === 0 && (
              <>
                <fieldset className="grid gap-5 md:grid-cols-2">
                  <Input label="Legal first name" name="firstName" value={formData.firstName} onChange={handleChange} track="checkout_first_name_field" />
                  <Input label="Legal last name" name="lastName" value={formData.lastName} onChange={handleChange} track="checkout_last_name_field" />
                  <Input label="Date of birth" name="dob" value={formData.dob} onChange={handleChange} placeholder="MM / DD / YYYY" track="checkout_birthdate_field" />
                  <Input label="Mobile number" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+1" track="checkout_mobile_number_field" />
                </fieldset>
                <button
                  type="button"
                  onClick={handleNextStep0}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-synaptic-dark px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-synaptic-green"
                >
                  Next: KYC Review <ArrowRight size={16} />
                </button>
              </>
            )}

            {currentStep === 1 && (
              <>
                <fieldset className="rounded-lg border border-gray-200 p-5" data-track="kyc_identity_verification_block">
                  <div className="mb-5 flex items-center gap-3">
                    <LockKeyhole className="text-synaptic-green" size={22} />
                    <div>
                      <legend className="text-lg font-bold text-gray-950">KYC and tax verification</legend>
                      <p className="text-sm text-gray-600">Required before any SIP order can be placed.</p>
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Input label="PAN / SSN" name="pan" value={formData.pan} onChange={handleChange} placeholder="Required for tax reporting" track="checkout_pan_ssn_sensitive_field" />
                    <Input label="Government ID document number" name="govtId" value={formData.govtId} onChange={handleChange} placeholder="Passport, Aadhaar, or driver ID" track="checkout_government_id_field" />
                    <Select label="Annual income bracket" name="income" value={formData.income} onChange={handleChange} track="checkout_income_bracket_dropdown" options={["Select bracket", "$0 - $50,000", "$50,000 - $100,000", "$100,000 - $250,000", "$250,000+"]} />
                    <Select label="Primary source of funds" name="source" value={formData.source} onChange={handleChange} track="checkout_source_of_funds_dropdown" options={["Select source", "Salary", "Business income", "Inheritance", "Asset sale", "Other"]} />
                  </div>
                </fieldset>

                <fieldset className="rounded-lg border border-intent-hesitate/40 bg-intent-hesitate/10 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <AlertTriangle className="mt-1 text-amber-700" size={22} />
                    <div>
                      <legend className="text-lg font-bold text-gray-950">Suitability attestations</legend>
                      <p className="text-sm leading-6 text-gray-700">
                        These confirmations are intentionally explicit because the demo needs measurable hesitation around
                        complex financial language.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Checkbox name="checkExit" checked={formData.checkExit} onChange={handleChange} track="checkout_exit_load_acknowledgement" label="I understand that early redemption may incur exit loads, tax events, and unfavorable NAV timing." />
                    <Checkbox name="checkRisk" checked={formData.checkRisk} onChange={handleChange} track="checkout_market_risk_acknowledgement" label="I understand that SIP investments can lose principal and returns are not guaranteed." />
                    <Checkbox name="checkIdentity" checked={formData.checkIdentity} onChange={handleChange} track="checkout_authorize_identity_screening" label="I authorize identity screening, tax validation, sanctions checks, and source-of-funds review." />
                  </div>
                </fieldset>
                
                <div className="flex gap-4">
                  <button type="button" onClick={() => setCurrentStep(0)} className="rounded-md border border-gray-300 px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50">Back</button>
                  <button
                    type="button"
                    onClick={handleNextStep1}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-synaptic-dark px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-synaptic-green"
                  >
                    Next: Funding <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <fieldset className="rounded-lg border border-gray-200 p-5" data-track="funding_authorization_block">
                  <div className="mb-5 flex items-center gap-3">
                    <Building2 className="text-synaptic-green" size={22} />
                    <div>
                      <legend className="text-lg font-bold text-gray-950">Funding Authorization</legend>
                      <p className="text-sm text-gray-600">Link your primary bank account for SIP deductions.</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="e.g. Chase, HDFC" track="checkout_bank_name_field" />
                    <Input label="Account Number" name="accountNo" value={formData.accountNo} onChange={handleChange} placeholder="Enter account number" track="checkout_account_number_field" />
                    <Input label="Routing / IFSC Code" name="routing" value={formData.routing} onChange={handleChange} placeholder="Enter routing or IFSC" track="checkout_routing_code_field" />
                  </div>
                </fieldset>
                
                <div className="flex gap-4">
                  <button type="button" onClick={() => setCurrentStep(1)} disabled={loading} className="rounded-md border border-gray-300 px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-gray-700 hover:bg-gray-50 disabled:opacity-50">Back</button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    data-track="checkout_submit_application_button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-synaptic-green px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#009940] disabled:bg-gray-400"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing...</>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>
              </>
            )}

          </div>

          <p data-track="legal_disclaimer_checkout_primary" className="mt-8 text-xs leading-6 text-gray-500">
            Investing involves risk, including possible loss of principal. Tax treatment depends on individual
            circumstances and may change. Synaptic may decline, delay, or restrict account opening when verification
            obligations are incomplete.
          </p>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_security_sidebar">
            <ShieldCheck className="text-synaptic-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Bank-grade controls</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Encrypted transmission, document review, and monitored funding authorization protect account integrity.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_required_documents">
            <FileText className="text-synaptic-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Documents required</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>PAN / SSN or tax identifier</li>
              <li>Government identity document</li>
              <li>Bank account ownership proof</li>
              <li>Income and suitability declaration</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_institutional_custody">
            <Building2 className="text-synaptic-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Institutional custody</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Assets remain segregated and reconciliation-monitored after funding.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-synaptic-dark">
              <BadgeCheck size={16} />
              SIP-ready after approval
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Input({ label, name, value, onChange, placeholder, track }) {
  return (
    <label data-track={track} className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-synaptic-green focus:ring-2 focus:ring-synaptic-green/15"
      />
    </label>
  );
}

function Select({ label, name, value, onChange, options, track }) {
  return (
    <label data-track={track} className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select 
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-synaptic-green focus:ring-2 focus:ring-synaptic-green/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, name, checked, onChange, track }) {
  return (
    <label data-track={track} className="flex gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition">
      <input 
        type="checkbox" 
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-synaptic-green focus:ring-synaptic-green" 
      />
      <span>{label}</span>
    </label>
  );
}
