import React, { useState } from 'react';
import { AppBar, Banner, useData } from '../components.jsx';
import * as api from '../server/api.js';
import { REGIONS, THRESHOLDS, fmt } from '../server/rules.js';

// Categorical series colors, assigned in fixed order (validated palette).
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const ABSTAIN = '#c9c7c1';
const NOT_VOTED = '#ebe9e4';
const NEEDED = { majority: 50, twoThirds: 66.67, threeQuarters: 75 };

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The choices on this ballot, each with a stable color.
function choicesFor(b) {
  const main = b.kind === 'candidates'
    ? b.options.map((o, i) => ({ id: o.id, label: o.label, color: SERIES[i % SERIES.length] }))
    : [{ id: 'yes', label: 'Yes', color: SERIES[0] }, { id: 'no', label: 'No', color: SERIES[1] }];
  return [...main, { id: 'abstain', label: 'Abstained', color: ABSTAIN, muted: true }];
}

function sum(rows, choiceId, weighted) {
  return rows.filter((r) => r.choice === choiceId).reduce((s, r) => s + (weighted ? r.weight : 1), 0);
}

// ---------------------------------------------------------------------------
// Chart pieces
// ---------------------------------------------------------------------------

function Legend({ items }) {
  return (
    <div className="legend-row">
      {items.map((it) => (
        <span key={it.label}><i style={{ background: it.color }} />{it.label}</span>
      ))}
    </div>
  );
}

/** One horizontal bar split into segments. scale = the value that fills the full width. */
function SegBar({ segments, scale, mark, onPick, height = 22 }) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className="segbar" style={{ height }}>
      <div className="segbar-fill">
        {visible.map((s) => (
          <button key={s.key} type="button" className="seg" title={s.tip}
            style={{ width: `${(s.value / scale) * 100}%`, background: s.color }}
            onClick={() => onPick && onPick(s.tip)} aria-label={s.tip} />
        ))}
      </div>
      {mark != null && <span className="segbar-mark" style={{ left: `${mark}%` }} />}
    </div>
  );
}

