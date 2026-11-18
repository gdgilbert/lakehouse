import React, { useState } from 'react';
import {
  AppBar, Banner, Choice, Empty, Icon, ResultView, Row, RuleChips, Sheet, StatusChip, TabBar,
  WeightPips, choiceLabel, money, time, typeLabel, useData, useNav, useStickyState, Coach, Toggle,
} from '../components.jsx';
import * as api from '../server/api.js';
import { fmt } from '../server/rules.js';
import { afterVoteTips, beforeVoteTips, homeTips, resultTips, signInTips } from '../tutorial.js';

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export function SignIn() {
  const nav = useNav();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [churches] = useData(() => api.listChurches());

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const church = await api.signInDelegate(code);
      nav.replace('delegateHome', { churchId: church.id });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    setCode(digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits);
  };

  return (
    <div className="screen">
      <AppBar title="Delegate sign-in" />
      <div className="content">
        <form className="form card" onSubmit={submit}>
          <div>
            <h2>Enter your delegate code</h2>
            <p className="muted small" style={{ margin: '6px 0 0' }}>
              Each Member Church has one voting delegate. The code is on the delegate card from the registration desk.
            </p>
          </div>
          <input className="input code" inputMode="numeric" autoComplete="one-time-code" placeholder="0000-0000"
            value={code} onChange={(e) => onChange(e.target.value)} aria-label="Delegate code" />
          {error && <div className="error">{error}</div>}
          <button className="btn" disabled={code.length < 9 || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <button className="btn link" style={{ width: '100%' }} onClick={() => setShowCodes(true)}>
          Show demo codes
        </button>
      </div>
      <Coach tips={signInTips(() => setCode('0000-0001'))} />
      {showCodes && (
        <Sheet onClose={() => setShowCodes(false)}>
          <h2>Demo delegate codes</h2>
          <p className="muted small">Tap a church to fill in its code.</p>
          <div className="list">
            {(churches || []).map((c) => (
              <Row key={c.id} title={c.name} sub={`${c.credential} · ${c.region} · ${c.weight} vote${c.weight > 1 ? 's' : ''}`}
                onClick={() => { setCode(c.credential); setShowCodes(false); }} chevron={false} />
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home with tabs
// ---------------------------------------------------------------------------

export function Home({ churchId }) {
  const [tab, setTab] = useStickyState('delegate-tab', 'ballots');
  const [church] = useData(() => api.getChurch(churchId), [churchId]);
  const [ballots] = useData(() => api.listBallots({ churchId }), [churchId]);

  const mine = (ballots || []).filter((b) => b.eligible);
  const open = mine.filter((b) => b.status === 'open');
  const closed = mine.filter((b) => b.status === 'closed');
  const toVote = open.filter((b) => !b.myVote).length;

  return (
    <div className="screen">
      <AppBar logo back={false} right={church && <>{church.name}<br />{church.region}</>} />
      <div className="content">
        {tab === 'ballots' && <BallotsTab open={open} closedCount={closed.length} />}
        {tab === 'results' && <ResultsTab closed={closed} />}
        {tab === 'church' && church && <ChurchTab church={church} />}
      </div>
      {tab === 'ballots' && open.length > 0 && <Coach tips={homeTips()} />}
      <TabBar current={tab} onChange={setTab} tabs={[
        { id: 'ballots', label: 'Ballots', icon: 'ballot', count: toVote },
        { id: 'results', label: 'Results', icon: 'results' },
        { id: 'church', label: 'My church', icon: 'church' },
      ]} />
    </div>
  );
}

function BallotsTab({ open, closedCount }) {
  const nav = useNav();
  if (open.length === 0 && closedCount > 0) return <TutorialEnd />;
  return (
    <>
      <div className="section-title">Open ballots</div>
      {open.length === 0 ? (
        <div className="card">
          <Empty icon="ballot">No ballots are open right now. This screen updates when the manager opens one.</Empty>
        </div>
      ) : (
        <div className="list">
          {open.map((b) => (
            <Row key={b.id} title={b.title} sub={typeLabel(b)}
              right={b.myVote ? <span className="chip green">Voted</span> : <span className="chip gold">Vote now</span>}
              onClick={() => nav.push('delegateBallot', { ballotId: b.id })} />
          ))}
        </div>
      )}
    </>
  );
}

function ResultsTab({ closed }) {
  const nav = useNav();
  return (
    <>
      <div className="section-title">Closed ballots</div>
      {closed.length === 0 ? (
        <div className="card"><Empty icon="results">Results appear here after the manager closes a ballot.</Empty></div>
      ) : (
        <div className="list">
          {closed.map((b) => (
            <Row key={b.id} title={b.title} sub={resultLine(b)}
              onClick={() => nav.push('delegateBallot', { ballotId: b.id })} />
          ))}
        </div>
      )}
    </>
  );
}

function resultLine(b) {
  const r = b.result;
  if (!r) return typeLabel(b);
  if (r.kind === 'motion') return r.passed ? 'Passed' : 'Did not pass';
  if (r.outcome === 'elected') return `Elected: ${b.options.find((o) => o.id === r.winner)?.label}`;
  if (r.outcome === 'disqualified') return 'Candidates disqualified';
  return 'No one elected on this ballot';
}

/** Shown when every ballot in the tutorial is done. */
function TutorialEnd() {
  const nav = useNav();
  const [tut] = useData(() => api.getTutorial());
  const [session] = useData(() => api.getSession());
  const free = tut?.mode === 'free';
  const tryIt = async () => {
    await api.resetDemo({ mode: 'free' });
    nav.reset('delegateHome', { churchId: session?.churchId });
  };
  const guided = async () => {
    await api.resetDemo({ mode: 'path' });
    await api.signOut();
    nav.reset('start');
  };
  return (
    <div className="tutorial-end">
      <span className="eyebrow-sm">{free ? 'All ballots done' : 'End of the tutorial'}</span>
      <h3>You have voted on every kind of ballot</h3>
      <p>
        {free
          ? 'Go again with different results, or take the guided tutorial again.'
          : 'Now try it yourself: vote on the same ballots and choose how each one comes out.'}
      </p>
      <div className="btn-stack">
        <button className="btn gold" onClick={tryIt}>{free ? 'Try it yourself again' : 'Try it yourself'}</button>
        <button className="btn secondary end-secondary" onClick={guided}>{free ? 'Run the guided tutorial' : 'Run the guided tutorial again'}</button>
      </div>
    </div>
  );
}

function TutorialControls() {
  const nav = useNav();
  const [tut] = useData(() => api.getTutorial());
  if (!tut) return null;
  return (
    <>
      <div className="section-title">Tutorial</div>
      <div className="card">
        <Toggle label="Show tutorial tips" checked={!tut.off} onChange={(v) => api.setTipsOff(!v)} />
      </div>
      <button className="btn secondary" onClick={async () => {
        await api.resetDemo({ mode: 'path' });
        await api.signOut();
        nav.reset('start');
      }}>Start the guided tutorial over</button>
    </>
  );
}

function ChurchTab({ church }) {
  const nav = useNav();
  return (
    <>
      <div className="card">
        <h2>{church.name}</h2>
        <div className="muted small">{church.city} · {church.region} Region</div>
        <div className="muted small">Voting delegate: {church.delegate}</div>
      </div>

      <div className="card">
        <div className="small muted" style={{ fontWeight: 600 }}>Weighted votes this church casts</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0' }}>
          <span className="big-number">{church.weight}</span>
          <WeightPips n={church.weight} />
        </div>
        <div className="small">{church.weightReason}.</div>
        <div className="small muted" style={{ marginTop: 6 }}>
          In the church count, every church casts 1 vote. All of a church&rsquo;s votes go to the same choice.
        </div>
      </div>

      <div className="section-title">Measuring year figures</div>
      <div className="card">
        <dl className="kv">
          <dt>Adopted budget</dt><dd>{money(church.budget)}</dd>
          <dt>Contributions to ACME</dt><dd>{money(church.contributions)}</dd>
          <dt>Percent of budget</dt><dd>{church.contributionPct == null ? '—' : `${fmt(church.contributionPct)}%`}</dd>
          <dt>Budget certified by elders</dt><dd>{church.budgetCertified ? 'Yes' : 'No'}</dd>
          <dt>Member all year</dt><dd>{church.fullYearMember ? 'Yes' : 'No'}</dd>
        </dl>
      </div>

      <TutorialControls />

      <button className="btn secondary" onClick={async () => { await api.signOut(); nav.reset('start'); }}>
        <Icon name="logout" size={18} /> Sign out
      </button>
    </>
  );
}

// What this church's vote counts for on this ballot.
function countExplanation(ballot, church) {
  const w = church.weight;
  const votes = `${w} vote${w === 1 ? '' : 's'}`;
  if (ballot.countRule === 'church') {
    return {
      title: 'Each church has 1 vote on this ballot',
      body: w > 1
        ? `${church.name} has ${votes} in the weighted count, but this ballot is decided by the church count only. Your church casts a single vote, the same as every other church.`
        : `This ballot is decided by the church count only. Your church casts a single vote, the same as every other church.`,
    };
  }
  return {
    title: 'This ballot is counted two ways',
    body: `${church.name} casts 1 vote in the church count and ${votes} in the weighted count, all for the choice you make. ` +
      (ballot.kind !== 'candidates'
        ? 'The motion must pass both counts.'
        : ballot.round >= 3
          ? 'If neither candidate carries both counts, the higher combined score wins.'
          : 'A candidate must carry both counts to be elected.'),
  };
}

function DemoResultsButton({ ballot }) {
  const nav = useNav();
  const [busy, setBusy] = useState(null);
  const [tut] = useData(() => api.getTutorial());
  const isElection = ballot.kind === 'candidates';
  const finish = async (target) => {
    setBusy(target);
    await api.demoFinishBallot(ballot.id, target, ballot.myVote?.choice);
    nav.replace('delegateBallot', { ballotId: ballot.id });
  };
  if (!tut) return null;
  if (tut.mode === 'path') {
    return (
      <div className="demo-panel">
        <p className="tiny" style={{ margin: '0 0 8px', color: 'var(--amber)' }}>
          Tutorial. The other churches&rsquo; votes are set so you can see this rule at work.
        </p>
        <button className="btn gold" disabled={!!busy} onClick={() => finish('script')}>
          {busy ? 'Counting…' : 'See the result'}
        </button>
      </div>
    );
  }
  return (
    <div className="demo-panel">
      <p className="tiny" style={{ margin: '0 0 8px', color: 'var(--amber)' }}>
        Try it yourself. Fills in votes for the other churches and closes the ballot.
        Choose how it comes out.
      </p>
      <div className="demo-choice">
        <button className="btn secondary small" style={{ width: '100%' }} disabled={!!busy} onClick={() => finish('pass')}>
          {busy === 'pass' ? 'Counting…' : isElection ? 'Someone elected' : 'Demo pass'}
        </button>
        <button className="btn secondary small" style={{ width: '100%' }} disabled={!!busy} onClick={() => finish('fail')}>
          {busy === 'fail' ? 'Counting…' : isElection ? 'No one elected' : 'Demo fail'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vote on one ballot
// ---------------------------------------------------------------------------

export function BallotScreen({ ballotId }) {
  const nav = useNav();
  const [session] = useData(() => api.getSession());
  const churchId = session?.churchId;
  const [ballot] = useData(() => (churchId ? api.getBallot(ballotId, { churchId }) : Promise.resolve(null)), [ballotId, churchId]);
  const [church] = useData(() => (churchId ? api.getChurch(churchId) : Promise.resolve(null)), [churchId]);
  const [choice, setChoice] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [allBallots] = useData(() => (churchId ? api.listBallots({ churchId }) : Promise.resolve([])), [churchId]);
  const [tut] = useData(() => api.getTutorial());
  const mode = tut?.mode || 'path';
  if (!ballot || !church) return <div className="screen"><AppBar title="Ballot" /></div>;
  const hasNext = (allBallots || []).some((x) => x.status === 'open' && x.id !== ballot.id && x.eligible && !x.myVote);
  const tips = ballot.status === 'closed'
    ? (ballot.result && allBallots ? resultTips(ballot, { hasNext, mode }) : [])
    : ballot.myVote ? afterVoteTips(ballot, mode) : beforeVoteTips(ballot, church, mode);

  const options = ballot.kind === 'candidates'
    ? ballot.options.map((o) => ({ id: o.id, label: o.label }))
    : [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const v = await api.castVote(ballot.id, choice);
      nav.replace('delegateReceipt', { ballotId: ballot.id, receipt: v.receipt, choice, weight: v.weight, at: v.at });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <AppBar title={ballot.status === 'closed' ? 'Result' : 'Ballot'} />
      <div className="content">
        {ballot.status === 'closed' && allBallots && !hasNext && !(allBallots || []).some((x) => x.status === 'open' && x.eligible) && <TutorialEnd />}
        {ballot.status === 'closed' ? (
          // Everything about the finished ballot, together in one box.
          <section className="result-group" aria-label={`Result: ${ballot.title}`}>
            <div className="result-group-head">
              <span className="eyebrow-sm">Result</span>
              <h2>{ballot.title}</h2>
              {ballot.description && <p className="small" style={{ margin: '6px 0 8px' }}>{ballot.description}</p>}
              <RuleChips ballot={ballot} />
            </div>
            <ResultView ballot={ballot} />
            {ballot.myVote && (
              <p className="small muted center" style={{ margin: '4px 0 0' }}>
                {church.name} voted {choiceLabel(ballot, ballot.myVote.choice)}{ballot.countRule === 'both' ? ` (1 church, ${ballot.myVote.weight} weighted)` : ''}.
              </p>
            )}
          </section>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
              <h2>{ballot.title}</h2>
              <StatusChip status={ballot.status} />
            </div>
            {ballot.description && <p className="small" style={{ margin: '8px 0 10px' }}>{ballot.description}</p>}
            <div style={{ marginTop: 10 }}><RuleChips ballot={ballot} /></div>
          </div>
        )}

        {ballot.status === 'open' && ballot.myVote && (
          <Banner tone="green" title="Your vote is recorded">
            {church.name} voted <b>{choiceLabel(ballot, ballot.myVote.choice)}</b> at {time(ballot.myVote.at)}.
            Receipt {ballot.myVote.receipt}. Results appear when voting closes.
          </Banner>
        )}
        {ballot.status === 'open' && ballot.myVote && <DemoResultsButton ballot={ballot} />}

        {ballot.status === 'open' && ballot.kind === 'candidates' && ballot.round === 3 && (
          <Banner tone="gold" title="Ballot 3 is final unless there is a tie">
            If a candidate wins both counts, he is elected. If the counts split, the higher combined score wins.
            Only an exact tie in combined score leads to a fourth ballot.
          </Banner>
        )}
        {ballot.status === 'open' && ballot.kind === 'candidates' && ballot.round >= 4 && (
          <Banner tone="red" title="This is the final ballot">
            It is decided the same way as ballot 3. If the combined scores tie again, both candidates are
            disqualified and nominations are reopened.
          </Banner>
        )}
        {ballot.status === 'open' && !ballot.myVote && (
          <>
            <Banner tone="navy" title={countExplanation(ballot, church).title}>
              {countExplanation(ballot, church).body}
            </Banner>
            <div className="section-title">Your choice</div>
            <div className="choice-group">
              {options.map((o) => (
                <Choice key={o.id} className="vote" label={o.label} selected={choice === o.id} onClick={() => setChoice(o.id)} />
              ))}
            </div>
            <div className="choice-group" style={{ marginTop: 14 }}>
              <Choice label="Abstain" desc="An abstention is not counted as a vote cast."
                selected={choice === 'abstain'} onClick={() => setChoice('abstain')} />
            </div>
            <button className="btn gold" style={{ marginTop: 18 }} disabled={!choice} onClick={() => setConfirming(true)}>
              Review vote
            </button>
          </>
        )}
      </div>

      {!confirming && <Coach tips={tips} />}
      {confirming && (
        <Sheet onClose={() => !busy && setConfirming(false)}>
          <h2>Confirm your vote</h2>
          <div className="card" style={{ margin: '12px 0' }}>
            <div className="small muted">{ballot.title}</div>
            <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0', color: 'var(--navy-dark)' }}>
              {choiceLabel(ballot, choice)}
            </div>
            <div className="small">
              {choice === 'abstain'
                ? `${church.name} abstains. No votes are cast.`
                : ballot.countRule === 'church'
                  ? `${church.name} casts 1 vote. This ballot is decided by the church count only.`
                  : `${church.name} casts 1 vote in the church count and ${church.weight} in the weighted count.`}
            </div>
          </div>
          <p className="small muted">You cannot change your vote after you submit it.</p>
          {error && <p className="error">{error}</p>}
          <div className="btn-stack">
            <button className="btn gold" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit vote'}</button>
            <button className="btn secondary" onClick={() => setConfirming(false)} disabled={busy}>Go back</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function Receipt({ ballotId, receipt, choice, weight, at }) {
  const nav = useNav();
  const [session] = useData(() => api.getSession());
  const [tut] = useData(() => api.getTutorial());
  const [ballot] = useData(
    () => (session ? api.getBallot(ballotId, { churchId: session.churchId }) : Promise.resolve(null)),
    [ballotId, session?.churchId]
  );
  return (
    <div className="screen">
      <AppBar title="Vote recorded" back={false} />
      <div className="content center">
        <div className="receipt-check"><Icon name="check" size={40} stroke={2.5} /></div>
        <h2>Your vote is recorded</h2>
        {ballot && (
          <div className="card" style={{ textAlign: 'left' }}>
            <dl className="kv">
              <dt>Ballot</dt><dd>{ballot.title}</dd>
              <dt>Choice</dt><dd>{choiceLabel(ballot, choice)}</dd>
              <dt>Votes cast</dt><dd>{choice === 'abstain' ? 'None (abstained)' : ballot.countRule === 'church' ? '1 (church count only)' : `1 church, ${weight} weighted`}</dd>
              <dt>Time</dt><dd>{time(at)}</dd>
            </dl>
          </div>
        )}
        <div>
          <div className="small muted" style={{ marginBottom: 6 }}>Receipt number</div>
          <span className="code-box">{receipt}</span>
        </div>
        {ballot?.status === 'open' && <DemoResultsButton ballot={ballot} />}
        <button className="btn" onClick={nav.pop}>Back to ballots</button>
      </div>
      {ballot?.status === 'open' && tut && <Coach tips={afterVoteTips(ballot, tut.mode)} />}
    </div>
  );
}
