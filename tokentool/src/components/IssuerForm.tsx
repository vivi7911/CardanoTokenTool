import type { ReactNode } from "react";
import type { Derived, TokenConfig } from "../lib/cardano";
import { NETWORKS, byteLen, formatAda, formatUnits, isValidAddress } from "../lib/cardano";
import { buildScript } from "../lib/scriptBuilder";
import { IconCopy, IconDownload, IconFlame, IconGear } from "./icons";

const HEX56 = /^[0-9a-fA-F]{56}$/;

interface Props {
  cfg: TokenConfig;
  patch: (p: Partial<TokenConfig>) => void;
  derived: Derived;
  notify: (msg: string) => void;
}

const PRESETS: { label: string; p: Partial<TokenConfig> }[] = [
  { label: "FT · fixed cap", p: { mode: "mint", policyType: "timelock" } },
  { label: "FT · open policy", p: { mode: "mint", policyType: "sig" } },
  { label: "Burn supply", p: { mode: "burn" } },
];

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="label-mono text-dim">{label}</span>
        {hint && <span className="font-mono text-[10.5px] text-faint">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 font-mono text-[11px] text-coral">{error}</p>}
    </label>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`tab-btn rounded-lg border px-2 py-2 font-mono text-[11.5px] tracking-wide ${
            value === o.v
              ? "border-cblue/70 bg-cblue/15 text-sky"
              : "border-line/70 bg-abyss/40 text-faint hover:border-line2 hover:text-dim"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function IssuerForm({ cfg, patch, derived, notify }: Props) {
  const q = (cfg.quantity || "0").replace(/[^\d]/g, "") || "0";
  const qtyBig = BigInt(q);

  const errors: Record<string, string> = {};
  if (cfg.ticker && (cfg.ticker.length < 2 || cfg.ticker.length > 9)) errors.ticker = "ticker must be 2–9 characters";
  if (!/^[A-Za-z0-9]*$/.test(cfg.assetName)) errors.assetName = "ASCII letters & digits only";
  if (byteLen(cfg.assetName) > 32) errors.assetName = "max 32 bytes";
  if (byteLen(cfg.tokenName) > 64) errors.tokenName = "CIP-25 allows max 64 bytes";
  if (qtyBig <= 0n) errors.quantity = "supply must be at least 1";
  if (cfg.policyType === "timelock") {
    const ls = Number(cfg.lockSlot);
    if (!cfg.lockSlot || Number.isNaN(ls) || ls <= 0) errors.lockSlot = "enter a future slot number";
  }
  if (!cfg.addr.trim()) errors.addr = "required — where the minted tokens land";
  else if (!isValidAddress(cfg.addr) && !HEX56.test(cfg.addr.trim()))
    errors.addr = "paste a Shelley address or a 56-hex policy id";

  const hasErrors = Object.keys(errors).length > 0;

  const jumpToScript = () => {
    if (hasErrors) {
      notify("fix the highlighted fields first");
      return;
    }
    document.getElementById("script-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    notify("script is ready — review, copy, run");
  };

  const exportJson = () => {
    const s = buildScript(cfg, derived);
    const blob = new Blob(
      [JSON.stringify({ config: cfg, script: { filename: s.filename, code: s.code } }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "token-forge-config.json";
    a.click();
    URL.revokeObjectURL(url);
    notify("config exported as JSON");
  };

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3">
        <IconGear className="h-4.5 w-4.5 text-gold" />
        <div>
          <h2 className="font-display text-[12px] font-bold tracking-[0.1em] text-ink">ISSUER CONSOLE</h2>
          <p className="label-mono mt-0.5 tracking-[0.12em]">edit → script updates live</p>
        </div>
        <span className="chip ml-auto border-mint/40 text-mint">live → script</span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label-mono mr-1">presets</span>
          {PRESETS.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => {
                patch(pr.p);
                notify(`preset applied · ${pr.label}`);
              }}
              className="tab-btn chip text-dim hover:border-cblue/60 hover:text-sky"
            >
              {pr.label}
            </button>
          ))}
        </div>

        <Field label="network">
          <Seg
            value={cfg.network}
            onChange={(network) => patch({ network })}
            options={(Object.keys(NETWORKS) as (keyof typeof NETWORKS)[]).map((n) => ({
              v: n,
              label: NETWORKS[n].label.toUpperCase(),
            }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ticker" hint="2–9 chars" error={errors.ticker}>
            <input
              className={`field font-mono uppercase ${errors.ticker ? "field-invalid" : ""}`}
              value={cfg.ticker}
              maxLength={9}
              onChange={(e) => patch({ ticker: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              placeholder="FORGE"
            />
          </Field>
          <Field label="asset name" hint={`${byteLen(cfg.assetName)}/32 B`} error={errors.assetName}>
            <input
              className={`field font-mono ${errors.assetName ? "field-invalid" : ""}`}
              value={cfg.assetName}
              maxLength={32}
              onChange={(e) => patch({ assetName: e.target.value.replace(/[^A-Za-z0-9]/g, "") })}
              placeholder="ForgeToken"
            />
          </Field>
        </div>
        <p className="-mt-2 font-mono text-[11px] text-faint">
          on chain as <span className="text-sky">0x{derived.assetHex || "…"}</span>
        </p>

        <Field label="display name" hint={`${byteLen(cfg.tokenName)}/64 B`} error={errors.tokenName}>
          <input
            className={`field ${errors.tokenName ? "field-invalid" : ""}`}
            value={cfg.tokenName}
            maxLength={64}
            onChange={(e) => patch({ tokenName: e.target.value })}
            placeholder="Forge Token"
          />
        </Field>

        <Field label="description" hint="CIP-25">
          <textarea
            className="field min-h-[64px] resize-y text-[13px]"
            value={cfg.description}
            maxLength={200}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What is this token for?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="decimals" hint="0–6">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={cfg.decimals}
                className="w-full"
                onChange={(e) => patch({ decimals: Number(e.target.value) })}
              />
              <span className="num-big w-5 text-center text-[15px] text-gold">{cfg.decimals}</span>
            </div>
          </Field>
          <Field label="mode">
            <Seg
              value={cfg.mode}
              onChange={(mode) => patch({ mode })}
              options={[
                { v: "mint" as const, label: "MINT" },
                { v: "burn" as const, label: "BURN" },
              ]}
            />
          </Field>
        </div>

        <Field
          label={cfg.mode === "burn" ? "quantity to burn (base units)" : "total supply (base units)"}
          hint={cfg.decimals > 0 ? `= ${formatUnits(q, cfg.decimals)} ${cfg.ticker || "tokens"}` : undefined}
          error={errors.quantity}
        >
          <input
            className={`field font-mono ${errors.quantity ? "field-invalid" : ""}`}
            inputMode="numeric"
            value={cfg.quantity}
            onChange={(e) => patch({ quantity: e.target.value.replace(/[^\d]/g, "").slice(0, 24) })}
            placeholder="1000000000000"
          />
          {cfg.decimals > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["1000", "1000000", "1000000000"].map((s) => {
                const v = BigInt(s) * 10n ** BigInt(cfg.decimals);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ quantity: v.toString() })}
                    className="tab-btn chip text-dim hover:border-gold/60 hover:text-gold"
                  >
                    {formatUnits(v.toString(), cfg.decimals)}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="minting policy">
          <Seg
            value={cfg.policyType}
            onChange={(policyType) => patch({ policyType })}
            options={[
              { v: "sig" as const, label: "SIGNATURE" },
              { v: "timelock" as const, label: "TIME-LOCK" },
            ]}
          />
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-faint">
            {cfg.policyType === "sig"
              ? "Anyone holding policy.skey can mint more later."
              : "Supply is frozen forever after the lock slot — verifiable on chain."}
          </p>
        </Field>

        {cfg.policyType === "timelock" && (
          <Field label="lock slot" hint="minting allowed before this slot" error={errors.lockSlot}>
            <input
              className={`field py-1.5 font-mono text-[12px] ${errors.lockSlot ? "field-invalid" : ""}`}
              inputMode="numeric"
              value={cfg.lockSlot}
              onChange={(e) => patch({ lockSlot: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="e.g. 152000000"
            />
          </Field>
        )}

        <Field label="destination address / policy id" error={errors.addr} hint="addr1… or 56-hex">
          <textarea
            className={`field min-h-[56px] resize-y font-mono text-[12px] ${errors.addr ? "field-invalid" : ""}`}
            value={cfg.addr}
            onChange={(e) => patch({ addr: e.target.value.replace(/\s+/g, "") })}
            placeholder="addr_test1q…  (tokens are minted here)"
          />
        </Field>

        <div className="rounded-lg border border-line/60 bg-abyss/50 p-3">
          <div className="label-mono">derived policy id</div>
          <p className="mt-1 break-all font-mono text-[11.5px] leading-relaxed text-sky">{derived.policyId}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="chip break-all normal-case">
              hex {derived.assetHex || "—"} · {byteLen(cfg.assetName)}/32 B
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line/60 bg-abyss/40 px-2 py-2.5">
            <div className="label-mono">fee</div>
            <div className="num-big mt-1 text-[13px] text-gold">₳{formatAda(derived.fee)}</div>
          </div>
          <div className="rounded-lg border border-line/60 bg-abyss/40 px-2 py-2.5">
            <div className="label-mono">deposit</div>
            <div className="num-big mt-1 text-[13px] text-sky">₳{formatAda(derived.minUtxo)}</div>
          </div>
          <div className="rounded-lg border border-line/60 bg-abyss/40 px-2 py-2.5">
            <div className="label-mono">metadata</div>
            <div className="num-big mt-1 text-[13px] text-aqua">{derived.metadataBytes} B</div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={jumpToScript}
            disabled={hasErrors}
            className="tab-btn flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/60 bg-gold/15 px-4 py-2.5 font-mono text-[12px] font-bold tracking-wide text-gold transition-opacity hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconGear className="h-4 w-4" /> FORGE SCRIPT
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="tab-btn flex items-center gap-1.5 rounded-lg border border-line2/70 px-3 py-2.5 font-mono text-[11.5px] text-dim hover:border-sky/60 hover:text-sky"
          >
            <IconCopy className="h-3.5 w-3.5" /> JSON
          </button>
          <button
            type="button"
            onClick={() => notify("use .SH download in the script panel")}
            className="tab-btn flex items-center gap-1.5 rounded-lg border border-line2/70 px-3 py-2.5 font-mono text-[11.5px] text-dim hover:border-sky/60 hover:text-sky"
          >
            <IconDownload className="h-3.5 w-3.5" /> .SH
          </button>
        </div>

        {cfg.mode === "burn" && (
          <p className="flex items-start gap-2 rounded-lg border border-coral/30 bg-coral/[0.07] p-2.5 text-[11.5px] leading-relaxed text-coral/90">
            <IconFlame className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Burning requires the tokens to already sit in the destination address; the script mints a negative amount to
            destroy them.
          </p>
        )}
        {hasErrors && (
          <p className="font-mono text-[11px] text-coral">
            fix {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? "s" : ""} above
          </p>
        )}
      </div>
    </div>
  );
}
