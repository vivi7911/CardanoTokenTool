import { useEffect, useState } from "react";
import { BrandMark, IconWallet } from "./icons";
import type { ConnectedWallet } from "./WalletDock";
import { cardanoSlot, shortId, slotToEpoch } from "../lib/cardano";

interface Props {
  wallet: ConnectedWallet | null;
  onOpenDock: () => void;
}

export default function TopBar({ wallet, onOpenDock }: Props) {
  const [slot, setSlot] = useState(() => cardanoSlot());

  useEffect(() => {
    const id = window.setInterval(() => setSlot(cardanoSlot()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-abyss/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold tracking-[0.14em] text-ink">
              TOKEN<span className="text-cblue">FORGE</span>
            </div>
            <div className="label-mono mt-0.5 hidden sm:block">cardano issuance console</div>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          <button
            type="button"
            onClick={onOpenDock}
            className={`tab-btn flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11.5px] font-bold tracking-wide ${
              wallet
                ? "border-mint/50 bg-mint/10 text-mint hover:bg-mint/20"
                : "border-gold/60 bg-gold/10 text-gold hover:bg-gold/20"
            }`}
            title="wallet dock"
          >
            {wallet ? (
              <>
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-mint" />
                <span className="hidden sm:inline">{wallet.name}</span>
                <span className="text-ink">{shortId(wallet.addr, 8, 5)}</span>
              </>
            ) : (
              <>
                <IconWallet className="h-4 w-4" />
                <span>CONNECT</span>
              </>
            )}
          </button>
          <div className="rounded-lg border border-line/80 bg-deep/80 px-3 py-1.5 text-right">
            <div className="num-big text-[13px] text-sky">{slot.toLocaleString("en-US")}</div>
            <div className="label-mono mt-0">slot · epoch {slotToEpoch(slot)}</div>
          </div>
          <div className="chip hidden border-gold/40 text-gold xl:inline-block">cli ≥ 8.0</div>
        </div>
      </div>
    </header>
  );
}
