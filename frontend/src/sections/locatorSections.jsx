import React, { useEffect, useRef, useState } from "react";
import { Panel } from "@/components/Layout";

export function LocatorPractice() {
  return (
    <Panel title="Locator strategies" testid="locator-panel">
      <div className="space-y-3">
        <button id="locate-by-id" className="block rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-zinc-100">Find me by <code className="font-mono text-blue-400">#locate-by-id</code></button>
        <button className="locate-by-class block rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-zinc-100">Find me by <code className="font-mono text-blue-400">.locate-by-class</code></button>
        <button data-testid="locate-by-testid" className="block rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-zinc-100">Find me by data-testid</button>
        <button aria-label="locate-by-aria" className="block rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-zinc-100">Find me by aria-label</button>
        <div className="rounded-md border border-zinc-800 p-4">
          <span className="text-zinc-400 text-sm">XPath axes target (parent):</span>
          <div id="xpath-parent" className="mt-2">
            <span data-testid="xpath-sibling-a" className="text-zinc-300">sibling A</span>
            <span data-testid="xpath-target" className="ml-4 text-emerald-400 font-mono">target (following-sibling)</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function HiddenElements() {
  const [reveal, setReveal] = useState(false);
  return (
    <Panel title="display vs visibility vs opacity" testid="hidden-panel">
      <div className="space-y-4">
        <div style={{ display: "none" }} data-testid="hidden-display-none">display none (not in layout)</div>
        <div style={{ visibility: "hidden" }} data-testid="hidden-visibility" className="text-zinc-500">visibility hidden (occupies space)</div>
        <div style={{ opacity: 0 }} data-testid="hidden-opacity" className="text-zinc-500">opacity 0 (invisible but clickable)</div>
        <button data-testid="reveal-toggle" onClick={() => setReveal(!reveal)} className="rounded-md bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white">Toggle hidden element</button>
        {reveal && <div data-testid="revealed-element" className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-300">Now visible!</div>}
      </div>
    </Panel>
  );
}

export function ShadowDom() {
  const hostRef = useRef(null);
  const [value, setValue] = useState("(empty)");
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const root = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .box{border:1px solid #3f3f46;border-radius:8px;padding:16px;background:#000;}
      input{background:#09090b;border:1px solid #27272a;color:#f4f4f5;padding:8px;border-radius:6px;width:100%;box-sizing:border-box;}
      button{margin-top:8px;background:#2563eb;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;}
      p{color:#34d399;font-family:monospace;margin-top:10px;}`;

    const box = document.createElement("div");
    box.className = "box";
    const input = document.createElement("input");
    input.setAttribute("data-testid", "shadow-input");
    input.setAttribute("placeholder", "Inside shadow root");
    const btn = document.createElement("button");
    btn.setAttribute("data-testid", "shadow-button");
    btn.textContent = "Copy to output";
    const out = document.createElement("p");
    out.setAttribute("data-testid", "shadow-output");
    out.textContent = "(empty)";

    btn.addEventListener("click", () => {
      out.textContent = input.value || "(empty)";
      setValue(input.value || "(empty)");
    });

    box.append(input, btn, out);
    root.append(style, box);
  }, []);
  return (
    <Panel title="Shadow DOM host" testid="shadow-panel">
      <p className="text-sm text-zinc-400 mb-4">Pierce the shadow root to reach the input & button.</p>
      <div ref={hostRef} data-testid="shadow-host" />
      <p className="mt-4 font-mono text-sm text-blue-400">react-mirror: {value}</p>
    </Panel>
  );
}

export function ComplexDom() {
  return (
    <Panel title="Deeply nested DOM" testid="complex-panel">
      <div className="rounded-md border border-zinc-800 p-4" data-level="0">
        <div className="pl-4 border-l border-zinc-800" data-level="1">
          level 1
          <div className="pl-4 border-l border-zinc-800 mt-2" data-level="2">
            level 2
            <ul className="pl-4 border-l border-zinc-800 mt-2" data-testid="complex-list">
              <li className="text-zinc-300 py-1" data-testid="complex-item-1"><span className="tag">alpha</span></li>
              <li className="text-zinc-300 py-1" data-testid="complex-item-2"><span className="tag">beta</span></li>
              <li className="text-emerald-400 py-1" data-testid="complex-item-3"><span className="tag target">gamma (nth-child 3)</span></li>
            </ul>
            <div className="pl-4 border-l border-zinc-800 mt-2" data-level="3">
              <a href="#" data-testid="complex-deep-link" className="text-blue-400">deeply nested link (div &gt; div &gt; div a)</a>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
