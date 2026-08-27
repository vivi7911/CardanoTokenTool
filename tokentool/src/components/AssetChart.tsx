import { useEffect, useRef, useState } from "react";
import type { TokenConfig } from "../lib/cardano";
import { formatUnits } from "../lib/cardano";

interface Alloc {
  community: number;
  treasury: number;
  liquidity: number;
  pump: number;
}

const LS_ALLOC = "tokenforge.alloc.v1";

const DEFAULT_ALLOC: Alloc = { community: 35, treasury: 25, liquidity: 20, pump: 10 };

function loadAlloc(): Alloc {
  try {
    const raw = localStorage.getItem(LS_ALLOC);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Alloc>;
      const clamp = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
      };
      return {
        community: clamp(p.community ?? DEFAULT_ALLOC.community),
        treasury: clamp(p.treasury ?? DEFAULT_ALLOC.treasury),
        liquidity: clamp(p.liquidity ?? DEFAULT_ALLOC.liquidity),
        pump: clamp(p.pump ?? DEFAULT_ALLOC.pump),
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ALLOC;
}

const CATEGORIES: { key: keyof Alloc; label: string; color: string; note: string }[] = [
  { key: "community", label: "Community", color: "#3ed598", note: "airdrops · rewards · grants" },
  { key: "treasury", label: "Treasury", color: "#f2b63c", note: "reserve · governance-controlled" },
  { key: "liquidity", label: "Liquidity", color: "#8fb6ff", note: "DEX pairs · market making" },
  { key: "pump", label: "PumpFun", color: "#52d7e6", note: "launchpad curve · fair launch" },
];

const TEAM_COLOR = "#ff7a6b";

interface Slice {
  label: string;
  color: string;
  pct: number;
  units: string;
  note: string;
}

interface Props {
  cfg: TokenConfig;
}

const R = 70;
const CIRC = 2 * Math.PI * R;

export default function AssetChart({ cfg }: Props) {
  const [alloc, setAlloc] = useState<Alloc>(loadAlloc);
  const [hovered, setHovered] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LS_ALLOC, JSON.stringify(alloc));
    } catch {
      /* ignore */
    }
  }, [alloc]);

  /* scroll reveal */
  useEffect(() => {
    const el = rootRef.current;
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
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const qtyRaw = (cfg.quantity || "0").replace(/[^\d]/g, "") || "0";
  const qty = BigInt(qtyRaw);
  const sliderSum = alloc.community + alloc.treasury + alloc.liquidity + alloc.pump;
  const teamPct = Math.max(0, 100 - sliderSum);
  const overflow = sliderSum > 100;

  const unitsFor = (pct: number) => formatUnits(((qty * BigInt(pct)) / 100n).toString(), cfg.decimals);

  const slices: Slice[] = [
    ...CATEGORIES.map((c) => ({
      label: c.label,
      color: c.color,
      pct: alloc[c.key],
      units: unitsFor(alloc[c.key]),
      note: c.note,
    })),
    { label: "Team", color: TEAM_COLOR, pct: teamPct, units: unitsFor(teamPct), note: "core contributors · vested" },
  ];

  const visible = slices.filter((s) => s.pct > 0);
  const gap = visible.length > 1 ? 2.5 : 0;

  let acc = 0;
  const arcs = visible.map((s) => {
    const len = Math.max((s.pct / 100) * CIRC - gap, 0.8);
    const arc = { ...s, dash: len, offset: -(acc * CIRC) / 100 };
    acc += s.pct;
    return arc;
  });

  const set = (key: keyof Alloc, v: number) =>
    setAlloc((a) => ({ ...a, [key]: Math.min(100, Math.max(0, Math.round(v))) }));

  const active = hovered !== null ? visible[hovered] : null;

  return (
    <div ref={rootRef} className="reveal panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3">
        <div>
          <h3 className="font-display text-[12px] font-bold tracking-[0.1em] text-ink">TOTAL ASSETS</h3>
          <p className="label-mono mt-0.5 tracking-[0.12em]">supply allocation · tokenomics of ${cfg.ticker || "???"}</p>
        </div>
        <span
          className={`chip ml-auto ${
            overflow ? "border-coral/60 text-coral" : "border-mint/40 text-mint"
          }`}
        >
          Σ {alloc.community + alloc.treasury + alloc.liquidity + teamPct}%
        </span>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[300px_1fr] md:p-6">
        {/* donut */}
        <div className="relative mx-auto w-full max-w-[280px]">
          <svg viewBox="0 0 200 200" className="w-full">
            <circle cx="100" cy="100" r={R} fill="none" stroke="#12224a" strokeWidth="26" />
            <g transform="rotate(-90 100 100)">
              {arcs.map((a, i) => (
                <circle
                  key={a.label}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={hovered === i ? 32 : 26}
                  strokeDasharray={`${a.dash} ${CIRC}`}
                  strokeDashoffset={a.offset}
                  className="cursor-pointer"
                  style={{
                    transition:
                      "stroke-dasharray 0.55s cubic-bezier(0.3,0.8,0.3,1), stroke-dashoffset 0.55s cubic-bezier(0.3,0.8,0.3,1), stroke-width 0.2s ease, opacity 0.2s ease",
                    opacity: hovered === null || hovered === i ? 1 : 0.35,
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${a.label} — ${a.pct}% · ${a.units} ${cfg.ticker}`}</title>
                </circle>
              ))}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {active ? (
              <>
                <span className="num-big text-[26px] leading-none" style={{ color: active.color }}>
                  {active.pct}%
                </span>
                <span className="mt-1.5 font-display text-[11px] font-bold tracking-[0.14em] text-ink uppercase">
                  {active.label}
                </span>
                <span className="num-big mt-1 max-w-[130px] truncate text-[11px] text-dim">{active.units}</span>
              </>
            ) : (
              <>
                <span className="num-big max-w-[150px] truncate text-[21px] leading-none text-ink">
                  {formatUnits(qtyRaw, cfg.decimals)}
                </span>
                <span className="mt-1.5 font-display text-[11px] font-bold tracking-[0.14em] text-sky uppercase">
                  {cfg.ticker || "—"} total
                </span>
                <span className="label-mono mt-1">{visible.length} slices</span>
              </>
            )}
          </div>
        </div>

        {/* allocation controls */}
        <div className="flex flex-col justify-center gap-3">
          {CATEGORIES.map((c) => (
            <div
              key={c.key}
              className="grid grid-cols-[130px_1fr_44px] items-center gap-3 rounded-lg border border-line/50 bg-abyss/40 px-3 py-2.5 transition-colors hover:border-line2/80"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                  <span className="text-[13px] font-semibold text-ink">{c.label}</span>
                </div>
                <div className="num-big mt-0.5 truncate pl-[18px] text-[11px] text-faint">
                  {unitsFor(alloc[c.key])} {cfg.ticker}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={alloc[c.key]}
                onChange={(e) => set(c.key, Number(e.target.value))}
                style={{ accentColor: c.color }}
                aria-label={`${c.label} allocation`}
              />
              <span className="num-big text-right text-[14px]" style={{ color: c.color }}>
                {alloc[c.key]}%
              </span>
            </div>
          ))}

          {/* team — computed remainder */}
          <div
            className={`grid grid-cols-[130px_1fr_44px] items-center gap-3 rounded-lg border px-3 py-2.5 ${
              overflow ? "border-coral/50 bg-coral/[0.06]" : "border-dashed border-line2/70 bg-transparent"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: TEAM_COLOR }} />
                <span className="text-[13px] font-semibold text-ink">Team</span>
                <span className="chip py-0.5 text-[9px]">auto</span>
              </div>
              <div className="num-big mt-0.5 truncate pl-[18px] text-[11px] text-faint">
                {teamPct > 0 ? `${unitsFor(teamPct)} ${cfg.ticker}` : "remainder fully allocated"}
              </div>
            </div>
            <div className="px-1 font-mono text-[10.5px] leading-snug text-faint">
              {overflow
                ? "sliders exceed 100% — team share clamped to zero"
                : "whatever the sliders leave behind"}
            </div>
            <span className="num-big text-right text-[14px]" style={{ color: TEAM_COLOR, opacity: teamPct > 0 ? 1 : 0.4 }}>
              {teamPct}%
            </span>
          </div>

          <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
            Allocation is advisory — record it in your CIP-25 metadata or governance docs so the split is public.
            Hover a slice or drag a slider to rebalance the pie.
          </p>
        </div>
      </div>
    </div>
  );
}
