import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Landmark,
  LineChart,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ConsumerHeader from "../components/ConsumerHeader";

const valueProps = [
  {
    icon: Scale,
    title: "Fiduciary Standard",
    body: "Advice structured around suitability, risk capacity, and documented client outcomes.",
    track: "value_prop_fiduciary_standard",
  },
  {
    icon: Landmark,
    title: "Tax-Loss Harvesting",
    body: "Lot-level monitoring designed to offset gains and keep portfolios tax aware.",
    track: "value_prop_tax_loss_harvesting",
  },
  {
    icon: LockKeyhole,
    title: "Secure Onboarding",
    body: "Identity, funding, and document flows protected by institutional controls.",
    track: "value_prop_secure_account_opening",
  },
];

const metrics = [
  ["AUM monitored", "$4.8B"],
  ["Model portfolios", "38"],
  ["Rebalance checks", "24/7"],
  ["Tax lots scanned", "1.2M"],
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-950">
      <ConsumerHeader />

      <section className="relative isolate min-h-[calc(100vh-156px)] overflow-hidden border-b border-gray-200">
        <Image
          src="/images/wealth-hero.png"
          alt="Premium financial advisory dashboard"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/88 via-gray-950/62 to-gray-950/12" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/50 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-6 py-16 lg:px-8">
          <div className="max-w-2xl py-10 text-white">
            <div
              data-track="landing_trust_badge"
              className="mb-6 inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] backdrop-blur"
            >
              <ShieldCheck size={15} />
              Fiduciary wealth portal
            </div>
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">Private wealth management</h1>
            <p data-track="hero_value_statement" className="mt-6 text-lg leading-8 text-white/82">
              Portfolio strategy, SIP planning, tax-aware rebalancing, and secure account opening in one premium
              investor experience.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/investments"
                data-track="hero_explore_sips_cta"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-synaptic-green px-5 py-3 text-sm font-bold text-white shadow-glow-green transition-colors hover:bg-[#009940]"
              >
                Explore SIP strategies
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/checkout"
                data-track="hero_open_account_secondary"
                className="inline-flex items-center justify-center rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/18"
              >
                Open an account
              </Link>
            </div>
          </div>

          <div className="mt-2 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4" data-track="landing_metric_strip">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/15 bg-white/12 p-4 text-white backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/62">{label}</p>
                <p className="mt-2 font-mono text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-12 md:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-synaptic-green">Institutional planning</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
            A calmer interface for decisions that usually feel noisy.
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-600">
            The consumer environment looks trustworthy on purpose, while the Ghost SDK quietly captures where confidence
            breaks down.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                data-track={item.track}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-synaptic-green/40 hover:shadow-md"
              >
                <Icon className="mb-5 text-synaptic-green" size={30} />
                <h3 className="text-base font-bold text-gray-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-3 lg:px-8">
          <SignalPanel
            icon={LineChart}
            title="SIP performance lab"
            value="+18.4%"
            body="Benchmark comparison, contribution schedules, and liquidity terms."
            track="landing_sip_lab_panel"
          />
          <SignalPanel
            icon={BadgeDollarSign}
            title="Tax-aware portfolios"
            value="76%"
            body="Simulated tax efficiency score across current holdings."
            track="landing_tax_panel"
          />
          <SignalPanel
            icon={Sparkles}
            title="AI re-engagement"
            value="Live"
            body="Behavioral telemetry converted into one-to-one intervention drafts."
            track="landing_ai_panel"
          />
        </div>
      </section>
    </div>
  );
}

function SignalPanel({ icon: Icon, title, value, body, track }) {
  return (
    <div data-track={track} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <Icon className="text-synaptic-green" size={28} />
        <span className="font-mono text-2xl font-bold text-gray-950">{value}</span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-gray-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
    </div>
  );
}
