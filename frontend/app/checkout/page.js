import { AlertTriangle, BadgeCheck, Building2, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import ConsumerHeader from "../../components/ConsumerHeader";

const steps = ["Personal identity", "KYC & tax review", "Funding authorization"];

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <ConsumerHeader />

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-fidelity-green">
              Secure account opening
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">Complete your investor profile.</h1>
            <p data-track="checkout_intro_privacy_copy" className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Fidelity is required to verify identity, tax residency, risk suitability, and funding authorization before
              activating investment instructions.
            </p>
          </div>

          <div className="mb-8">
            <div className="grid gap-3 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-md border border-gray-200 bg-gray-50 p-3"
                  data-track={`checkout_step_${index + 1}_${step.toLowerCase().replaceAll(" ", "_")}`}
                >
                  <p className="text-xs font-bold text-fidelity-green">Step {index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-md bg-gray-200">
              <div className="h-2 w-1/3 rounded-md bg-fidelity-green" />
            </div>
          </div>

          <form className="space-y-8">
            <fieldset className="grid gap-5 md:grid-cols-2">
              <Input label="Legal first name" track="checkout_first_name_field" />
              <Input label="Legal last name" track="checkout_last_name_field" />
              <Input label="Date of birth" placeholder="MM / DD / YYYY" track="checkout_birthdate_field" />
              <Input label="Mobile number" placeholder="+1" track="checkout_mobile_number_field" />
            </fieldset>

            <fieldset className="rounded-lg border border-gray-200 p-5" data-track="kyc_identity_verification_block">
              <div className="mb-5 flex items-center gap-3">
                <LockKeyhole className="text-fidelity-green" size={22} />
                <div>
                  <legend className="text-lg font-bold text-gray-950">KYC and tax verification</legend>
                  <p className="text-sm text-gray-600">Required before any SIP order can be placed.</p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  label="PAN / SSN"
                  placeholder="Required for tax reporting"
                  track="checkout_pan_ssn_sensitive_field"
                />
                <Input
                  label="Government ID document number"
                  placeholder="Passport, Aadhaar, or driver ID"
                  track="checkout_government_id_field"
                />
                <Select
                  label="Annual income bracket"
                  track="checkout_income_bracket_dropdown"
                  options={["Select bracket", "$0 - $50,000", "$50,000 - $100,000", "$100,000 - $250,000", "$250,000+"]}
                />
                <Select
                  label="Primary source of funds"
                  track="checkout_source_of_funds_dropdown"
                  options={["Select source", "Salary", "Business income", "Inheritance", "Asset sale", "Other"]}
                />
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
                <Checkbox
                  track="checkout_exit_load_acknowledgement"
                  label="I understand that early redemption may incur exit loads, tax events, and unfavorable NAV timing."
                />
                <Checkbox
                  track="checkout_market_risk_acknowledgement"
                  label="I understand that SIP investments can lose principal and returns are not guaranteed."
                />
                <Checkbox
                  track="checkout_authorize_identity_screening"
                  label="I authorize identity screening, tax validation, sanctions checks, and source-of-funds review."
                />
              </div>
            </fieldset>

            <button
              type="button"
              data-track="checkout_continue_to_kyc_button"
              className="w-full rounded-md bg-fidelity-dark px-5 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-fidelity-green"
            >
              Continue to KYC review
            </button>
          </form>

          <p data-track="legal_disclaimer_checkout_primary" className="mt-8 text-xs leading-6 text-gray-500">
            Investing involves risk, including possible loss of principal. Tax treatment depends on individual
            circumstances and may change. Fidelity may decline, delay, or restrict account opening when verification
            obligations are incomplete.
          </p>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_security_sidebar">
            <ShieldCheck className="text-fidelity-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Bank-grade controls</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Encrypted transmission, document review, and monitored funding authorization protect account integrity.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_required_documents">
            <FileText className="text-fidelity-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Documents required</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>PAN / SSN or tax identifier</li>
              <li>Government identity document</li>
              <li>Bank account ownership proof</li>
              <li>Income and suitability declaration</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm" data-track="checkout_institutional_custody">
            <Building2 className="text-fidelity-green" size={28} />
            <h2 className="mt-4 text-lg font-bold">Institutional custody</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Assets remain segregated and reconciliation-monitored after funding.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-fidelity-dark">
              <BadgeCheck size={16} />
              SIP-ready after approval
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Input({ label, placeholder, track }) {
  return (
    <label data-track={track} className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-fidelity-green focus:ring-2 focus:ring-fidelity-green/15"
      />
    </label>
  );
}

function Select({ label, options, track }) {
  return (
    <label data-track={track} className="block">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <select className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-fidelity-green focus:ring-2 focus:ring-fidelity-green/15">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, track }) {
  return (
    <label data-track={track} className="flex gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-fidelity-green" />
      <span>{label}</span>
    </label>
  );
}
