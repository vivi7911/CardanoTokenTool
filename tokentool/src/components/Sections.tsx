import { useEffect, useRef, type ReactNode } from "react";
import {
  BrandMark,
  IconBraces,
  IconGear,
  IconKey,
  IconSend,
  IconShield,
  IconSliders,
  IconTag,
} from "./icons";

/* ---------- scroll reveal wrapper ---------- */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            obs.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- pipeline ---------- */
const STEPS = [
  {
    icon: IconSliders,
    title: "Pull protocol parameters",
    body: "The script queries the live ledger and reads utxoCostPerByte, so deposits and fees always match current network rules.",
    cmd: "query protocol-parameters",
  },
  {
    icon: IconKey,
    title: "Forge the key pairs",
    body: "A payment key covers fees and change; a policy key whose hash is baked into the minting script becomes the only gate that can mint more.",
    cmd: "address key-gen ×2",
  },
  {
    icon: IconBraces,
    title: "Compile the policy script",
    body: "A plain signature policy — or an “all” script with a before-slot clause that permanently freezes supply — hashed into the policy id.",
    cmd: "transaction policyid",
  },
  {
    icon: IconTag,
    title: "Author CIP-25 metadata",
    body: "Label-721 JSON keyed by policy id carries name, description, image and decimals, so wallets and explorers render the asset properly.",
    cmd: "metadata.json · label 721",
  },
  {
    icon: IconGear,
    title: "Build the balanced transaction",
    body: "transaction build computes the fee automatically and threads the mint bundle, metadata and change output into a single body.",
    cmd: "transaction build --mint",
  },
  {
    icon: IconSend,
    title: "Sign, submit, verify",
    body: "Both keys witness the transaction, relays carry it into a block, and a final utxo query proves the new asset balance on chain.",
    cmd: "sign · submit · query utxo",
  },
];

export function PipelineSection() {
  return (
    <section className="mt-16">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-mono text-cblue">under the hood</div>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-ink md:text-[32px]">
              What the script does,
              <br />
              step by step
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-dim">
            Eight bash blocks, zero hand-waving. Every run is idempotent — keys and policy are created once and reused.
          </p>
        </div>
      </Reveal>

      <div className="relative mt-10">
        <div className="absolute top-6 bottom-6 left-[27px] hidden w-px bg-gradient-to-b from-cblue/50 via-line2/50 to-transparent md:block" />
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <li className="panel panel-hover group flex gap-5 p-5">
                <div className="hidden md:block">
                  <div className="num-big relative z-10 flex h-[54px] w-[54px] items-center justify-center rounded-xl border border-cblue/40 bg-deep text-[17px] text-cblue transition-colors group-hover:border-cblue group-hover:bg-cblue/15">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
                <s.icon className="mt-1 h-6 w-6 shrink-0 text-sky" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-[14.5px] font-bold text-ink">{s.title}</h3>
                    <code className="font-mono text-[11px] text-gold/90">{s.cmd}</code>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-dim">{s.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- field notes ---------- */
export function GuardsSection() {
  return (
    <section className="mt-16 grid gap-4 lg:grid-cols-5">
      <Reveal className="lg:col-span-3">
        <div className="panel panel-hover h-full p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-mint/40 bg-mint/10 text-mint">
              <IconShield className="h-5.5 w-5.5" />
            </span>
            <h3 className="font-display text-[15px] font-bold text-ink">Keys never leave this page</h3>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-dim">
            Token Forge computes everything in your browser — the fingerprints, ids and script text above never touch a
            server. The generated script creates its own <code className="font-mono text-[12.5px] text-sky">policy.skey</code>{" "}
            on the machine that runs it. That single file is the minting authority: back it up offline, and understand
            that anyone holding it can inflate the supply until the policy is time-locked.
          </p>
        </div>
      </Reveal>
      <div className="grid gap-4 lg:col-span-2">
        <Reveal delay={120}>
          <div className="panel panel-hover p-5">
            <div className="label-mono text-aqua">01 · dry run first</div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
              Preview and preprod testnets accept the exact same script — only the{" "}
              <span className="font-mono text-[12px] text-sky">--testnet-magic</span> value changes. Burn test faucet ADA
              before you burn real ADA.
            </p>
          </div>
        </Reveal>
        <Reveal delay={220}>
          <div className="panel panel-hover p-5">
            <div className="label-mono text-gold">02 · one-and-done supply</div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
              Minting the whole supply inside a <span className="font-mono text-[12px] text-sky">before</span>-slot policy
              makes the cap verifiable on chain — explorers will show the policy as locked forever.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
export function Footer() {
  return (
    <footer className="mt-20 border-t border-line/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" />
            <span className="font-display text-[13px] font-bold tracking-[0.14em] text-ink">
              TOKEN<span className="text-cblue">FORGE</span>
            </span>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
            An offline script generator and dry-run simulator. It never broadcasts transactions, never touches real keys,
            and nothing you type leaves the browser. Review every generated script before running it against real funds.
          </p>
        </div>
        <nav className="footer-links grid grid-cols-2 gap-x-12 gap-y-2.5 font-mono text-[12px]">
          <a
            className="text-dim transition-colors hover:text-sky"
            href="https://developers.cardano.org/docs/native-tokens/minting/"
            target="_blank"
            rel="noreferrer"
          >
            ↗ minting guide
          </a>
          <a
            className="text-dim transition-colors hover:text-sky"
            href="https://cips.cardano.org/cip/CIP-0025"
            target="_blank"
            rel="noreferrer"
          >
            ↗ cip-25 metadata
          </a>
          <a
            className="text-dim transition-colors hover:text-sky"
            href="https://github.com/IntersectMBO/cardano-node/tree/master/cardano-cli"
            target="_blank"
            rel="noreferrer"
          >
            ↗ cardano-cli
          </a>
          <a
            className="text-dim transition-colors hover:text-sky"
            href="https://docs.cardano.org/cardano-testnets/tools/faucet/"
            target="_blank"
            rel="noreferrer"
          >
            ↗ testnet faucet
          </a>
        </nav>
      </div>
      <div className="border-t border-line/40 py-4 text-center">
        <span className="label-mono">forged for the cardano community · ada handled with care</span>
      </div>
    </footer>
  );
}
