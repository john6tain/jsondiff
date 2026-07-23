// ============================================================
// STATE
// ============================================================
let currentView = 'split';
let lastLeft = '';
let lastRight = '';

// ============================================================
// LINE DIFF (LCS)
// ============================================================
function lineDiff(a, b) {
  const m = a.length, n = b.length;
  // For very large inputs, use a simplified approach
  if (m > 2000 || n > 2000) return lineDiffSimple(a, b);

  const leftKeys = a.map(lineKey);
  const rightKeys = b.map(lineKey);
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = leftKeys[i-1] === rightKeys[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const raw = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (leftKeys[i-1] === rightKeys[j-1]) { raw.unshift({ t: 'eq', li: --i, ri: --j }); }
    else if (dp[i-1][j] >= dp[i][j-1]) { raw.unshift({ t: 'del', li: --i }); }
    else { raw.unshift({ t: 'ins', ri: --j }); }
  }
  while (i > 0) raw.unshift({ t: 'del', li: --i });
  while (j > 0) raw.unshift({ t: 'ins', ri: --j });

  return mergeChangedLines(raw, a, b);
}

function lineKey(line) {
  return line.trim().replace(/,\s*$/, '');
}

function mergeChangedLines(raw, leftLines, rightLines) {
  const merged = [];
  for (let k = 0; k < raw.length; k++) {
    if (raw[k].t === 'eq') {
      merged.push(raw[k]);
      continue;
    }

    const changes = [];
    while (k < raw.length && raw[k].t !== 'eq') changes.push(raw[k++]);
    k--;

    const dels = changes.filter(c => c.t === 'del');
    const ins = changes.filter(c => c.t === 'ins');
    const usedIns = new Set();

    for (const del of dels) {
      let bestIdx = -1;
      let bestScore = 0;
      for (let idx = 0; idx < ins.length; idx++) {
        if (usedIns.has(idx)) continue;
        const score = lineSimilarity(leftLines[del.li], rightLines[ins[idx].ri]);
        if (score > bestScore) { bestScore = score; bestIdx = idx; }
      }

      if (bestScore >= 0.72) {
        usedIns.add(bestIdx);
        merged.push({ t: 'mod', li: del.li, ri: ins[bestIdx].ri });
      } else {
        merged.push(del);
      }
    }

    ins.forEach((insLine, idx) => {
      if (!usedIns.has(idx)) merged.push(insLine);
    });
  }
  return merged;
}

function lineSimilarity(a, b) {
  const left = lineKey(a);
  const right = lineKey(b);
  if (!left && !right) return 1;
  if (!left || !right) return 0;

  const m = left.length, n = right.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = left[i - 1] === right[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n] / Math.max(m, n);
}

function lineDiffSimple(a, b) {
  // Fallback: compare by position, but only call similar lines modified.
  const max = Math.max(a.length, b.length);
  const result = [];
  for (let i = 0; i < max; i++) {
    if (i < a.length && i < b.length) {
      if (lineKey(a[i]) === lineKey(b[i])) result.push({ t: 'eq', li: i, ri: i });
      else if (lineSimilarity(a[i], b[i]) >= 0.72) result.push({ t: 'mod', li: i, ri: i });
      else {
        result.push({ t: 'del', li: i });
        result.push({ t: 'ins', ri: i });
      }
    } else if (i < a.length) {
      result.push({ t: 'del', li: i });
    } else {
      result.push({ t: 'ins', ri: i });
    }
  }
  return result;
}

// ============================================================
// CHARACTER DIFF (simple LCS for inline highlights)
// ============================================================
function charDiff(oldS, newS) {
  if (oldS === newS) return null;

  const oldParts = diffParts(oldS, newS);
  const newParts = diffParts(newS, oldS);

  return {
    old: renderInlineDiff(oldS, oldParts, 'char-del'),
    new: renderInlineDiff(newS, newParts, 'char-ins'),
  };
}

function diffParts(source, other) {
  const m = source.length, n = other.length;
  if (m * n > 120000) return prefixSuffixPart(source, other);

  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = source[i - 1] === other[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const pieces = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (source[i - 1] === other[j - 1]) {
      pieces.unshift({ text: source[--i], changed: false });
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      pieces.unshift({ text: source[--i], changed: true });
    } else {
      j--;
    }
  }
  while (i > 0) pieces.unshift({ text: source[--i], changed: true });

  return mergeParts(pieces);
}

function prefixSuffixPart(source, other) {
  let pre = 0, suf = 0;
  while (pre < source.length && pre < other.length && source[pre] === other[pre]) pre++;
  while (suf < source.length - pre && suf < other.length - pre && source[source.length - 1 - suf] === other[other.length - 1 - suf]) suf++;
  return [
    { text: source.slice(0, pre), changed: false },
    { text: source.slice(pre, source.length - suf), changed: true },
    { text: source.slice(source.length - suf), changed: false },
  ].filter(p => p.text);
}

function mergeParts(parts) {
  const merged = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.changed === part.changed) last.text += part.text;
    else merged.push({ ...part });
  }
  return merged;
}

