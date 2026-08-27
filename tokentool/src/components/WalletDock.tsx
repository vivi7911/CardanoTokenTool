import { useEffect, useRef, useState } from "react";
import type { Network } from "../lib/cardano";
import { NETWORKS, pseudoHash, seedFromString, shortId } from "../lib/cardano";
import { IconCheck, IconCopy, IconWallet, IconKey } from "./icons";

/* ── wallet registry (simulated CIP-30 providers) ── */
export interface WalletInfo {
  id: string;
  name: string;
  vendor: string;
  detected: boolean;
  accent: string;
  net: Network;
}

export interface ConnectedWallet {
  id: string;
  name: string;
  network: Network;
  balance: number;
  utxos: number;
  addr: string;
}

export const WALLETS: WalletInfo[] = [
  { id: "lace", name: "Lace", vendor: "Input Output", detected: true, accent: "#ff87b7", net: "preview" },
  { id: "eternl", name: "Eternl", vendor: "Eternl.io", detected: true, accent: "#35c08e", net: "preview" },
  { id: "yoroi", name: "Yoroi", vendor: "EMURGO", detected: true, accent: "#17d1aa", net: "preprod" },
  { id: "typhon", name: "Typhon", vendor: "Strica", detected: false, accent: "#4f8dff", net: "mainnet" },
  { id: "gero", name: "GeroWallet", vendor: "Gero", detected: false, accent: "#52d7e6", net: "preview" },
];

/* procedural provider glyphs */
function Glyph({ id, className = "h-6 w-6" }: { id: string; className?: string }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      {id === "lace" && (
        <>
          <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
        </>
      )}
      {id === "eternl" && (
        <>
          <path d="M12 3l9 9-9 9-9-9z" />
          <path d="M12 7.5v9M7.5 12h9" />
        </>
      )}
      {id === "yoroi" && (
        <>
          <path d="M12 3l7 2.6v5.2c0 4.4-2.9 7.7-7 9.7-4.1-2-7-5.3-7-9.7V5.6z" />
          <path d="M8.5 15.5l7-7" />
        </>
      )}
      {id === "typhon" && <path d="M13.5 3L6.5 13.5h4l-1 7.5 7-10.5h-4z" />}
      {id === "gero" && (
        <>
          <path d="M5 6l7 6-7 6M12.5 6l7 6-7 6" />
        </>
      )}
    </svg>
  );
}

/* simulated bech32-ish address */
const B32_SUB = "qpzry9x8gf2tvdw0";
function simAddress(id: string, net: Network): string {
  const prefix = net === "mainnet" ? "addr1q" : "addr_test1q";
  const hex = pseudoHash(`addr:${id}:${net}`, 32);
  const body = Array.from(hex, (h) => B32_SUB[parseInt(h, 16)]).join("");
  return prefix + body;
}

interface Props {
  open: boolean;
  onClose: () => void;
  connected: ConnectedWallet | null;
  issuerNetwork: Network;
  issuerAddr: string;
  onConnect: (w: ConnectedWallet) => void;
  onDisconnect: () => void;
  onUseAddress: (w: ConnectedWallet) => void;
  copy: (text: string, label: string) => void;
}

type FlowState = { walletId: string; lines: string[]; step: number } | null;

