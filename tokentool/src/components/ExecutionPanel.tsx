import { useEffect, useRef, useState } from "react";
import type { Derived, TokenConfig } from "../lib/cardano";
import { cardanoSlot, formatAda, pseudoHash, shortId } from "../lib/cardano";
import { IconCopy, IconPlay, IconStop, IconTerminal } from "./icons";
import type { HistoryItem } from "./HistoryPanel";

type Kind = "cmd" | "info" | "ok" | "warn";
interface Log {
  kind: Kind;
  text: string;
}

interface Props {
  cfg: TokenConfig;
  derived: Derived;
  onMinted: (item: HistoryItem) => void;
  copy: (text: string, label: string) => void;
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const KIND_STYLE: Record<Kind, string> = {
  cmd: "text-sky",
  info: "text-dim",
  ok: "text-mint",
  warn: "text-coral",
};

const KIND_PREFIX: Record<Kind, string> = {
  cmd: "❯ ",
  info: "  · ",
  ok: "  ✓ ",
  warn: "  ! ",
};

export default function ExecutionPanel({ cfg, derived, onMinted, copy }: Props) {
  const [logs, setLogs] = useState<Log[]>([
    { kind: "info", text: "dry-run simulator ready — nothing is broadcast to any network" },
  ]);
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ txHash: string; block: number } | null>(null);
  const cancelled = useRef(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const push = (kind: Kind, text: string) => setLogs((l) => [...l, { kind, text }]);

  async function run() {
    if (status === "running") return;
    cancelled.current = false;
    setResult(null);
    setLogs([]);
    setStatus("running");
    setProgress(0);

    const txHash = pseudoHash(`tx:${Date.now()}:${derived.fingerprint}`, 32);
    const block = 9_000_000 + (cardanoSlot() % 400_000);
    const unit = `${derived.policyId}.${derived.assetHex}`;

    const steps: { kind: Kind; text: string; wait: number }[] = [
      { kind: "cmd", text: `$ cardano-cli query protocol-parameters ${derived.netFlag}`, wait: 500 },
      { kind: "info", text: "protocol parameters cached · utxoCostPerByte 4310", wait: 420 },
      { kind: "cmd", text: "$ cardano-cli address key-gen  # payment + policy", wait: 460 },
      { kind: "info", text: "ed25519 key pairs ready · policy key hash pinned", wait: 400 },
      { kind: "cmd", text: "$ cardano-cli transaction policyid --script-file policy/policy.script", wait: 460 },
      { kind: "ok", text: `policy id ${shortId(derived.policyId, 16, 12)}`, wait: 420 },
      { kind: "cmd", text: `$ cardano-cli transaction build --mint "${cfg.mode === "burn" ? "-" : ""}… ${shortId(unit, 20, 8)}"`, wait: 520 },
      { kind: "info", text: `fee balanced automatically · ₳${formatAda(derived.fee)} · deposit ₳${formatAda(derived.minUtxo)}`, wait: 460 },
      { kind: "cmd", text: "$ cardano-cli transaction sign  # payment.skey + policy.skey", wait: 440 },
      { kind: "ok", text: "witnesses 2/2 attached", wait: 380 },
      { kind: "cmd", text: `$ cardano-cli transaction submit ${derived.netFlag}`, wait: 500 },
      { kind: "info", text: "relayed to 3 peers · awaiting block…", wait: 700 },
      { kind: "ok", text: `confirmed · block ${block.toLocaleString("en-US")} · tx ${shortId(txHash, 12, 10)}`, wait: 300 },
    ];

    for (let i = 0; i < steps.length; i++) {
      if (cancelled.current) return;
      const s = steps[i];
      push(s.kind, s.text);
      setProgress(Math.round(((i + 1) / steps.length) * 100));
      await sleep(s.wait);
    }
    if (cancelled.current) return;

    setStatus("done");
    setResult({ txHash, block });
    onMinted({
      id: `${Date.now()}`,
      ticker: cfg.ticker || "???",
      name: cfg.tokenName || cfg.assetName,
      quantity: (cfg.quantity || "0").replace(/[^\d]/g, "") || "0",
      decimals: cfg.decimals,
      network: cfg.network,
      mode: cfg.mode,
      fingerprint: derived.fingerprint,
      policyId: derived.policyId,
      txHash,
      at: Date.now(),
    });
  }

  function stop() {
    cancelled.current = true;
    setStatus("idle");
    push("warn", "run aborted by operator — no transaction was produced");
  }

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3">
        <IconTerminal className="h-4.5 w-4.5 text-cblue" />
        <div>
          <h3 className="font-display text-[12px] font-bold tracking-[0.1em] text-ink">DRY-RUN SIMULATOR</h3>
          <p className="label-mono mt-0.5 tracking-[0.12em]">replays the script step by step · offline</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {status === "running" ? (
            <button
              type="button"
              onClick={stop}
              className="tab-btn flex items-center gap-1.5 rounded-lg border border-coral/60 bg-coral/10 px-4 py-2 font-mono text-[11.5px] tracking-wide text-coral hover:bg-coral/20"
            >
              <IconStop className="h-3.5 w-3.5" /> ABORT
            </button>
          ) : (
            <button
              type="button"
              onClick={run}
              className="tab-btn flex items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/15 px-4 py-2 font-mono text-[11.5px] font-bold tracking-wide text-gold hover:bg-gold/25"
            >
              <IconPlay className="h-3.5 w-3.5" /> {status === "done" ? "RUN AGAIN" : "RUN DRY-RUN"}
            </button>
          )}
        </div>
      </div>

      <div className="h-[3px] w-full bg-deep">
        <div
          className={`h-full bg-gradient-to-r from-cblue via-sky to-mint transition-all duration-500 ${status === "running" ? "progress-glow" : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div ref={termRef} className="term mx-3 mt-3 h-[240px] overflow-auto p-3.5">
        {logs.map((l, i) => (
          <div key={i} className={`term-line ${KIND_STYLE[l.kind]}`}>
            <span className="opacity-60 select-none">{KIND_PREFIX[l.kind]}</span>
            {l.text}
          </div>
        ))}
        {status !== "done" && <div className="term-line caret text-sky">&nbsp;</div>}
      </div>

      {status === "done" && result && (
        <div className="regen mx-3 mb-3 mt-3 grid gap-2 rounded-lg border border-mint/25 bg-mint/[0.06] p-3.5 sm:grid-cols-3">
          <div>
            <div className="label-mono text-mint/80">tx hash</div>
            <button
              type="button"
              onClick={() => copy(result.txHash, "tx hash")}
              className="tab-btn mt-1 flex w-full items-center gap-1.5 truncate text-left font-mono text-[11.5px] text-ink hover:text-sky"
              title="copy"
            >
              {shortId(result.txHash, 14, 10)} <IconCopy className="h-3 w-3 shrink-0 opacity-50" />
            </button>
          </div>
          <div>
            <div className="label-mono text-mint/80">block</div>
            <div className="num-big mt-1 text-[13px] text-ink">{result.block.toLocaleString("en-US")}</div>
          </div>
          <div>
            <div className="label-mono text-mint/80">fee paid</div>
            <div className="num-big mt-1 text-[13px] text-gold">₳{formatAda(derived.fee)}</div>
          </div>
          <div className="border-t border-mint/15 pt-2.5 sm:col-span-3">
            <div className="label-mono text-mint/80">asset fingerprint</div>
            <button
              type="button"
              onClick={() => copy(derived.fingerprint, "fingerprint")}
              className="tab-btn mt-1 flex items-center gap-1.5 font-mono text-[12px] text-mint hover:text-ink"
              title="copy"
            >
              {derived.fingerprint} <IconCopy className="h-3 w-3 opacity-60" />
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line/60 px-4 py-2.5">
        <span className="label-mono">
          {status === "running"
            ? `forging · ${progress}%`
            : status === "done"
              ? `${cfg.mode} simulated · logged below`
              : "awaiting operator"}
        </span>
      </div>
    </div>
  );
}