function renderInlineDiff(line, parts, cls) {
  const markers = [];
  let marked = '';
  for (const part of parts) {
    if (!part.changed) {
      marked += part.text;
      continue;
    }
    const id = markers.length;
    markers.push({ id, text: part.text });
    marked += `${id}`;
  }

  let html = highlight(marked);
  for (const marker of markers) {
    const token = `${marker.id}`;
    html = html.replace(token, `<span class="${cls}">${highlight(marker.text)}</span>`);
  }
  return html;
}

// ============================================================
// SYNTAX HIGHLIGHTING
// ============================================================
function highlight(str) {
  return esc(str).replace(
    /("(?:[^"\\]|\\.)*")\s*:/g, '<span class="json-key">$1</span><span class="json-colon">:</span>'
  ).replace(
    /:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-str">$1</span>'
  ).replace(
    /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="json-num">$1</span>'
  ).replace(
    /:\s*(true|false)/g, ': <span class="json-bool">$1</span>'
  ).replace(
    /:\s*(null)/g, ': <span class="json-null">$1</span>'
  ).replace(
    /([{}])/g, '<span class="json-brace">$1</span>'
  ).replace(
    /([[\]])/g, '<span class="json-bracket">$1</span>'
  );
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// RENDER SPLIT VIEW
// ============================================================
function renderSplit(leftLines, rightLines, diffs) {
  let leftHtml = '', rightHtml = '';
  let leftLn = 0, rightLn = 0;

  for (const d of diffs) {
    switch (d.t) {
      case 'eq': {
        leftLn++; rightLn++;
        const h = highlight(leftLines[d.li]);
        leftHtml  += row('eq', leftLn, ' ', h);
        rightHtml += row('eq', rightLn, ' ', h);
        break;
      }
      case 'del': {
        leftLn++;
        leftHtml  += row('del', leftLn, '−', highlight(leftLines[d.li]));
        rightHtml += row('del', '', '', '');
        break;
      }
      case 'ins': {
        rightLn++;
        leftHtml  += row('ins', '', '', '');
        rightHtml += row('ins', rightLn, '+', highlight(rightLines[d.ri]));
        break;
      }
      case 'mod': {
        leftLn++; rightLn++;
        const cd = charDiff(leftLines[d.li], rightLines[d.ri]);
        const l = cd ? cd.old : highlight(leftLines[d.li]);
        const r = cd ? cd.new : highlight(rightLines[d.ri]);
        leftHtml  += row('mod', leftLn, '~', l);
        rightHtml += row('mod', rightLn, '~', r);
        break;
      }
    }
  }

  return `<div class="diff-container"><div class="split-wrap">
    <div class="diff-side"><pre><table class="diff-table"><tbody>${leftHtml}</tbody></table></pre></div>
    <div class="split-divider"></div>
    <div class="diff-side"><pre><table class="diff-table"><tbody>${rightHtml}</tbody></table></pre></div>
  </div></div>`;
}

function row(cls, ln, gutter, code) {
  return `<tr class="${cls}"><td class="ln">${ln}</td><td class="gutter">${gutter}</td><td class="code">${code}</td></tr>`;
}

// ============================================================
// RENDER TABLE VIEW (structural diffs from API)
// ============================================================
function renderTable(diffs) {
  if (!diffs.length) return '<div class="empty-state"><p class="no-changes">No differences found</p></div>';

  const counts = { N: 0, D: 0, E: 0, A: 0 };
  diffs.forEach(d => counts[d.kind]++);

  let rows = '';
  for (const d of diffs) {
    const path = fmtPath(d.path);
    switch (d.kind) {
      case 'N':
        rows += tvRow('added', 'added', path, null, d.rhs); break;
      case 'D':
        rows += tvRow('removed', 'removed', path, d.lhs, null); break;
      case 'E':
        rows += tvRow('edited', 'edited', path, d.lhs, d.rhs); break;
      case 'A':
        rows += tvRow('array', 'array', `${path}[${d.index}]`, d.item.lhs, d.item.rhs); break;
    }
  }

  return `<div class="table-view">
    <div class="tv-header"><span>Type</span><span>Path</span><span>Value</span></div>
    ${rows}
  </div>`;
}

function tvRow(cls, label, path, oldVal, newVal) {
  let val = '';
  if (oldVal !== null && newVal !== null) {
    val = `<span class="tv-val old">${esc(fmtVal(oldVal))}</span><span class="tv-arrow">→</span><span class="tv-val new">${esc(fmtVal(newVal))}</span>`;
  } else if (oldVal !== null) {
    val = `<span class="tv-val old">${esc(fmtVal(oldVal))}</span>`;
  } else {
    val = `<span class="tv-val new">${esc(fmtVal(newVal))}</span>`;
  }
  return `<div class="tv-row ${cls}"><span class="tv-kind">${label}</span><span class="tv-val path">${esc(path)}</span><span>${val}</span></div>`;
}

