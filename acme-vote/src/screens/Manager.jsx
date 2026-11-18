import React, { useState } from 'react';
import {
  AppBar, Banner, Choice, Empty, Icon, ResultView, Row, RuleChips, Sheet, StatusChip, TabBar, Toggle,
  WeightPips, choiceLabel, money, time, typeLabel, useData, useNav, useStickyState, useToast,
} from '../components.jsx';
import * as api from '../server/api.js';
import { BALLOT_TYPES, COUNT_RULES, REGIONS, THRESHOLDS, churchWeight, fmt } from '../server/rules.js';

// ---------------------------------------------------------------------------
// Home with tabs
// ---------------------------------------------------------------------------

export function Home() {
  const [tab, setTab] = useStickyState('manager-tab', 'ballots');
  return (
    <div className="screen">
      <AppBar logo back={false} right={<>Manager</>} />
      <div className="content">
        {tab === 'ballots' && <BallotsTab />}
        {tab === 'elections' && <ElectionsTab />}
        {tab === 'churches' && <ChurchesTab />}
        {tab === 'more' && <MoreTab />}
      </div>
      <TabBar current={tab} onChange={setTab} tabs={[
        { id: 'ballots', label: 'Ballots', icon: 'ballot' },
        { id: 'elections', label: 'Elections', icon: 'people' },
        { id: 'churches', label: 'Churches', icon: 'church' },
        { id: 'more', label: 'Settings', icon: 'gear' },
      ]} />
    </div>
  );
}

function BallotList({ ballots }) {
  const nav = useNav();
  return (
    <div className="list">
      {ballots.map((b) => (
        <Row key={b.id} title={b.title}
          sub={b.status === 'draft' ? typeLabel(b) : `${typeLabel(b)} · ${b.votedCount} of ${b.eligibleCount} churches voted`}
          right={<StatusChip status={b.status} />}
          onClick={() => nav.push('managerBallot', { ballotId: b.id })} />
      ))}
    </div>
  );
}

function BallotsTab() {
  const nav = useNav();
  const [ballots] = useData(() => api.listBallots());
  if (!ballots) return null;
  const groups = [
    ['Open', ballots.filter((b) => b.status === 'open')],
    ['Not open yet', ballots.filter((b) => b.status === 'draft')],
    ['Closed', ballots.filter((b) => b.status === 'closed')],
  ];
  return (
    <>
      <button className="btn" onClick={() => nav.push('newMotion')}><Icon name="plus" size={20} /> New motion</button>
      <p className="tiny muted center" style={{ marginTop: 6 }}>Election ballots are created from the Elections tab.</p>
      {groups.map(([label, list]) => list.length > 0 && (
        <React.Fragment key={label}>
          <div className="section-title">{label}</div>
          <BallotList ballots={list} />
        </React.Fragment>
      ))}
      {ballots.length === 0 && <div className="card"><Empty>No ballots yet.</Empty></div>}
    </>
  );
}

const electionStatus = {
  nominating: ['Taking nominations', 'gray'],
  voting: ['Ballot open', 'green'],
  awaiting: ['Next ballot needed', 'gold'],
  elected: ['Elected', ''],
  reopened: ['Nominations reopened', 'red'],
};

function ElectionsTab() {
  const nav = useNav();
  const [elections] = useData(() => api.listElections());
  const [commissions] = useData(() => api.listCommissions());
  if (!elections || !commissions) return null;
  const plain = elections.filter((e) => !e.commissionId);
  return (
    <>
      <div className="btn-stack">
        <button className="btn" onClick={() => nav.push('newElection')}><Icon name="plus" size={20} /> New election</button>
        <button className="btn secondary" onClick={() => nav.push('newCommission')}>Judicial Commission election</button>
      </div>

      {commissions.length > 0 && (
        <>
          <div className="section-title">Judicial Commission</div>
          <div className="list">
            {commissions.map((c) => (
              <Row key={c.id} title="Judicial Commission"
                sub={{ draft: 'Slate not yet voted on', slate: 'Slate ballot open', seats: `Electing seat by seat (${c.members.length} of 5 filled)`, complete: 'All five seats filled' }[c.status]}
                onClick={() => nav.push('commission', { commissionId: c.id })} />
            ))}
          </div>
        </>
      )}

      <div className="section-title">Elections</div>
      {plain.length === 0 ? (
        <div className="card"><Empty icon="people">No elections yet.</Empty></div>
      ) : (
        <div className="list">
          {plain.map((e) => {
            const [label, tone] = electionStatus[e.status];
            const winner = e.winnerId && e.candidates.find((c) => c.id === e.winnerId)?.name;
            return (
              <Row key={e.id} title={e.office} sub={winner ? `Elected: ${winner}` : `${e.candidates.filter((c) => !c.disqualified).length} nominees`}
                right={<span className={`chip ${tone}`}>{label}</span>}
                onClick={() => nav.push('election', { electionId: e.id })} />
            );
          })}
        </div>
      )}
    </>
  );
}

