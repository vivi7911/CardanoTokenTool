/* ── Cardano helpers · zero-dependency, runs fully in the browser ── */

export type Network = "mainnet" | "preview" | "preprod";
export type PolicyType = "sig" | "timelock";
export type TokenMode = "mint" | "burn";

export interface TokenConfig {
  network: Network;
  ticker: string;
  assetName: string;
  tokenName: string;
  description: string;
  decimals: number;
  quantity: string;
  mode: TokenMode;
  policyType: PolicyType;
  lockSlot: string;
  addr: string;
}

export interface Derived {
  policyId: string;
  assetHex: string;
  fingerprint: string;
  metadataJson: string;
  metadataBytes: number;
  fee: number;
  minUtxo: number;
  total: number;
  netFlag: string;
  addr: string;
}

export const NETWORKS: Record<Network, { magic: number; label: string }> = {
  mainnet: { magic: 764824073, label: "Mainnet" },
  preview: { magic: 2, label: "Preview" },
  preprod: { magic: 1, label: "Preprod" },
};

export const COINS_PER_UTXO_BYTE = 4310;

const HEX56 = /^[0-9a-fA-F]{56}$/;

export function isValidAddress(addr: string): boolean {
  const t = addr.trim();
  if (t.length < 40) return false;
  if (t.startsWith("addr_test1")) return true;
  return t.startsWith("addr1");
}

export function formatAda(lovelace: number): string {
  return (lovelace / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatUnits(qty: string, decimals: number): string {
  const n = BigInt(qty || "0");
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const base = 10n ** BigInt(decimals);
  const intPart = (abs / base).toLocaleString("en-US");
  if (decimals === 0) return `${neg ? "-" : ""}${intPart}`;
  const frac = (abs % base).toString().padStart(decimals, "0");
  return `${neg ? "-" : ""}${intPart}.${frac}`;
}

export function strToHex(s: string): string {
  return Array.from(new TextEncoder().encode(s), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function byteLen(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function shortId(id: string, head = 10, tail = 8): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/* deterministic seed from string (FNV-1a) */
export function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* deterministic pseudo-hash for offline previews (clearly not blake2b) */
export function pseudoHash(input: string, bytes: number): string {
  let seed = seedFromString(input);
  const out: string[] = [];
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < bytes * 2; i++) out.push(Math.floor(rand() * 16).toString(16));
  return out.join("");
}

/* ── bech32 (BIP-173) → CIP-14 asset fingerprint ── */
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >>> i) & 1) chk ^= GEN[i];
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >>> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}

function convertBits(data: Uint8Array, from: number, to: number): number[] {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      ret.push((acc >>> bits) & ((1 << to) - 1));
    }
  }
  if (bits > 0) ret.push((acc << (to - bits)) & ((1 << to) - 1));
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const values = bech32HrpExpand(hrp).concat(data, [0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const checksum: number[] = [];
  for (let i = 0; i < 6; i++) checksum.push((polymod >>> (5 * (5 - i))) & 31);
  return hrp + "1" + data.concat(checksum).map((d) => BECH32_CHARSET[d]).join("");
}

export function assetFingerprint(policyHex: string, assetHex: string): string {
  const bytes = new Uint8Array((policyHex + assetHex).match(/../g)!.map((b) => parseInt(b, 16)));
  return bech32Encode("asset", convertBits(bytes, 8, 5));
}

/* ── Cardano mainnet slot clock (CIP-30 Shelley genesis) ── */
export function cardanoSlot(): number {
  const SHELLEY_ERA_START = 4492800;
  const SHELLEY_START_UTC = Date.UTC(2020, 6, 29, 21, 44, 51);
  return SHELLEY_ERA_START + Math.floor((Date.now() - SHELLEY_START_UTC) / 1000);
}

export function slotToEpoch(slot: number): number {
  return Math.floor(Math.max(0, slot - 4492800) / 432000) + 208;
}

/* ── main derivation: everything the console displays ── */
export function derive(cfg: TokenConfig): Derived {
  const assetHex = strToHex(cfg.assetName);
  const addr = cfg.addr.trim();
  const policyId = HEX56.test(addr) ? addr.toLowerCase() : pseudoHash(`policy:${addr}`, 28);
  const fingerprint = assetFingerprint(policyId, assetHex);

  const quantity = (cfg.quantity || "0").replace(/[^\d]/g, "") || "0";

  const meta = {
    name: cfg.tokenName || cfg.assetName || "Unnamed",
    description: cfg.description || "",
    ticker: cfg.ticker || undefined,
    decimals: cfg.decimals,
    image: "ipfs://REPLACE_WITH_CID",
  };
  const metadataJson = JSON.stringify({ "721": { [policyId]: { [cfg.assetName]: meta }, version: 1 } }, null, 2);
  const metadataBytes = new TextEncoder().encode(metadataJson).length;

  /* conservative Alonzo-era estimates: linear fee 44·size + 155381 */
  const fee = 178000 + metadataBytes * 2 + (cfg.mode === "burn" ? 6000 : 0);
  const minUtxo = Math.round((160 + assetHex.length / 2) * COINS_PER_UTXO_BYTE);
  const total = fee + minUtxo;

  const netFlag = cfg.network === "mainnet" ? "--mainnet" : `--testnet-magic ${NETWORKS[cfg.network].magic}`;

  return {
    policyId,
    assetHex,
    fingerprint,
    metadataJson,
    metadataBytes,
    fee,
    minUtxo,
    total,
    netFlag,
    addr,
  };
}