function fmtPath(p) {
  if (!p) return 'root';
  return p.map((s, i) => {
    if (typeof s === 'number') return `[${s}]`;
    return (i > 0 ? '.' : '') + (/^[a-zA-Z_$]\w*$/.test(s) ? s : `[${JSON.stringify(s)}]`);
  }).join('');
}

function fmtVal(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') { try { return JSON.stringify(v, null, 2); } catch { return String(v); } }
  return JSON.stringify(v);
}

// ============================================================
// STATS BAR
// ============================================================
function renderStats(diffs) {
  if (!diffs.length) return '';
  const counts = { N: 0, D: 0, E: 0 };
  diffs.forEach(d => { if (d.kind === 'N') counts.N++; else if (d.kind === 'D') counts.D++; else counts.E++; });
  const total = counts.N + counts.D + counts.E || 1;

  return `<div class="stats-bar-wrap">
    <div class="stats-track">
      ${counts.N ? `<div class="stats-seg added" style="width:${counts.N/total*100}%"></div>` : ''}
      ${counts.D ? `<div class="stats-seg removed" style="width:${counts.D/total*100}%"></div>` : ''}
      ${counts.E ? `<div class="stats-seg modified" style="width:${counts.E/total*100}%"></div>` : ''}
    </div>
    <div class="stats-labels">
      ${counts.N ? `<span class="stat added"><span class="stat-dot"></span>${counts.N} added</span>` : ''}
      ${counts.D ? `<span class="stat removed"><span class="stat-dot"></span>${counts.D} removed</span>` : ''}
      ${counts.E ? `<span class="stat modified"><span class="stat-dot"></span>${counts.E} modified</span>` : ''}
    </div>
  </div>`;
}

// ============================================================
// COMPARE
// ============================================================
async function compare() {
  const left = document.getElementById('json1').value.trim();
  const right = document.getElementById('json2').value.trim();
  const btn = document.getElementById('compareBtn');
  const err = document.getElementById('error');
  const results = document.getElementById('results');

  err.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Comparing…';

  if (!left && !right) {
    results.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="8" width="16" height="32" rx="3" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/><rect x="28" y="8" width="16" height="32" rx="3" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/><path d="M20 22h8M20 26h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"/></svg>
      <p>Paste two JSON objects to compare</p></div>`;
    btn.disabled = false; btn.textContent = 'Compare';
    return;
  }

  try {
    // Parse both
    let obj1, obj2;
    try { obj1 = JSON.parse(left); } catch (e) { throw new Error(`Left JSON: ${e.message}`); }
    try { obj2 = JSON.parse(right); } catch (e) { throw new Error(`Right JSON: ${e.message}`); }

    lastLeft = left;
    lastRight = right;

    if (currentView === 'split') {
      // Line-level split diff (client-side)
      const leftPretty = JSON.stringify(obj1, null, 2);
      const rightPretty = JSON.stringify(obj2, null, 2);
      const leftLines = leftPretty.split('\n');
      const rightLines = rightPretty.split('\n');
      const diffs = lineDiff(leftLines, rightLines);

      const count = diffs.filter(d => d.t !== 'eq').length;
      if (count === 0) {
        results.innerHTML = '<div class="empty-state"><p class="no-changes">No differences found</p></div>';
      } else {
        results.innerHTML = renderSplit(leftLines, rightLines, diffs);
      }
    } else {
      // Structural table view (API)
      const res = await fetch('/api/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json1: left, json2: right })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      results.innerHTML = renderStats(data.diffs) + renderTable(data.diffs);
    }
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
    results.innerHTML = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Compare';
  }
}

// ============================================================
// TOOLBAR ACTIONS
// ============================================================
function formatJSON(id) {
  const ta = document.getElementById(id);
  try {
    ta.value = JSON.stringify(JSON.parse(ta.value), null, 2);
  } catch (e) {
    const err = document.getElementById('error');
    err.textContent = `Cannot format: ${e.message}`;
    err.classList.remove('hidden');
  }
}

function clearJSON(id) {
  document.getElementById(id).value = '';
}

function copyJSON(id) {
  const text = document.getElementById(id).value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector(`#${id}`).closest('.panel').querySelector('.action-btn:nth-child(3)');
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = orig, 1200);
  });
}

// ============================================================
// VIEW TOGGLE
// ============================================================
document.getElementById('viewToggle').addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn');
  if (!btn) return;
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentView = btn.dataset.view;
  // Re-compare if we have data
  if (lastLeft || lastRight) {
    document.getElementById('json1').value = lastLeft;
    document.getElementById('json2').value = lastRight;
    compare();
  }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    compare();
  }
  // Tab inserts spaces in textareas
  if (e.key === 'Tab' && e.target.tagName === 'TEXTAREA') {
    e.preventDefault();
    const ta = e.target;
    const start = ta.selectionStart;
    ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = start + 2;
  }
});

// ============================================================
// INIT — load from URL params
// ============================================================
(function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('left')) document.getElementById('json1').value = params.get('left');
  if (params.has('right')) document.getElementById('json2').value = params.get('right');
  if (params.has('left') && params.has('right')) compare();
})();
