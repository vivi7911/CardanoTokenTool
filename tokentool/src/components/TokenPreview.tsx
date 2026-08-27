import type { Derived, TokenConfig } from "../lib/cardano";
import { formatUnits } from "../lib/cardano";
import { IconCopy, IconFlame, TokenEmblem } from "./icons";

interface Props {
  cfg: TokenConfig;
  derived: Derived;
  copy: (text: string, label: string) => void;
}

export default function TokenPreview({ cfg, derived, copy }: Props) {
  const q = (cfg.quantity || "0").replace(/[^\d]/g, "") || "0";

  return (
    <div className="panel panel-hover flex flex-col overflow-hidden">
      <div className="border-b border-line/60 px-4 py-3">
        <h3 className="font-display text-[12px] font-bold tracking-[0.1em] text-ink">ASSET PREVIEW</h3>
      </div>

      <div className="flex items-center gap-4 px-4 pt-4">
        <TokenEmblem seed={derived.policyId} size={92} letter={cfg.ticker || "?"} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[22px] font-bold leading-none text-ink">{cfg.ticker || "——"}</span>
            <span
              className={`chip ${
                cfg.mode === "burn" ? "border-coral/50 text-coral" : "border-mint/50 text-mint"
              }`}
            >
              {cfg.mode === "burn" ? (
                <span className="flex items-center gap-1">
                  <IconFlame className="h-3 w-3" /> BURN
                </span>
              ) : (
                "MINT"
              )}
            </span>
            <span className="chip uppercase">{cfg.network}</span>
          </div>
          <p className="mt-1.5 truncate text-[13px] text-dim">{cfg.tokenName || "Unnamed token"}</p>
          <p className="num-big mt-1 text-[17px] text-gold">
            {formatUnits(q, cfg.decimals)}
            {cfg.decimals > 0 && <span className="ml-1 text-[11px] text-faint">· {cfg.decimals} dp</span>}
          </p>
        </div>
      </div>

      <div className="space-y-2 px-4 py-4">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-abyss/50 px-3 py-2">
          <div className="min-w-0">
            <div className="label-mono">fingerprint · bech32</div>
            <div className="truncate font-mono text-[11.5px] text-mint">{derived.fingerprint}</div>
          </div>
          <button
            type="button"
            onClick={() => copy(derived.fingerprint, "fingerprint")}
            className="tab-btn shrink-0 rounded-md border border-line2/70 p-1.5 text-dim hover:border-mint/60 hover:text-mint"
            aria-label="copy fingerprint"
          >
            <IconCopy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line/60 bg-abyss/50 px-3 py-2">
          <div className="min-w-0">
            <div className="label-mono">policy id</div>
            <div className="truncate font-mono text-[11.5px] text-sky">{derived.policyId}</div>
          </div>
          <button
            type="button"
            onClick={() => copy(derived.policyId, "policy id")}
            className="tab-btn shrink-0 rounded-md border border-line2/70 p-1.5 text-dim hover:border-cblue/60 hover:text-sky"
            aria-label="copy policy id"
          >
            <IconCopy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <details className="group mt-auto border-t border-line/60" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 transition-colors hover:bg-panel2/60 [&::-webkit-details-marker]:hidden">
          <span className="label-mono">metadata.json · {derived.metadataBytes} B</span>
          <span className="font-mono text-[11px] text-faint transition-transform duration-300 group-open:rotate-90">▸</span>
        </summary>
        <pre className="max-h-[220px] overflow-auto border-t border-line/40 bg-[#030917] p-3.5 font-mono text-[11px] leading-relaxed text-[#9fd8b8]">
          {derived.metadataJson}
        </pre>
      </details>
    </div>
  );
}