export default function WalletDock({
  open,
  onClose,
  connected,
  issuerNetwork,
  issuerAddr,
  onConnect,
  onDisconnect,
  onUseAddress,
  copy,
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [flow, setFlow] = useState<FlowState>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  /* esc to close + scroll lock */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  /* provider scan on open */
  useEffect(() => {
    if (!open) return;
    clearTimers();
    setFlow(null);
    setScanning(true);
    timers.current.push(window.setTimeout(() => setScanning(false), 850));
    return clearTimers;
  }, [open]);

  function beginHandshake(w: WalletInfo) {
    if (connected || flow) return;
    const seed = seedFromString(`session:${w.id}`);
    const balance = 30 + ((seed % 137000) / 100);
    const utxos = 1 + (seed % 9);
    const addr = simAddress(w.id, w.net);
    const magic = NETWORKS[w.net].magic;
    const steps = [
      `» window.cardano.${w.id} — CIP-30 provider injected`,
      "» dApp requests account access…",
      "» access granted by user (simulated)",
      `» getNetworkId() → ${NETWORKS[w.net].label} · magic ${magic}`,
      `» getBalance() → ₳${balance.toFixed(2)} across ${utxos} UTxOs`,
      `✓ session established · ${shortId(addr, 12, 8)}`,
    ];
    setFlow({ walletId: w.id, lines: [steps[0]], step: 0 });
    steps.slice(1).forEach((s, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setFlow((f) => (f ? { ...f, lines: [...f.lines, s], step: i + 1 } : f));
          if (i === steps.length - 2) {
            timers.current.push(
              window.setTimeout(() => {
                onConnect({ id: w.id, name: w.name, network: w.net, balance, utxos, addr });
                setFlow(null);
              }, 420)
            );
          }
        }, 480 * (i + 1))
      );
    });
  }

  if (!open) return null;

  const flowWallet = flow ? WALLETS.find((w) => w.id === flow.walletId) : null;
  const connectedInfo = connected ? WALLETS.find((w) => w.id === connected.id) : null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="close wallet dock"
        onClick={onClose}
        className="backdrop-in absolute inset-0 h-full w-full cursor-default bg-abyss/70 backdrop-blur-[3px]"
      />
      <aside className="dock-in absolute top-0 right-0 flex h-full w-full max-w-[430px] flex-col border-l border-line2/60 bg-panel shadow-2xl">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line/60 px-5 py-4">
          <IconWallet className="h-5 w-5 text-gold" />
          <div>
            <h2 className="font-display text-[13px] font-bold tracking-[0.12em] text-ink">WALLET DOCK</h2>
            <p className="label-mono mt-0.5 tracking-[0.12em]">cip-30 · simulated providers</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tab-btn ml-auto rounded-lg border border-line2/70 px-3 py-1.5 font-mono text-[11px] text-dim hover:border-coral/60 hover:text-coral"
          >
            ESC ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {connected && connectedInfo ? (
            /* ── connected session ── */
            <div className="space-y-4">
              <div className="row-in rounded-xl border p-4" style={{ borderColor: `${connectedInfo.accent}55`, background: `${connectedInfo.accent}0d` }}>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ color: connectedInfo.accent, background: `${connectedInfo.accent}1a`, border: `1px solid ${connectedInfo.accent}55` }}
                  >
                    <Glyph id={connectedInfo.id} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] font-bold text-ink">{connected.name}</span>
                      <span className="pulse-dot h-2 w-2 rounded-full bg-mint" />
                      <span className="chip border-mint/50 text-mint">LIVE</span>
                    </div>
                    <div className="label-mono mt-0.5">{connectedInfo.vendor} · {NETWORKS[connected.network].label}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-line/60 bg-abyss/50 px-3 py-2.5">
                    <div className="label-mono">balance</div>
                    <div className="num-big mt-1 text-[16px] text-gold">₳{connected.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="rounded-lg border border-line/60 bg-abyss/50 px-3 py-2.5">
                    <div className="label-mono">utxos</div>
                    <div className="num-big mt-1 text-[16px] text-sky">{connected.utxos}</div>
                  </div>
                </div>

                <div className="mt-2 rounded-lg border border-line/60 bg-abyss/50 px-3 py-2.5">
                  <div className="label-mono">receiving address</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate font-mono text-[11.5px] text-mint">{shortId(connected.addr, 18, 12)}</span>
                    <button
                      type="button"
                      onClick={() => copy(connected.addr, "address")}
                      className="tab-btn shrink-0 rounded-md border border-line2/70 p-1 text-dim hover:border-mint/60 hover:text-mint"
                      aria-label="copy address"
                    >
                      <IconCopy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {connected.network !== issuerNetwork && (
                <div className="row-in rounded-lg border border-gold/40 bg-gold/[0.07] px-3.5 py-3 text-[12.5px] leading-relaxed text-gold">
                  ⚠ wallet sits on <b>{NETWORKS[connected.network].label}</b> but the script targets{" "}
                  <b>{NETWORKS[issuerNetwork].label}</b>. Switch the issuer network — or use the address anyway for a dry run.
                </div>
              )}

              {connected.addr === issuerAddr ? (
                <div className="row-in flex items-center gap-2 rounded-lg border border-mint/40 bg-mint/[0.07] px-3.5 py-3 font-mono text-[12px] text-mint">
                  <IconCheck className="h-4 w-4" /> issuer script already points at this address
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUseAddress(connected)}
                  className="tab-btn row-in flex w-full items-center justify-center gap-2 rounded-lg border border-cblue/60 bg-cblue/15 px-4 py-3 font-mono text-[12px] font-bold tracking-wide text-sky hover:bg-cblue/25"
                >
                  <IconKey className="h-4 w-4" /> USE AS ISSUER ADDRESS
                </button>
              )}

              <button
                type="button"
                onClick={onDisconnect}
                className="tab-btn w-full rounded-lg border border-line2/70 px-4 py-2.5 font-mono text-[12px] tracking-wide text-dim hover:border-coral/60 hover:text-coral"
              >
                DISCONNECT SESSION
              </button>
            </div>
          ) : (
            /* ── provider list / handshake ── */
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                {scanning ? (
                  <>
                    <span className="pulse-dot h-2 w-2 rounded-full bg-gold" />
                    <span className="label-mono text-gold">scanning window.cardano for providers…</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-mint" />
                    <span className="label-mono">
                      {WALLETS.filter((w) => w.detected).length} of {WALLETS.length} providers detected
                    </span>
                  </>
                )}
              </div>

              {WALLETS.map((w, i) => {
                const busy = flow?.walletId === w.id;
                return (
                  <div
                    key={w.id}
                    className={`row-in rounded-xl border p-3.5 transition-all duration-200 ${
                      busy ? "border-gold/60 bg-gold/[0.05]" : "border-line/70 bg-deep/60"
                    } ${w.detected && !flow ? "hover:-translate-y-0.5 hover:border-line2 hover:bg-panel2/70" : ""}`}
                    style={{ animationDelay: scanning ? "0ms" : `${i * 70}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{ color: w.accent, background: `${w.accent}14`, border: `1px solid ${w.accent}45` }}
                      >
                        <Glyph id={w.id} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-[13.5px] font-bold text-ink">{w.name}</span>
                          <span className="label-mono normal-case">{NETWORKS[w.net].label}</span>
                        </div>
                        <div className="label-mono mt-0.5">{w.vendor} · window.cardano.{w.id}</div>
                      </div>
                      {w.detected ? (
                        <button
                          type="button"
                          disabled={!!flow}
                          onClick={() => beginHandshake(w)}
                          className="tab-btn shrink-0 rounded-lg border border-mint/50 bg-mint/10 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wide text-mint hover:bg-mint/20 disabled:opacity-40"
                        >
                          CONNECT
                        </button>
                      ) : (
                        <span className="chip shrink-0 border-coral/40 text-coral/80">NOT INSTALLED</span>
                      )}
                    </div>

                    {busy && flow && (
                      <div className="term mt-3 h-auto p-3">
                        {flow.lines.map((l, j) => (
                          <div key={j} className={`term-line ${l.startsWith("✓") ? "text-mint" : l.startsWith("»") ? "text-sky" : "text-dim"}`}>
                            {l}
                          </div>
                        ))}
                        {flow.step < 5 && <div className="term-line caret text-sky">&nbsp;</div>}
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="px-1 pt-2 text-[11.5px] leading-relaxed text-faint">
                Detection is simulated for this offline console — no browser extension is touched and no transaction is
                ever signed or broadcast. Addresses and balances are deterministic mock data.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-line/60 px-5 py-3">
          <span className="label-mono">session {connected ? "active" : "idle"} · keys stay in the wallet</span>
        </div>
      </aside>
    </div>
  );
}
