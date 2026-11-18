import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from './server/api.js';
import { BALLOT_TYPES, COUNT_RULES, THRESHOLDS, fmt } from './server/rules.js';

// ---------------------------------------------------------------------------
// Navigation: a simple screen stack
// ---------------------------------------------------------------------------

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);

// ---------------------------------------------------------------------------
// Data loading: re-runs whenever the mock server's data changes
// ---------------------------------------------------------------------------

export function useData(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null });
  const ref = useRef(loader);
  ref.current = loader;
  const reload = useCallback(() => {
    ref.current().then(
      (data) => setState({ data, error: null }),
      (error) => setState((s) => ({ ...s, error }))
    );
  }, []);
  useEffect(() => {
    reload();
    return api.subscribe(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [state.data, state.error, reload];
}

// ---------------------------------------------------------------------------
// Icons (inline, stroke style)
// ---------------------------------------------------------------------------

const paths = {
  back: 'M15 18l-6-6 6-6',
  chev: 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  ballot: 'M4 7h16v13H4zM9 3h6v6H9z M8 13h8',
  results: 'M5 20V10M12 20V4M19 20v-7',
  church: 'M12 2v5M10 4h4M5 21V11l7-4 7 4v10M9 21v-5a3 3 0 016 0v5',
  people: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 000-6M22 21v-1a5 5 0 00-4-4.9',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  vote: 'M9 12l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
  gavel: 'M14 13l-7.5 7.5a2.1 2.1 0 01-3-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8',
  key: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 11-7.8 7.8 5.5 5.5 0 017.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.7 1.1z',
};

export function Icon({ name, size = 22, stroke = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#c9a04f" strokeWidth="1.5" />
      <path d="M20 8v24M13 15.5h14" stroke="#c9a04f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ large }) {
  return (
    <div className={`logo${large ? ' large' : ''}`}>
      <div className="logo-word">
        <b>ACME</b>
        <small>Fellowship of Churches</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

export function AppBar({ title, back, right, logo }) {
  const nav = useNav();
  return (
    <header className="appbar">
      {back !== false && nav.canPop && (
        <button className="back" onClick={nav.pop} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      {logo ? <div style={{ flex: 1, paddingLeft: 4 }}><Logo /></div> : <h1>{title}</h1>}
      {right && <div className="right">{right}</div>}
    </header>
  );
}

export function TabBar({ tabs, current, onChange }) {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <button key={t.id} className={current === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          <span className="badge" data-count={t.count || undefined}>
            <Icon name={t.icon} />
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}

// Bottom sheet. Close it by swiping down, tapping outside it, or the X button.
export function Sheet({ onClose, children }) {
  const ref = useRef(null);
  const start = useRef(null);
  const [dy, setDy] = useState(0);

  const begin = (y) => {
    if (ref.current && ref.current.scrollTop <= 0) start.current = y;
  };
  const move = (y) => {
    if (start.current == null) return;
    const d = y - start.current;
    if (d > 0) setDy(d);
    else { start.current = null; setDy(0); } // swiping up scrolls the sheet instead
  };
  const end = () => {
    if (start.current == null) return;
    start.current = null;
    if (dy > 80) onClose();
    else setDy(0);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
        onTouchStart={(e) => begin(e.touches[0].clientY)}
        onTouchMove={(e) => move(e.touches[0].clientY)}
        onTouchEnd={end} onTouchCancel={end}>
        <div className="sheet-top"
          onPointerDown={(e) => { if (e.pointerType === 'mouse') { begin(e.clientY); e.currentTarget.setPointerCapture(e.pointerId); } }}
          onPointerMove={(e) => e.pointerType === 'mouse' && move(e.clientY)}
          onPointerUp={(e) => e.pointerType === 'mouse' && end()}>
          <div className="grabber" />
          <button className="sheet-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Row({ title, sub, right, onClick, chevron = true }) {
  return (
    <button className={`row${onClick ? '' : ' static'}`} onClick={onClick} type="button">
      <div className="main">
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {right}
      {onClick && chevron && <span className="chev"><Icon name="chev" size={18} /></span>}
    </button>
  );
}

export function Empty({ icon = 'inbox', children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} stroke={1.5} />
      <div>{children}</div>
    </div>
  );
}

export function Banner({ tone = 'navy', icon, title, children }) {
  const ic = icon || { green: 'check', red: 'x', gold: 'alert', navy: 'info' }[tone];
  return (
    <div className={`banner ${tone}`}>
      <span className="icon"><Icon name={ic} /></span>
      <div>
        {title && <h3>{title}</h3>}
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export function Choice({ selected, onClick, label, desc, className = '' }) {
  return (
    <button type="button" className={`choice ${className}${selected ? ' selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="dot" />
      <span>
        <span className="label">{label}</span>
        {desc && <span className="desc" style={{ display: 'block' }}>{desc}</span>}
      </span>
    </button>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle">
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint && <span className="tiny muted" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" />
    </label>
  );
}

export function WeightPips({ n }) {
  return (
    <div className="weight-pips" aria-label={`${n} of 4 votes`}>
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ballot helpers
// ---------------------------------------------------------------------------

export function typeLabel(b) {
  if (b.commissionId) return 'Judicial Commission slate';
  return BALLOT_TYPES[b.type]?.label || b.type;
}

export function StatusChip({ status }) {
  if (status === 'open') return <span className="chip green">Open</span>;
  if (status === 'draft') return <span className="chip gray">Not open yet</span>;
  return <span className="chip">Closed</span>;
}

export function RuleChips({ ballot }) {
  return (
    <div className="chips">
      <span className="chip gold">{typeLabel(ballot)}</span>
      <span className="chip">{THRESHOLDS[ballot.threshold].label}</span>
      <span className="chip">{COUNT_RULES[ballot.countRule]}</span>
      {ballot.region && <span className="chip">{ballot.region} churches only</span>}
    </div>
  );
}

export const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const time = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export function choiceLabel(ballot, choice) {
  if (choice === 'abstain') return 'Abstain';
  if (choice === 'yes') return 'Yes';
  if (choice === 'no') return 'No';
  return ballot.options.find((o) => o.id === choice)?.label || choice;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

const unitFor = (n, unit) => (n === 1 ? { churches: 'church', votes: 'vote' }[unit] || unit : unit);

function BarRow({ label, value, total, unit, tone, mark }) {
  const p = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="bar-row">
      <div className="top">
        <b>{label}</b>
        <span>
          {value} {unitFor(value, unit)} {total > 0 && <span className="muted">· {fmt(p)}%</span>}
        </span>
      </div>
      <div className="bar">
        <i className={tone} style={{ width: `${p}%` }} />
        {mark != null && <span className="mark" style={{ left: `${mark}%` }} />}
      </div>
    </div>
  );
}

const markFor = { majority: 50, twoThirds: 66.67, threeQuarters: 75 };

function MotionCount({ title, count, pass, unit, decides, threshold, ballotId }) {
  const nav = useNav();
  return (
    <div className="card count-block tappable" onClick={() => nav.push('resultDetails', { ballotId })}>
      <h3>
        {title}
        {decides ? (
          pass ? <span className="chip green">Passed</span> : <span className="chip red">Did not pass</span>
        ) : (
          <span className="chip gray">Does not decide</span>
        )}
      </h3>
      <BarRow label="Yes" value={count.by.yes} total={count.cast} unit={unit} mark={markFor[threshold]} />
      <BarRow label="No" value={count.by.no} total={count.cast} unit={unit} tone="gray" />
      <div className="legend">
        {count.cast} {unitFor(count.cast, unit)} cast. {count.abstain > 0 && `${count.abstain} abstained (not counted). `}
        Needed: {THRESHOLDS[threshold].label.toLowerCase()}. The line on the bar marks it.
      </div>
    </div>
  );
}

/** Shown under a closed result: the next open ballot this viewer can act on. */
export function NextBallot({ currentId, churchId, screen }) {
  const nav = useNav();
  const [ballots] = useData(() => api.listBallots(churchId ? { churchId } : {}), [churchId]);
  const next = (ballots || []).find((b) => b.status === 'open' && b.id !== currentId && (!churchId || (b.eligible && !b.myVote)));
  if (!next) return null;
  return (
    <button type="button" className="next-ballot" onClick={() => nav.replace(screen, { ballotId: next.id })}>
      <span>
        <span className="eyebrow-sm">Next ballot is open</span>
        <b>{next.title}</b>
        <span className="sub">{typeLabel(next)} · {THRESHOLDS[next.threshold].label} · {COUNT_RULES[next.countRule]}{next.region ? ` · ${next.region} only` : ''}</span>
      </span>
      <Icon name="chev" />
    </button>
  );
}

function ChartsLink({ ballotId, churchOnly }) {
  const nav = useNav();
  return (
    <button type="button" className="results-link" onClick={() => nav.push('resultDetails', { ballotId })}>
      <span>
        <b>Charts and details</b>
        <span className="sub">{churchOnly ? 'Votes by Region and every church\u2019s vote' : 'Both counts, votes by weight and Region, and every church\u2019s vote'}</span>
      </span>
      <Icon name="results" />
    </button>
  );
}

export function ResultView({ ballot }) {
  const r = ballot.result;
  if (!r) return null;
  if (r.kind === 'motion') {
    return (
      <>
        {r.passed ? (
          <Banner tone="green" title="Passed">{r.explanation}</Banner>
        ) : (
          <Banner tone="red" title="Did not pass">{r.explanation}</Banner>
        )}
        <ChartsLink ballotId={ballot.id} churchOnly={ballot.countRule === 'church'} />
        <MotionCount title="Church count" count={r.tally.church} pass={r.churchPass} unit="churches"
          decides threshold={ballot.threshold} ballotId={ballot.id} />
        {ballot.countRule === 'both' && (
          <MotionCount title="Weighted count" count={r.tally.weighted} pass={r.weightedPass} unit="votes"
            decides threshold={ballot.threshold} ballotId={ballot.id} />
        )}
      </>
    );
  }
  return <ElectionResult ballot={ballot} r={r} />;
}

function ElectionResult({ ballot, r }) {
  const nav = useNav();
  const name = (id) => ballot.options.find((o) => o.id === id)?.label || id;
  const { rows, tally: t } = r.standings;
  let banner;
  if (r.outcome === 'elected') banner = <Banner tone="green" title={`${name(r.winner)} is elected`}>{r.explanation}</Banner>;
  else if (r.outcome === 'disqualified') banner = <Banner tone="red" title="Candidates disqualified">{r.explanation}</Banner>;
  else banner = <Banner tone="gold" title="No one elected on this ballot">{r.explanation}</Banner>;
  return (
    <>
      {banner}
      <ChartsLink ballotId={ballot.id} />
      <div className="card tappable" onClick={() => nav.push('resultDetails', { ballotId: ballot.id })}>
        <table className="standings">
          <thead>
            <tr><th>Candidate</th><th>Church</th><th>Weighted</th><th>Combined</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={r.winner === row.id ? 'win' : ''}>{name(row.id)}</td>
                <td className={row.carriesChurch ? 'win' : ''}>{fmt(row.churchPct)}%<span className="n">{row.churchVotes} {unitFor(row.churchVotes, 'churches')}</span></td>
                <td className={row.carriesWeighted ? 'win' : ''}>{fmt(row.weightedPct)}%<span className="n">{row.weightedVotes} {unitFor(row.weightedVotes, 'votes')}</span></td>
                <td>{fmt(row.combined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="legend">
          {t.church.cast} {unitFor(t.church.cast, 'churches')} and {t.weighted.cast} weighted {unitFor(t.weighted.cast, 'votes')} cast.
          {t.church.abstain > 0 && ` ${t.church.abstain} ${unitFor(t.church.abstain, 'churches')} abstained (not counted).`} Green marks a count the
          candidate carried ({THRESHOLDS[ballot.threshold].label.toLowerCase()}). Combined score = church % + weighted %.
        </div>
      </div>
    </>
  );
}

// State that survives a screen being unmounted and shown again (e.g. the selected tab).
const sticky = new Map();
export const resetSticky = () => sticky.clear();
export function useStickyState(key, initial) {
  const [v, setV] = useState(sticky.has(key) ? sticky.get(key) : initial);
  const set = (x) => { sticky.set(key, x); setV(x); };
  return [v, set];
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return undefined;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [node, setMsg];
}
