import type { TokenMode } from "../lib/cardano";
import { formatUnits, shortId } from "../lib/cardano";
import { IconCopy, IconFlame } from "./icons";

export interface HistoryItem {
  id: string;
  ticker: string;
  name: string;
  quantity: string;
  decimals: number;
  network: string;
  mode: TokenMode;
  fingerprint: string;
  policyId: string;
  txHash: string;
  at: number;
}

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface Props {
  history: HistoryItem[];
  clear: () => void;
  copy: (text: string, label: string) => void;
}

export default function HistoryPanel({ history, clear, copy }: Props) {
  return (
    <section className="mt-6">
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3">
          <h3 className="font-display text-[12px] font-bold tracking-[0.1em] text-ink">FORGE LEDGER</h3>
          <span className="chip">{history.length} runs</span>
          <span className="label-mono hidden sm:inline">persisted in this browser</span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="tab-btn ml-auto rounded-lg border border-coral/40 px-3 py-1.5 font-mono text-[11px] tracking-wide text-coral/80 hover:bg-coral/10 hover:text-coral"
            >
              CLEAR
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="font-mono text-[13px] text-faint">$ no runs recorded yet</p>
            <p className="mt-1.5 text-[12.5px] text-dim">
              Run the dry-run simulator — every completed run is written here and survives reloads.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line/40">
            {history.map((it) => (
              <li
                key={it.id}
                className="grid grid-cols-2 items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-panel2/40 md:grid-cols-[1.1fr_1.3fr_1fr_0.8fr_auto]"
              >
                <div className="flex items-center gap-2.5">
                  {it.mode === "burn" ? (
                    <IconFlame className="h-4 w-4 text-coral" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-mint" />
                  )}
                  <div className="min-w-0">
                    <div className="font-mono text-[13px] font-bold text-ink">${it.ticker}</div>
                    <div className="truncate text-[11px] text-faint">{it.name}</div>
                  </div>
                </div>
                <div className="text-right md:text-left">
                  <div className="num-big text-[12.5px] text-sky">
                    {it.mode === "burn" ? "−" : ""}
                    {formatUnits(it.quantity, it.decimals)}
                  </div>
                  <div className="label-mono">
                    {it.mode} · {it.network}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(it.fingerprint, "fingerprint")}
                  className="tab-btn truncate text-left font-mono text-[11.5px] text-mint/90 hover:text-mint"
                  title={it.fingerprint}
                >
                  {shortId(it.fingerprint, 10, 8)}
                </button>
                <div className="text-right font-mono text-[11px] text-faint">{ago(it.at)}</div>
                <button
                  type="button"
                  onClick={() => copy(it.txHash, "tx hash")}
                  className="tab-btn justify-self-end rounded-md border border-line2/60 p-1.5 text-dim hover:border-cblue/60 hover:text-sky"
                  aria-label="copy tx hash"
                >
                  <IconCopy className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
