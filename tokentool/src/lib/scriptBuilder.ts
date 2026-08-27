import type { Derived, TokenConfig } from "./cardano";
import { NETWORKS, formatUnits } from "./cardano";

export interface BuiltScript {
  code: string;
  filename: string;
  bytes: number;
  lines: number;
}

const hr = (t: string) => `# ── ${t} ` + "─".repeat(Math.max(2, 54 - t.length));

export function buildScript(cfg: TokenConfig, d: Derived): BuiltScript {
  const net = NETWORKS[cfg.network];
  const qty = (cfg.quantity || "0").replace(/[^\d]/g, "") || "0";
  const sign = cfg.mode === "burn" ? "-" : "";
  const ticker = (cfg.ticker || "TOKEN").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ") + "Z";

  const policyScript =
    cfg.policyType === "sig"
      ? `{ "type": "sig", "keyHash": "$KEYHASH" }`
      : `{ "type": "all", "scripts": [
  { "type": "sig", "keyHash": "$KEYHASH" },
  { "type": "before", "slot": ${cfg.lockSlot || "0"} }
] }`;

  const code = `#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  TOKEN FORGE · automatic issuance script
#  ─────────────────────────────────────────────────────────
#  Token       ${cfg.ticker} — ${cfg.tokenName}
#  Asset unit  ${d.assetHex}  ("${cfg.assetName}")
#  Supply      ${formatUnits(qty, cfg.decimals)} ${cfg.ticker}  (${qty} base units · decimals ${cfg.decimals})
#  Mode        ${cfg.mode.toUpperCase()}
#  Network     ${cfg.network}${cfg.network !== "mainnet" ? ` (magic ${net.magic})` : ""}
#  Policy      ${cfg.policyType === "sig" ? "signature (Ed25519)" : `time-locked before slot ${cfg.lockSlot}`}
#  Policy ID   ${d.policyId}   (projected — recomputed from the policy key below)
#  Generated   ${stamp} · requires cardano-cli ≥ 8.0 + jq
# ════════════════════════════════════════════════════════════
set -euo pipefail

CLI="\${CARDANO_CLI:-cardano-cli}"
NET="${cfg.network === "mainnet" ? "--mainnet" : `--testnet-magic ${net.magic}`}"
DIR="$HOME/forge-${ticker}"
ADDR="${d.addr}"

command -v "$CLI" >/dev/null 2>&1 || { echo "cardano-cli not found in PATH"; exit 1; }
command -v jq     >/dev/null 2>&1 || { echo "jq not found in PATH";        exit 1; }
mkdir -p "$DIR/policy" && cd "$DIR"
echo "» forge workspace: $DIR"

${hr("1 · protocol parameters")}
"$CLI" query protocol-parameters $NET --out-file protocol.json
COINS_PER_UTXO_BYTE=$(jq -r '.utxoCostPerByte' protocol.json)
echo "» coins-per-utxo-byte: $COINS_PER_UTXO_BYTE"

${hr("2 · keys (created once, reused on later runs)")}
[ -f payment.skey ] || "$CLI" address key-gen \\
  --verification-key-file payment.vkey \\
  --signing-key-file payment.skey
[ -f policy/policy.skey ] || "$CLI" address key-gen \\
  --verification-key-file policy/policy.vkey \\
  --signing-key-file policy/policy.skey
"$CLI" address build --payment-verification-key-file payment.vkey $NET --out-file payment.addr
echo "» funding address: $(cat payment.addr)"

${hr("3 · native policy script + policy id")}
KEYHASH=$("$CLI" address key-hash --payment-verification-key-file policy/policy.vkey)
cat > policy/policy.script <<POLICY
${policyScript}
POLICY
POLICY_ID=$("$CLI" transaction policyid --script-file policy/policy.script)
echo "» policy id: $POLICY_ID"

${hr("4 · CIP-25 metadata (label 721)")}
cat > metadata.json <<'META'
${d.metadataJson}
META
echo "» metadata written: $(wc -c < metadata.json) bytes"

${hr("5 · locate funding UTxO")}
UTXO_JSON=$("$CLI" query utxo --address "$ADDR" $NET --out-file /dev/stdout)
TXIN=$(echo "$UTXO_JSON" | jq -r 'to_entries | sort_by(-.value.value.lovelace) | .[0].key')
[ "$TXIN" != "null" ] || { echo "no UTxO found at $ADDR — send some ADA first"; exit 1; }
LOVELACE=$(echo "$UTXO_JSON" | jq -r --arg k "$TXIN" '.[$k].value.lovelace')
echo "» spending $TXIN · $LOVELACE lovelace"

${hr(`6 · build ${cfg.mode} transaction`)}
"$CLI" transaction build $NET \\
  --conway-era \\
  --tx-in "$TXIN" \\
  --tx-out "$ADDR+${d.minUtxo}+${qty} $POLICY_ID.${d.assetHex}" \\
  --mint "${sign}${qty} $POLICY_ID.${d.assetHex}" \\
  --minting-script-file policy/policy.script \\
  --metadata-json-file metadata.json \\
  --change-address "$ADDR" \\
  --out-file tx.raw

${hr("7 · sign with both keys & submit")}
"$CLI" transaction sign \\
  --tx-body-file tx.raw \\
  --signing-key-file payment.skey \\
  --signing-key-file policy/policy.skey $NET \\
  --out-file tx.signed
"$CLI" transaction submit --tx-file tx.signed $NET
echo "» transaction submitted — watch the mempool"

${hr("8 · verify on chain")}
sleep 20
"$CLI" query utxo --address "$ADDR" $NET | grep "${d.assetHex}" \\
  || echo "asset not visible yet — check a block explorer"
echo "» done · asset fingerprint: ${d.fingerprint}"
`;

  return {
    code,
    filename: `forge-${ticker}-${cfg.network}.sh`,
    bytes: new TextEncoder().encode(code).length,
    lines: code.split("\n").length,
  };
}