function ChurchesTab() {
  const nav = useNav();
  const [churches] = useData(() => api.listChurches());
  const [meta] = useData(() => api.getMeta());
  if (!churches) return null;
  const totalWeight = churches.reduce((s, c) => s + c.weight, 0);
  return (
    <>
      <div className="card">
        <dl className="kv">
          <dt>Member Churches</dt><dd>{churches.length}</dd>
          <dt>Total weighted votes</dt><dd>{totalWeight}</dd>
          <dt>Measuring year</dt><dd>{meta?.measuringYear}</dd>
        </dl>
      </div>
      {REGIONS.map((r) => {
        const list = churches.filter((c) => c.region === r);
        if (!list.length) return null;
        return (
          <React.Fragment key={r}>
            <div className="section-title">{r}</div>
            <div className="list">
              {list.map((c) => (
                <Row key={c.id} title={c.name} sub={`${c.delegate} · ${c.weightReason}`}
                  right={<span className="chip gold">{c.weight}</span>}
                  onClick={() => nav.push('church', { churchId: c.id })} />
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
}

function MoreTab() {
  const nav = useNav();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="section-title">Demo</div>
      <div className="card small">
        All data in this demo is stored in this browser. Open the app in a second tab to sign in as a delegate while
        this tab stays signed in as the manager. Both tabs update together.
      </div>
      <div className="btn-stack">
        <button className="btn secondary" onClick={async () => { await api.signOut(); nav.reset('start'); }}>
          <Icon name="logout" size={18} /> Switch role
        </button>
        <button className="btn danger" onClick={() => setConfirm(true)}>Reset demo data</button>
      </div>
      <div className="section-title">Voting rules</div>
      <RulesSummary />
      {confirm && (
        <Sheet onClose={() => setConfirm(false)}>
          <h2>Reset demo data?</h2>
          <p className="muted">This removes all ballots, votes and elections and restores the sample churches.</p>
          <div className="btn-stack">
            <button className="btn danger" onClick={async () => { await api.resetDemo(); setConfirm(false); }}>Reset</button>
            <button className="btn secondary" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function RulesSummary() {
  return (
    <div className="card small">
      <p style={{ marginTop: 0 }}><b>Two counts.</b> In the church count, each voting church casts 1 vote. In the weighted count,
        each church casts 1 to 4 votes based on its contributions to ACME in the measuring year as a percentage of its
        adopted budget: under 2% is 1 vote, 2% to under 3% is 2, 3% to under 4% is 3, and 4% or more is 4. A church whose
        budget is not certified by its elders, or that was not a member for the whole year, gets 1 vote.</p>
      <p><b>Which count decides.</b> Elections, budget approval and amendments must pass both counts. Procedural motions
        use the church count only.</p>
      <p><b>Thresholds.</b> Majority of votes cast, except amendments (75%). Two-thirds is available for special cases.
        Abstentions are not votes cast.</p>
      <p style={{ marginBottom: 0 }}><b>Elections.</b> On ballots 1 and 2 a candidate must carry both counts. Ballot 2 is a runoff
        of the top two by combined score (church % + weighted %). On ballot 3, a split is decided by combined score. A tie
        goes to ballot 4; a second tie disqualifies both and nominations reopen.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One ballot (manager view)
// ---------------------------------------------------------------------------

export function BallotScreen({ ballotId }) {
  const nav = useNav();
  const [ballot] = useData(() => api.getBallot(ballotId, { includeVotes: true }), [ballotId]);
  const [churches] = useData(() => api.listChurches());
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, showToast] = useToast();

  if (!ballot || !churches) return <div className="screen"><AppBar title="Ballot" /></div>;

  const eligibleChurches = churches.filter((c) => !ballot.region || c.region === ballot.region);
  const notVoted = eligibleChurches.filter((c) => !ballot.votes[c.id]);
  const options = ballot.kind === 'candidates'
    ? ballot.options.map((o) => ({ id: o.id, label: o.label }))
    : [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
  const pct = ballot.eligibleCount ? (ballot.votedCount / ballot.eligibleCount) * 100 : 0;

  const close = async () => {
    setConfirmClose(false);
    await api.closeBallot(ballot.id);
    showToast('Voting closed. Results are now visible to delegates.');
  };

  return (
    <div className="screen">
      <AppBar title={ballot.status === 'closed' ? 'Result' : 'Ballot'} />
      <div className="content">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
            <h2>{ballot.title}</h2>
            <StatusChip status={ballot.status} />
          </div>
          {ballot.description && <p className="small" style={{ margin: '8px 0 0' }}>{ballot.description}</p>}
          <div style={{ marginTop: 10 }}><RuleChips ballot={ballot} /></div>
          {ballot.kind === 'candidates' && (
            <p className="small" style={{ margin: '10px 0 0' }}>Candidates: {ballot.options.map((o) => o.label).join(', ')}</p>
          )}
        </div>

        {ballot.status === 'draft' && (
          <div className="btn-stack">
            <button className="btn gold" onClick={() => api.openBallot(ballot.id)}>Open voting</button>
            <button className="btn danger" onClick={async () => { await api.deleteBallot(ballot.id); nav.pop(); }}>Delete ballot</button>
          </div>
        )}

        {ballot.status !== 'draft' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <b>Turnout</b>
              <span>{ballot.votedCount} of {ballot.eligibleCount} churches</span>
            </div>
            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
            {ballot.status === 'open' && (
              <p className="tiny muted" style={{ margin: '8px 0 0' }}>
                Results stay hidden until voting is closed.
                {notVoted.length > 0 && ` Not yet voted: ${notVoted.map((c) => c.name).join(', ')}.`}
              </p>
            )}
          </div>
        )}

        {ballot.status === 'open' && (
          <>
            <button className="btn gold" onClick={() => setConfirmClose(true)}>Close voting and count</button>
            {notVoted.length > 0 && (
              <details className="demo-panel">
                <summary>Demo: record votes for churches</summary>
                <p className="tiny muted">For the demo only. Records a vote as if that church&rsquo;s delegate had voted.</p>
                <button className="btn small secondary" style={{ marginBottom: 8 }}
                  onClick={() => api.demoFillRemaining(ballot.id)}>Fill all remaining at random</button>
                {notVoted.map((c) => (
                  <div className="demo-row" key={c.id}>
                    <span className="name">{c.name} <span className="muted">({c.weight})</span></span>
                    <span className="opts">
                      {options.map((o) => (
                        <button key={o.id} onClick={() => api.demoRecordVote(ballot.id, c.id, o.id)}>{o.label}</button>
                      ))}
                      <button onClick={() => api.demoRecordVote(ballot.id, c.id, 'abstain')}>Abstain</button>
                    </span>
                  </div>
                ))}
              </details>
            )}
          </>
        )}

        {ballot.status === 'closed' && (
          <>
            <ResultView ballot={ballot} />
            {ballot.electionId && (
              <button className="btn" onClick={() => { nav.pop(); }}>Back to the election</button>
            )}
            <div className="section-title">Votes by church</div>
            <div className="list">
              {eligibleChurches.map((c) => {
                const v = ballot.votes[c.id];
                return (
                  <Row key={c.id} title={c.name}
                    sub={v ? `${choiceLabel(ballot, v.choice)} · ${v.choice === 'abstain' ? 'not counted' : `1 church, ${v.weight} weighted`} · ${time(v.at)}` : 'Did not vote'} />
                );
              })}
            </div>
          </>
        )}
      </div>
      {toast}
      {confirmClose && (
        <Sheet onClose={() => setConfirmClose(false)}>
          <h2>Close voting?</h2>
          <p className="muted">
            {notVoted.length > 0
              ? `${notVoted.length} ${notVoted.length === 1 ? 'church has' : 'churches have'} not voted. They will not be able to vote on this ballot.`
              : 'Every eligible church has voted.'}
          </p>
          <div className="btn-stack">
            <button className="btn gold" onClick={close}>Close and count</button>
            <button className="btn secondary" onClick={() => setConfirmClose(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New motion
// ---------------------------------------------------------------------------

function RegionSelect({ value, onChange }) {
  return (
    <label className="field">
      <span>Who votes</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All Member Churches</option>
        {REGIONS.map((r) => <option key={r} value={r}>{r} Region churches only</option>)}
      </select>
    </label>
  );
}

function ThresholdPicker({ value, onChange, options = Object.keys(THRESHOLDS), notes = {} }) {
  return (
    <div className="field">
      <span>Votes needed</span>
      <div className="choice-group">
        {options.map((k) => (
          <Choice key={k} label={THRESHOLDS[k].label} desc={notes[k]} selected={value === k} onClick={() => onChange(k)} />
        ))}
      </div>
    </div>
  );
}

export function NewMotion() {
  const nav = useNav();
  const [type, setType] = useState('budget');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [countRule, setCountRule] = useState(BALLOT_TYPES.budget.countRule);
  const [threshold, setThreshold] = useState(BALLOT_TYPES.budget.threshold);
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  const pickType = (t) => {
    setType(t);
    setCountRule(BALLOT_TYPES[t].countRule);
    setThreshold(BALLOT_TYPES[t].threshold);
  };
  const isDefault = countRule === BALLOT_TYPES[type].countRule && threshold === BALLOT_TYPES[type].threshold;

  const create = async () => {
    try {
      const id = await api.createMotion({ title, description, type, countRule, threshold, region });
      nav.replace('managerBallot', { ballotId: id });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="screen">
      <AppBar title="New motion" />
      <div className="content form">
        <div className="field">
          <span>Type</span>
          <div className="segmented">
            {['budget', 'amendment', 'procedural'].map((t) => (
              <button key={t} className={type === t ? 'on' : ''} onClick={() => pickType(t)}>
                {{ budget: 'Budget', amendment: 'Amendment', procedural: 'Procedural' }[t]}
              </button>
            ))}
          </div>
          <small>Sets the default rules below. You can change them for this ballot.</small>
        </div>
        <label className="field">
          <span>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={{ budget: 'Approve the 2027 budget', amendment: 'Amend Article IV, Section 2', procedural: 'Adjourn until 1:30 p.m.' }[type]} />
        </label>
        <label className="field">
          <span>Text of the motion (optional)</span>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="field">
          <span>Which count decides</span>
          <div className="choice-group">
            <Choice label={COUNT_RULES.both} desc="Passes only if it reaches the threshold in the church count and the weighted count."
              selected={countRule === 'both'} onClick={() => setCountRule('both')} />
            <Choice label={COUNT_RULES.church} desc="One vote per church. The weighted count is shown for information."
              selected={countRule === 'church'} onClick={() => setCountRule('church')} />
          </div>
        </div>
        <ThresholdPicker value={threshold} onChange={setThreshold}
          notes={{ twoThirds: 'For special cases set by the bylaws.' }} />
        <RegionSelect value={region} onChange={setRegion} />
        {!isDefault && (
          <Banner tone="gold">These rules differ from the default for a {BALLOT_TYPES[type].label.toLowerCase()}.</Banner>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={create}>Create ballot</button>
        <p className="tiny muted center">The ballot is saved but not opened. You open voting from the next screen.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New election
// ---------------------------------------------------------------------------

export function NewElection() {
  const nav = useNav();
  const [office, setOffice] = useState('');
  const [names, setNames] = useState(['', '']);
  const [threshold, setThreshold] = useState('majority');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');

  const create = async () => {
    try {
      const id = await api.createElection({ office, threshold, region, candidates: names });
      nav.replace('election', { electionId: id });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="screen">
      <AppBar title="New election" />
      <div className="content form">
        <label className="field">
          <span>Office</span>
          <input className="input" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="President" />
        </label>
        <div className="field">
          <span>Nominees</span>
          {names.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input className="input" value={n} placeholder={`Nominee ${i + 1}`}
                onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
              {names.length > 1 && (
                <button className="btn secondary small" style={{ minHeight: 48 }} aria-label="Remove"
                  onClick={() => setNames(names.filter((_, j) => j !== i))}><Icon name="x" size={18} /></button>
              )}
            </div>
          ))}
          <button className="btn secondary small" onClick={() => setNames([...names, ''])}>
            <Icon name="plus" size={16} /> Add nominee
          </button>
          <small>You can add more nominees before the first ballot opens.</small>
        </div>
        <ThresholdPicker value={threshold} onChange={setThreshold} options={['majority', 'twoThirds']}
          notes={{ majority: 'The normal rule for elections.', twoThirds: 'For special cases, such as a President’s third consecutive term.' }} />
        <p className="small muted" style={{ marginTop: 6 }}>Elections must pass both counts.</p>
        <RegionSelect value={region} onChange={setRegion} />
        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={create}>Create election</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Election detail
// ---------------------------------------------------------------------------

export function ElectionScreen({ electionId }) {
  const nav = useNav();
  const [e] = useData(() => api.getElection(electionId), [electionId]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  if (!e) return <div className="screen"><AppBar title="Election" /></div>;

  const byId = Object.fromEntries(e.candidates.map((c) => [c.id, c]));
  const active = e.candidates.filter((c) => !c.disqualified);
  const disq = e.candidates.filter((c) => c.disqualified);
  const nominating = e.status === 'nominating' || e.status === 'reopened';
  const openBallot = e.ballots.find((b) => b.status === 'open');
  const last = e.history[e.history.length - 1];

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (err) { setError(err.message); }
  };

  const add = (name, fromField) => run(async () => {
    await api.addCandidate(e.id, name);
    if (fromField) setNewName('');
  });
  const openNext = () => run(async () => {
    await api.openNextElectionBallot(e.id);
    const fresh = await api.getElection(e.id);
    nav.push('managerBallot', { ballotId: fresh.ballotIds[fresh.ballotIds.length - 1] });
  });

  // For a Judicial Commission seat: the President's nominees who are not seated and not yet nominated.
  const presidentsPicks = e.commission
    ? e.commission.nominees.filter((n) => !e.commission.members.includes(n) && !e.candidates.some((c) => c.name === n))
    : [];

  return (
    <div className="screen">
      <AppBar title={e.commission ? `Seat ${e.seat}` : 'Election'} />
      <div className="content">
        <div className="card">
          <h2>{e.office}</h2>
          <div className="chips" style={{ marginTop: 8 }}>
            <span className={`chip ${electionStatus[e.status][1]}`}>{electionStatus[e.status][0]}</span>
            <span className="chip">{THRESHOLDS[e.threshold].label}</span>
            <span className="chip">Both counts</span>
            {e.region && <span className="chip">{e.region} churches only</span>}
          </div>
        </div>

        {e.status === 'elected' && (
          <Banner tone="green" title={`${byId[e.winnerId].name} is elected`}>{last?.explanation}</Banner>
        )}
        {e.status === 'awaiting' && last && (
          <Banner tone="gold" title={`No one elected on ballot ${last.round}`}>{last.explanation}</Banner>
        )}
        {e.status === 'reopened' && (
          <Banner tone="red" title="Nominations reopened">
            {disq.map((c) => c.name).join(' and ')} {disq.length === 1 ? 'is' : 'are'} disqualified after a second tie.
            Add nominees, then open a new first ballot.
          </Banner>
        )}

        <div className="section-title">{nominating ? 'Nominees' : 'Candidates'}</div>
        <div className="list">
          {active.length === 0 && <Row title="No nominees yet" />}
          {active.map((c) => (
            <Row key={c.id} title={c.name}
              sub={e.winnerId === c.id ? 'Elected' : e.nextCandidateIds && !e.nextCandidateIds.includes(c.id) ? 'Not on the next ballot' : null}
              right={nominating && (
                <button className="btn secondary small" onClick={() => run(() => api.removeCandidate(e.id, c.id))}>Remove</button>
              )} />
          ))}
          {disq.map((c) => <Row key={c.id} title={<s>{c.name}</s>} sub="Disqualified" />)}
        </div>

        {nominating && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={newName} placeholder="Nominee from the floor"
                onChange={(ev) => setNewName(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && add(newName, true)} />
              <button className="btn small" style={{ minHeight: 48 }} onClick={() => add(newName, true)}>Add</button>
            </div>
            {presidentsPicks.length > 0 && (
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>Add one of the President&rsquo;s nominees:</div>
                <div className="chips">
                  {presidentsPicks.map((n) => (
                    <button key={n} className="chip" style={{ border: 0, cursor: 'pointer', padding: '6px 11px', fontSize: 14 }} onClick={() => add(n)}>
                      + {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {error && <div className="error">{error}</div>}

        {nominating && (
          <button className="btn gold" disabled={active.length < 1} onClick={openNext}>Close nominations and open ballot 1</button>
        )}
        {e.status === 'awaiting' && (
          <button className="btn gold" onClick={openNext}>
            Open ballot {e.round + 1}: {e.nextCandidateIds.map((id) => byId[id].name).join(' vs. ')}
          </button>
        )}
        {openBallot && (
          <button className="btn gold" onClick={() => nav.push('managerBallot', { ballotId: openBallot.id })}>
            Go to ballot {openBallot.round} (open)
          </button>
        )}
        {e.status === 'elected' && e.commission && (
          <button className="btn" onClick={() => nav.popTo('commission')}>
            Back to the Judicial Commission
          </button>
        )}

        {e.ballots.length > 0 && (
          <>
            <div className="section-title">Ballots</div>
            <div className="list">
              {e.ballots.map((b) => {
                const h = e.history.find((x) => x.ballotId === b.id);
                return (
                  <Row key={b.id} title={b.title}
                    sub={h ? { elected: 'Elected', runoff: 'Runoff needed', next: 'Next ballot needed', disqualified: 'Tie: disqualified', repeat: 'No votes: retake' }[h.outcome] : `${b.votedCount} of ${b.eligibleCount} voted`}
                    right={<StatusChip status={b.status} />}
                    onClick={() => nav.push('managerBallot', { ballotId: b.id })} />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Judicial Commission
// ---------------------------------------------------------------------------

export function NewCommission() {
  const nav = useNav();
  const [names, setNames] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');
  const create = async () => {
    try {
      const id = await api.createCommission({ nominees: names });
      nav.replace('commission', { commissionId: id });
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="screen">
      <AppBar title="Judicial Commission" />
      <div className="content form">
        <p className="small" style={{ margin: 0 }}>
          The Assembly first votes on the President&rsquo;s five nominees as a single slate. A majority in both counts
          elects all five. If the slate fails, the five seats are filled one at a time with nominees from the floor.
        </p>
        <div className="field">
          <span>The President&rsquo;s nominees</span>
          {names.map((n, i) => (
            <input key={i} className="input" style={{ marginBottom: 8 }} placeholder={`Nominee ${i + 1}`} value={n}
              onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" onClick={create}>Save nominees</button>
      </div>
    </div>
  );
}

export function CommissionScreen({ commissionId }) {
  const nav = useNav();
  const [c] = useData(() => api.getCommission(commissionId), [commissionId]);
  if (!c) return <div className="screen"><AppBar title="Judicial Commission" /></div>;

  const openSlate = async () => {
    await api.openSlateBallot(c.id);
    const fresh = await api.getCommission(c.id);
    nav.push('managerBallot', { ballotId: fresh.slateBallotId });
  };

  return (
    <div className="screen">
      <AppBar title="Judicial Commission" />
      <div className="content">
        {c.status === 'complete' && (
          <Banner tone="green" title="All five seats are filled">
            {c.slate?.result?.passed ? 'The President’s slate was elected.' : 'The seats were filled one at a time.'}
          </Banner>
        )}
        {c.status === 'seats' && (
          <Banner tone="gold" title="The slate did not pass">
            Fill the seats one at a time. Each seat is decided by the election rules before the next seat opens.
          </Banner>
        )}

        <div className="section-title">The President&rsquo;s slate</div>
        <div className="list">
          {c.nominees.map((n) => <Row key={n} title={n} sub={c.members.includes(n) ? 'Seated' : null} />)}
        </div>

        {c.status === 'draft' && <button className="btn gold" onClick={openSlate}>Open the slate ballot</button>}
        {c.slate && (
          <button className="btn secondary" onClick={() => nav.push('managerBallot', { ballotId: c.slate.id })}>
            {c.slate.status === 'open' ? 'Go to the slate ballot (open)' : `Slate ballot: ${c.slate.result?.passed ? 'passed' : 'did not pass'}`}
          </button>
        )}

        {c.seats.length > 0 && (
          <>
            <div className="section-title">Seats</div>
            <div className="list">
              {[1, 2, 3, 4, 5].map((n) => {
                const s = c.seats.find((x) => x.seat === n);
                if (!s) return <Row key={n} title={`Seat ${n}`} sub="Opens after the previous seat is filled" />;
                return (
                  <Row key={n} title={`Seat ${n}`} sub={s.winner ? `Elected: ${s.winner}` : electionStatus[s.status][0]}
                    right={!s.winner && <span className="chip gold">Current</span>}
                    onClick={() => nav.push('election', { electionId: s.electionId })} />
                );
              })}
            </div>
          </>
        )}

        {c.members.length > 0 && c.status !== 'complete' && (
          <p className="small muted">Seated so far: {c.members.join(', ')}.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Church registry entry
// ---------------------------------------------------------------------------

export function ChurchScreen({ churchId }) {
  const nav = useNav();
  const [church] = useData(() => api.getChurch(churchId), [churchId]);
  const [draft, setDraft] = useState(null);
  const [toast, showToast] = useToast();
  if (!church) return <div className="screen"><AppBar title="Church" /></div>;
  const d = draft || church;
  const set = (k, v) => setDraft({ ...d, [k]: v });
  const w = churchWeight(d);
  const changed = draft && JSON.stringify(draft) !== JSON.stringify(church);

  const save = async () => {
    await api.updateChurch(church.id, {
      budget: Number(d.budget) || 0,
      contributions: Number(d.contributions) || 0,
      budgetCertified: d.budgetCertified,
      fullYearMember: d.fullYearMember,
      delegate: d.delegate,
      region: d.region,
    });
    setDraft(null);
    showToast('Saved. The new weight applies to votes cast from now on.');
  };

  return (
    <div className="screen">
      <AppBar title="Church" />
      <div className="content form">
        <div className="card">
          <h2>{church.name}</h2>
          <div className="small muted">{church.city}</div>
          <div className="small muted">Delegate code (demo): {church.credential}</div>
        </div>

        <div className="card">
          <div className="small muted" style={{ fontWeight: 600 }}>Weighted votes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0' }}>
            <span className="big-number">{w.votes}</span>
            <WeightPips n={w.votes} />
          </div>
          <div className="small">{w.reason}{w.percent != null && ` (${fmt(w.percent)}%)`}.</div>
        </div>

        <label className="field">
          <span>Adopted annual budget (measuring year)</span>
          <input className="input" inputMode="numeric" value={d.budget}
            onChange={(e) => set('budget', e.target.value.replace(/\D/g, ''))} />
          <small>{money(Number(d.budget) || 0)}</small>
        </label>
        <label className="field">
          <span>Contributions to ACME (measuring year)</span>
          <input className="input" inputMode="numeric" value={d.contributions}
            onChange={(e) => set('contributions', e.target.value.replace(/\D/g, ''))} />
          <small>{money(Number(d.contributions) || 0)}</small>
        </label>
        <div className="card">
          <Toggle label="Budget certified by the elders" checked={d.budgetCertified} onChange={(v) => set('budgetCertified', v)} />
          <div style={{ height: 10 }} />
          <Toggle label="Member for the whole measuring year" checked={d.fullYearMember} onChange={(v) => set('fullYearMember', v)} />
        </div>
        <label className="field">
          <span>Voting delegate</span>
          <input className="input" value={d.delegate} onChange={(e) => set('delegate', e.target.value)} />
        </label>
        <label className="field">
          <span>Region</span>
          <select className="input" value={d.region} onChange={(e) => set('region', e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <button className="btn" disabled={!changed} onClick={save}>Save changes</button>
        <p className="tiny muted center">A church&rsquo;s weight is fixed when it votes. Changes here do not alter votes already cast.</p>
      </div>
      {toast}
    </div>
  );
}
