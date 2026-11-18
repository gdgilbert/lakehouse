import React, { useState } from 'react';
import { Icon, Logo, Sheet, useNav } from '../components.jsx';
import * as api from '../server/api.js';

export default function Start() {
  const nav = useNav();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const manager = async () => {
    await api.signInManager();
    nav.push('managerHome');
  };

  return (
    <div className="start">
      <div className="hero">
        <Logo large />
        <div className="eyebrow">General Assembly</div>
        <h1>Voting for Member Churches</h1>
        <div className="rule" />
        <p>Association of Churches for Missions &amp; Evangelism</p>
      </div>
      <div className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>Choose a role for this demo</div>
        <button className="role-card" onClick={() => nav.push('delegateSignIn')}>
          <span className="ico"><Icon name="vote" size={22} /></span>
          <span style={{ flex: 1 }}>
            <b>Delegate</b>
            <span className="desc">Sign in with your church&rsquo;s code and vote.</span>
          </span>
          <Icon name="chev" size={18} />
        </button>
        <button className="role-card" onClick={manager}>
          <span className="ico"><Icon name="gavel" size={22} /></span>
          <span style={{ flex: 1 }}>
            <b>Manager</b>
            <span className="desc">Set up ballots, open and close voting, and see results.</span>
          </span>
          <Icon name="chev" size={18} />
        </button>
        <p className="demo-note">
          This is a demonstration. Votes are saved only in this browser.
          <br />
          <button className="btn link small" onClick={() => setConfirmReset(true)}>
            {resetDone ? 'Demo data reset' : 'Reset demo data'}
          </button>
        </p>
      </div>
      {confirmReset && (
        <Sheet onClose={() => setConfirmReset(false)}>
          <h2>Reset demo data?</h2>
          <p className="muted">This removes all ballots, votes and elections and restores the sample churches.</p>
          <div className="btn-stack">
            <button className="btn danger" onClick={async () => {
              await api.resetDemo();
              await api.signOut();
              setConfirmReset(false);
              setResetDone(true);
            }}>Reset</button>
            <button className="btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
