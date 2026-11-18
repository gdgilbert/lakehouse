import React, { useState } from 'react';
import { Coach, FullscreenButton, Icon, Logo, Sheet, useNav } from '../components.jsx';
import { FEATURES } from '../features.js';
import { startTips } from '../tutorial.js';
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
        <div className="eyebrow">National Business Meeting</div>
        <h1>Delegate Voting</h1>
        <div className="rule" />
        <p>Association of Churches for Missions &amp; Evangelism</p>
      </div>
      <div className="panel">
        <button className="btn gold start-btn" onClick={() => nav.push('intro')}>Start the tutorial</button>
        <FullscreenButton className="on-dark" />
        {FEATURES.manager && (
          <button className="role-card" style={{ marginTop: 14 }} onClick={manager}>
            <span className="ico"><Icon name="gavel" size={22} /></span>
            <span style={{ flex: 1 }}>
              <b>Manager</b>
              <span className="desc">Set up ballots, open and close voting, and see results.</span>
            </span>
            <Icon name="chev" size={18} />
          </button>
        )}
        <p className="demo-note">
          This is a demonstration. Votes are saved only in this browser.
          <br />
          <button className="btn link small" onClick={() => setConfirmReset(true)}>
            {resetDone ? 'Tutorial reset' : 'Start over'}
          </button>
        </p>
      </div>
      {confirmReset && (
        <Sheet onClose={() => setConfirmReset(false)}>
          <h2>Start over?</h2>
          <p className="muted">This clears your votes and results and starts the tutorial from the beginning.</p>
          <div className="btn-stack">
            <button className="btn danger" onClick={async () => {
              await api.resetDemo({ mode: 'path' });
              await api.signOut();
              setConfirmReset(false);
              setResetDone(true);
            }}>Start over</button>
            <button className="btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        </Sheet>
      )}
      <Coach tips={startTips()} />
    </div>
  );
}