function Readout({ text }) {
  return <div className="readout">{text || 'Tap a bar to see its numbers.'}</div>;
}

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function Overview({ d, choices }) {
  const [pick, setPick] = useState(null);
  const { rows, result: r } = d;
  const voted = rows.filter((x) => x.choice);
  const counted = choices.filter((c) => !c.muted);
  const churchCast = voted.filter((x) => x.choice !== 'abstain').length;
  const weightCast = voted.filter((x) => x.choice !== 'abstain').reduce((s, x) => s + x.weight, 0);
  const abstained = voted.filter((x) => x.choice === 'abstain').length;
  const needed = NEEDED[d.threshold];

  const stats = (
    <div className="stats">
      <Stat label="Churches voted" value={`${voted.length} of ${rows.length}`} />
      <Stat label="Votes cast" value={churchCast} sub={d.countRule === 'both' ? `${weightCast} weighted` : '1 per church'} />
      <Stat label="Abstained" value={abstained} sub="not counted" />
    </div>
  );

  if (d.kind === 'motion') {
    const line = (title, weighted, cast, pass, decides) => {
      const segs = counted.map((c) => {
        const v = sum(rows, c.id, weighted);
        return { key: c.id, value: v, color: c.color,
          tip: `${c.label}, ${title.toLowerCase()}: ${weighted ? plural(v, 'vote', 'votes') : plural(v, 'church', 'churches')} (${fmt(cast ? (v / cast) * 100 : 0)}%)` };
      });
      const yesPct = cast ? (sum(rows, 'yes', weighted) / cast) * 100 : 0;
      return (
        <div className="chart-row">
          <div className="chart-row-head">
            <b>{title}</b>
            <span>Yes {fmt(yesPct)}% · {decides ? (pass ? 'passed' : 'did not pass') : 'does not decide'}</span>
          </div>
          <SegBar segments={segs} scale={cast || 1} mark={needed} onPick={setPick} />
        </div>
      );
    };
    const avg = (id) => {
      const g = voted.filter((x) => x.choice === id);
      return g.length ? g.reduce((s, x) => s + x.weight, 0) / g.length : 0;
    };
    return (
      <>
        {stats}
        <div className="card">
          <h3 className="chart-title">Share of votes cast</h3>
          <Legend items={counted} />
          {line('Church count', false, churchCast, r.churchPass, true)}
          {d.countRule === 'both' && line('Weighted count', true, weightCast, r.weightedPass, true)}
          <div className="tiny muted">The dark line marks {THRESHOLDS[d.threshold].label.toLowerCase()}.</div>
          <Readout text={pick} />
        </div>
        {d.countRule === 'both' && <div className="card small">
          <h3 className="chart-title">Why the two counts differ</h3>
          Churches that voted Yes have an average of <b>{fmt(avg('yes'))}</b> weighted votes. Churches that voted No
          have an average of <b>{fmt(avg('no'))}</b>.{' '}
          {Math.abs(avg('yes') - avg('no')) < 0.25
            ? 'The averages are close, so the two counts give similar results.'
            : avg('yes') > avg('no')
              ? 'Churches with more weighted votes leaned Yes, so Yes does better in the weighted count.'
              : 'Churches with more weighted votes leaned No, so Yes does worse in the weighted count.'}
        </div>}
      </>
    );
  }

  // Election
  const rowsById = Object.fromEntries(r.standings.rows.map((x) => [x.id, x]));
  const maxCombined = Math.max(100, ...r.standings.rows.map((x) => x.combined));
  return (
    <>
      {stats}
      <div className="card">
        <h3 className="chart-title">Each candidate&rsquo;s share, both counts</h3>
        <Legend items={[{ label: 'Church count', color: SERIES[0] }, { label: 'Weighted count', color: SERIES[1] }]} />
        {counted.map((c) => {
          const s = rowsById[c.id];
          return (
            <div className="chart-row" key={c.id}>
              <div className="chart-row-head"><b>{c.label}</b><span>{fmt(s.churchPct)}% · {fmt(s.weightedPct)}%</span></div>
              <SegBar height={12} scale={100} mark={needed} onPick={setPick}
                segments={[{ key: 'c', value: s.churchPct, color: SERIES[0], tip: `${c.label}, church count: ${plural(s.churchVotes, 'church', 'churches')} (${fmt(s.churchPct)}%)` }]} />
              <div style={{ height: 3 }} />
              <SegBar height={12} scale={100} mark={needed} onPick={setPick}
                segments={[{ key: 'w', value: s.weightedPct, color: SERIES[1], tip: `${c.label}, weighted count: ${plural(s.weightedVotes, 'vote', 'votes')} (${fmt(s.weightedPct)}%)` }]} />
            </div>
          );
        })}
        <div className="tiny muted">The dark line marks {THRESHOLDS[d.threshold].label.toLowerCase()}. A candidate must pass it in both counts.</div>
        <Readout text={pick} />
      </div>
      <div className="card">
        <h3 className="chart-title">Combined score</h3>
        <div className="tiny muted" style={{ marginBottom: 6 }}>Church % + weighted %. Ranks candidates for a runoff, and decides a split on ballot 3 or 4.</div>
        {r.standings.rows.map((s) => {
          const c = choices.find((x) => x.id === s.id);
          return (
            <div className="chart-row" key={s.id}>
              <div className="chart-row-head"><b>{c.label}</b><span>{fmt(s.combined)}</span></div>
              <SegBar height={14} scale={maxCombined} onPick={setPick}
                segments={[{ key: 's', value: s.combined, color: '#3b4a66', tip: `${c.label}: ${fmt(s.churchPct)}% + ${fmt(s.weightedPct)}% = ${fmt(s.combined)}` }]} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function ByWeight({ d, choices }) {
  const [pick, setPick] = useState(null);
  const groups = [1, 2, 3, 4].map((w) => ({ w, rows: d.rows.filter((x) => x.weight === w) })).filter((g) => g.rows.length);
  const maxN = Math.max(...groups.map((g) => g.rows.length));
  const all = [...choices, { id: null, label: 'Did not vote', color: NOT_VOTED, muted: true }];
  return (
    <>
      <div className="card">
        <h3 className="chart-title">How churches voted, by weighted votes</h3>
        <div className="tiny muted" style={{ marginBottom: 8 }}>Each bar is the churches with that many weighted votes. Bar length is the number of churches.</div>
        <Legend items={all.filter((c) => d.rows.some((x) => x.choice === c.id))} />
        {groups.map((g) => (
          <div className="chart-row" key={g.w}>
            <div className="chart-row-head">
              <b>{plural(g.w, 'vote', 'votes')} each</b>
              <span>{plural(g.rows.length, 'church', 'churches')}</span>
            </div>
            <SegBar scale={maxN} onPick={setPick} segments={all.map((c) => {
              const n = g.rows.filter((x) => x.choice === c.id).length;
              return { key: String(c.id), value: n, color: c.color,
                tip: `${c.label}: ${plural(n, 'church', 'churches')} with ${plural(g.w, 'vote', 'votes')} each (${n * g.w} weighted)` };
            })} />
          </div>
        ))}
        <Readout text={pick} />
      </div>
      <div className="card table-wrap">
        <h3 className="chart-title">Weighted votes by group</h3>
        <table className="standings">
          <thead>
            <tr><th>Group</th>{choices.map((c) => <th key={c.id}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.w}>
                <td>{plural(g.w, 'vote', 'votes')}</td>
                {choices.map((c) => <td key={c.id}>{sum(g.rows, c.id, true)}</td>)}
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              {choices.map((c) => <td key={c.id}><b>{sum(d.rows, c.id, true)}</b></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function ByRegion({ d, choices }) {
  const [pick, setPick] = useState(null);
  const counted = choices.filter((c) => !c.muted);
  const regions = REGIONS.map((name) => ({ name, rows: d.rows.filter((x) => x.region === name) })).filter((g) => g.rows.length);
  return (
    <div className="card">
      <h3 className="chart-title">Share of votes cast, by Region</h3>
      <Legend items={counted} />
      {regions.map((g) => {
        const cc = g.rows.filter((x) => x.choice && x.choice !== 'abstain');
        const cCast = cc.length;
        const wCast = cc.reduce((s, x) => s + x.weight, 0);
        const segs = (weighted, cast) => counted.map((c) => {
          const v = sum(g.rows, c.id, weighted);
          return { key: c.id, value: v, color: c.color,
            tip: `${g.name}, ${c.label}, ${weighted ? 'weighted' : 'church'} count: ${v} of ${cast} (${fmt(cast ? (v / cast) * 100 : 0)}%)` };
        });
        return (
          <div className="region-block" key={g.name}>
            <div className="chart-row-head"><b>{g.name}</b><span>{cCast} of {plural(g.rows.length, 'church', 'churches')} voted</span></div>
            {cCast === 0 ? <div className="tiny muted">No votes cast.</div> : (
              <>
                {d.countRule === 'both' && <div className="mini-label">Church</div>}
                <SegBar height={12} scale={cCast} segments={segs(false, cCast)} onPick={setPick} />
                {d.countRule === 'both' && <>
                  <div className="mini-label">Weighted</div>
                  <SegBar height={12} scale={wCast} segments={segs(true, wCast)} onPick={setPick} />
                </>}
              </>
            )}
          </div>
        );
      })}
      <Readout text={pick} />
    </div>
  );
}

function Churches({ d, choices }) {
  const label = (id) => (id ? choices.find((c) => c.id === id)?.label : 'Did not vote');
  const color = (id) => (id ? choices.find((c) => c.id === id)?.color : NOT_VOTED);
  const order = [...choices.map((c) => c.id), null];
  const sorted = [...d.rows].sort((a, b) => order.indexOf(a.choice) - order.indexOf(b.choice) || (d.countRule === 'both' ? b.weight - a.weight : 0) || a.name.localeCompare(b.name));
  return (
    <div className="card table-wrap">
      <table className="standings">
        <thead><tr><th>Church</th>{d.countRule === 'both' && <th>Weight</th>}<th>Vote</th></tr></thead>
        <tbody>
          {sorted.map((x) => (
            <tr key={x.churchId}>
              <td>{x.name}<span className="n">{x.region}</span></td>
              {d.countRule === 'both' && <td>{x.weight}</td>}
              <td style={{ whiteSpace: 'nowrap' }}><i className="swatch" style={{ background: color(x.choice) }} />{label(x.choice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const TABS = [['overview', 'Overview'], ['weight', 'By weight'], ['region', 'By region'], ['churches', 'Churches']];

export default function ResultDetails({ ballotId }) {
  const [d, error] = useData(() => api.getBallotDetails(ballotId), [ballotId]);
  const [tab, setTab] = useState('overview');
  if (error) return <div className="screen"><AppBar title="Charts" /><div className="content"><Banner tone="red">{error.message}</Banner></div></div>;
  if (!d) return <div className="screen"><AppBar title="Charts" /></div>;
  const choices = choicesFor(d);
  const showRegion = !d.region;
  return (
    <div className="screen">
      <AppBar title="Charts" />
      <div className="content">
        <div>
          <h2 style={{ fontSize: 20 }}>{d.title}</h2>
          <div className="small muted">
            {d.region ? `${d.region} churches only` : 'All Member Churches'}
            {d.countRule === 'church' && ' · Church count only, 1 vote per church'}
          </div>
        </div>
        <div className="segmented">
          {TABS.filter(([k]) => (showRegion || k !== 'region') && (d.countRule === 'both' || k !== 'weight')).map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
        {tab === 'overview' && <Overview d={d} choices={choices} />}
        {tab === 'weight' && <ByWeight d={d} choices={choices} />}
        {tab === 'region' && <ByRegion d={d} choices={choices} />}
        {tab === 'churches' && <Churches d={d} choices={choices} />}
      </div>
    </div>
  );
}
