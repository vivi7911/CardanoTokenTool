import { useEffect, useMemo, useState } from "react";
import TopBar from "./components/TopBar";
import IssuerForm from "./components/IssuerForm";
import ScriptPanel from "./components/ScriptPanel";
import ExecutionPanel from "./components/ExecutionPanel";
import TokenPreview from "./components/TokenPreview";
import AssetChart from "./components/AssetChart";
import HistoryPanel, { type HistoryItem } from "./components/HistoryPanel";
import WalletDock, { type ConnectedWallet } from "./components/WalletDock";
import { PipelineSection, GuardsSection, Footer } from "./components/Sections";
import { buildScript } from "./lib/scriptBuilder";
import {
  cardanoSlot,
  derive,
  formatAda,
  formatUnits,
  slotToEpoch,
  type TokenConfig,
} from "./lib/cardano";

const DEFAULT_CFG: TokenConfig = {
  network: "preview",
  ticker: "FORGE",
  assetName: "ForgeToken",
  tokenName: "Forge Token",
  description: "Utility token forged with Token Forge.",
  decimals: 6,
  quantity: "1000000000000",
  mode: "mint",
  policyType: "sig",
  lockSlot: String(cardanoSlot() + 86400),
  addr: "",
};

const LS_CFG = "tokenforge.cfg.v1";
const LS_HIST = "tokenforge.history.v1";
const LS_WALLET = "tokenforge.wallet.v1";

function loadWallet(): ConnectedWallet | null {
  try {
    const raw = localStorage.getItem(LS_WALLET);
    if (raw) return JSON.parse(raw) as ConnectedWallet;
  } catch {
    /* ignore */
  }
  return null;
}

function loadCfg(): TokenConfig {
  try {
    const raw = localStorage.getItem(LS_CFG);
    if (raw) return { ...DEFAULT_CFG, ...(JSON.parse(raw) as Partial<TokenConfig>) };
  } catch {
    /* ignore */
  }
  return DEFAULT_CFG;
}

function loadHist(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(LS_HIST);
    if (raw) return JSON.parse(raw) as HistoryItem[];
  } catch {
    /* ignore */
  }
  return [];
}

interface Toast {
  id: number;
  msg: string;
}

export default function App() {
  const [cfg, setCfg] = useState<TokenConfig>(loadCfg);
  const [history, setHistory] = useState<HistoryItem[]>(loadHist);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(loadWallet);
  const [dockOpen, setDockOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      if (wallet) localStorage.setItem(LS_WALLET, JSON.stringify(wallet));
      else localStorage.removeItem(LS_WALLET);
    } catch {
      /* ignore */
    }
  }, [wallet]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CFG, JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_HIST, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history]);

  const patch = (p: Partial<TokenConfig>) => setCfg((c) => ({ ...c, ...p }));

  const notify = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied to clipboard`);
    } catch {
      notify("clipboard unavailable — select and copy manually");
    }
  };

  const derived = useMemo(() => derive(cfg), [cfg]);
  const built = useMemo(() => buildScript(cfg, derived), [cfg, derived]);

  const download = (b: ReturnType<typeof buildScript>) => {
    const blob = new Blob([b.code], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = b.filename;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${b.filename} downloaded`);
  };

  const stats = [
    { k: "est. fee", v: `₳${formatAda(derived.fee)}`, c: "text-gold" },
    { k: "min UTxO", v: `₳${formatAda(derived.minUtxo)}`, c: "text-sky" },
    {
      k: "supply",
      v: formatUnits((cfg.quantity || "0").replace(/[^\d]/g, "") || "0", cfg.decimals),
      c: "text-ink",
    },
    {
      k: "policy",
      v: cfg.policyType === "sig" ? "signature" : `lock · ep ${slotToEpoch(Number(cfg.lockSlot) || 0)}`,
      c: "text-aqua",
    },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <TopBar wallet={wallet} onOpenDock={() => setDockOpen(true)} />

        <main className="mx-auto max-w-[1440px] px-5 pb-6 lg:px-8">
          {/* console header */}
          <section className="flex flex-wrap items-end justify-between gap-5 border-b border-line/50 pt-8 pb-6">
            <div>
              <div className="label-mono text-cblue">cardano native assets · automatic issuance</div>
              <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-ink md:text-[42px] md:leading-[1.05]">
                Forge a token.
                <br />
                <span className="text-sky">One script does the rest.</span>
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-dim">
                Configure the asset on the left — Token Forge writes a complete{" "}
                <span className="font-mono text-[13px] text-sky">cardano-cli</span> bash script on the right: keys,
                policy, CIP-25 metadata, fee-balanced build, dual signatures, submit.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className="chip border-mint/40 text-mint">no node required to generate</span>
              <div className="panel grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-xl bg-line/40 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.k} className="min-w-[120px] bg-deep/90 px-4 py-3">
                    <div className="label-mono">{s.k}</div>
                    <div className={`num-big mt-1 truncate text-[15px] ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* workspace */}
          <section className="mt-7 grid gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-4">
              <IssuerForm cfg={cfg} patch={patch} derived={derived} notify={notify} />
            </div>
            <div className="grid content-start gap-5 xl:col-span-8">
              <ScriptPanel
                built={built}
                regenKey={built.filename + built.bytes}
                onCopy={(code) => copy(code, built.filename)}
                onDownload={download}
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <ExecutionPanel
                  cfg={cfg}
                  derived={derived}
                  onMinted={(item) => {
                    setHistory((h) => [item, ...h].slice(0, 20));
                    notify("run recorded in the ledger");
                  }}
                  copy={copy}
                />
                <TokenPreview cfg={cfg} derived={derived} copy={copy} />
              </div>
            </div>
          </section>

          <section className="mt-5">
            <AssetChart cfg={cfg} />
          </section>

          <HistoryPanel
            history={history}
            clear={() => {
              setHistory([]);
              notify("ledger cleared");
            }}
            copy={copy}
          />

          <PipelineSection />
          <GuardsSection />
        </main>

        <Footer />
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-in rounded-lg border border-line2/70 bg-panel/95 px-4 py-2.5 font-mono text-[12px] text-sky shadow-xl"
          >
            ✓ {t.msg}
          </div>
        ))}
      </div>

      {/* wallet dock */}
      <WalletDock
        open={dockOpen}
        onClose={() => setDockOpen(false)}
        connected={wallet}
        issuerNetwork={cfg.network}
        issuerAddr={cfg.addr.trim()}
        onConnect={(w) => {
          setWallet(w);
          notify(`connected to ${w.name} · ${w.network}`);
        }}
        onDisconnect={() => {
          setWallet(null);
          notify("wallet session closed");
        }}
        onUseAddress={(w) => {
          patch({ addr: w.addr, network: w.network });
          setDockOpen(false);
          notify(`issuer address + network set from ${w.name}`);
        }}
        copy={copy}
      />
    </div>
  );
}
