import { useMemo, useState } from "react";
import type { BuiltScript } from "../lib/scriptBuilder";
import { IconCheck, IconCopy, IconDownload } from "./icons";

/* tiny bash-ish syntax highlighter */
type Tok = { cls: string; text: string };

const RE =
  /(#[^\n]*$)|("[^"\n]*"|'[^'\n]*')|(\$\{[^}\n]*\}|\$[A-Za-z_][A-Za-z0-9_]*)|((?:^|(?<=\s))--?[A-Za-z][A-Za-z0-9-]*)|(\b(?:transaction|query|address|protocol-parameters|policyid|key-gen|key-hash|utxo|build|sign|submit|jq|cat|echo|set|sleep|mkdir|cd|command|exit)\b)|(\b\d{4,}\b)/g;

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(line)) !== null) {
    if (m.index > last) out.push({ cls: "", text: line.slice(last, m.index) });
    const [full, cmt, str, variable, flag, kw, num] = m;
    if (cmt !== undefined) out.push({ cls: "sh-cmt", text: full });
    else if (str !== undefined) out.push({ cls: "sh-str", text: full });
    else if (variable !== undefined) out.push({ cls: "sh-var", text: full });
    else if (flag !== undefined) out.push({ cls: "sh-flag", text: full });
    else if (kw !== undefined) out.push({ cls: "sh-cmd", text: full });
    else if (num !== undefined) out.push({ cls: "sh-num", text: full });
    last = m.index + full.length;
    if (full.length === 0) RE.lastIndex++;
  }
  if (last < line.length) out.push({ cls: "", text: line.slice(last) });
  return out;
}

interface Props {
  built: BuiltScript;
  regenKey: string;
  onCopy: (code: string) => void;
  onDownload: (built: BuiltScript) => void;
}

export default function ScriptPanel({ built, regenKey, onCopy, onDownload }: Props) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => built.code.split("\n"), [built.code]);

  const doCopy = () => {
    onCopy(built.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div id="script-panel" className="panel flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-coral/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-gold/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-mint/70" />
          </span>
          <span className="ml-1 font-mono text-[12.5px] font-medium text-sky">{built.filename}</span>
          <span className="chip">{(built.bytes / 1024).toFixed(1)} KB</span>
          <span className="chip hidden sm:inline-block">{built.lines} lines</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={doCopy}
            className={`tab-btn flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11.5px] tracking-wide ${
              copied
                ? "border-mint/60 bg-mint/15 text-mint"
                : "border-cblue/50 bg-cblue/10 text-sky hover:bg-cblue/20"
            }`}
          >
            {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? "COPIED" : "COPY SCRIPT"}
          </button>
          <button
            type="button"
            onClick={() => onDownload(built)}
            className="tab-btn flex items-center gap-1.5 rounded-lg border border-line2/70 px-3 py-1.5 font-mono text-[11.5px] tracking-wide text-dim hover:border-gold/60 hover:text-gold"
          >
            <IconDownload className="h-3.5 w-3.5" />
            .SH
          </button>
        </div>
      </div>

      <div
        key={regenKey}
        className="regen max-h-[540px] min-h-[300px] flex-1 overflow-auto py-3 pr-2 font-mono text-[12px] leading-[1.7]"
      >
        {lines.map((line, i) => (
          <div key={i} className="tk-line flex px-1">
            <span className="w-9 shrink-0 pr-3 text-right text-[#33487a] select-none">{i + 1}</span>
            <span className="whitespace-pre-wrap break-all text-[#c6d6f5]">
              {tokenize(line).map((t, j) =>
                t.cls ? (
                  <span key={j} className={t.cls}>
                    {t.text}
                  </span>
                ) : (
                  <span key={j}>{t.text}</span>
                )
              )}
              {line === "" && " "}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 px-4 py-2.5">
        <span className="label-mono">auto-regenerates on every config change</span>
        <span className="font-mono text-[11px] text-faint">bash · cardano-cli ≥ 8.0 · jq</span>
      </div>
    </div>
  );
}
