import React, { useEffect, useMemo, useState } from 'react';
import { NavContext, resetSticky } from './components.jsx';
import * as api from './server/api.js';
import Start from './screens/Start.jsx';
import * as Delegate from './screens/Delegate.jsx';
import * as Manager from './screens/Manager.jsx';

const SCREENS = {
  start: Start,
  delegateSignIn: Delegate.SignIn,
  delegateHome: Delegate.Home,
  delegateBallot: Delegate.BallotScreen,
  delegateReceipt: Delegate.Receipt,
  managerHome: Manager.Home,
  managerBallot: Manager.BallotScreen,
  newMotion: Manager.NewMotion,
  newElection: Manager.NewElection,
  election: Manager.ElectionScreen,
  newCommission: Manager.NewCommission,
  commission: Manager.CommissionScreen,
  church: Manager.ChurchScreen,
};

function StatusBar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="statusbar" aria-hidden="true">
      <span>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="26" height="12" viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="#fff" opacity="0.6"/><rect x="2" y="2" width="17" height="8" rx="1.5" fill="#fff"/><rect x="23.5" y="4" width="2" height="4" rx="1" fill="#fff" opacity="0.6"/></svg>
      </span>
    </div>
  );
}

export default function App() {
  const [stack, setStack] = useState(null);

  // Restore the signed-in role after a page reload.
  useEffect(() => {
    api.getSession().then((s) => {
      if (s?.role === 'delegate') setStack([{ name: 'start' }, { name: 'delegateHome', props: { churchId: s.churchId } }]);
      else if (s?.role === 'manager') setStack([{ name: 'start' }, { name: 'managerHome' }]);
      else setStack([{ name: 'start' }]);
    });
  }, []);

  const nav = useMemo(
    () => ({
      canPop: stack ? stack.length > 1 : false,
      push: (name, props) => setStack((s) => [...s, { name, props }]),
      replace: (name, props) => setStack((s) => [...s.slice(0, -1), { name, props }]),
      pop: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      popTo: (name) => setStack((s) => {
        const i = s.map((x) => x.name).lastIndexOf(name);
        return i >= 0 ? s.slice(0, i + 1) : s;
      }),
      reset: (name, props) => { resetSticky(); setStack(name === 'start' ? [{ name: 'start' }] : [{ name: 'start' }, { name, props }]); },
    }),
    [stack]
  );

  if (!stack) return null;
  const top = stack[stack.length - 1];
  const Screen = SCREENS[top.name];

  return (
    <NavContext.Provider value={nav}>
      <div className="stage">
        <div className="device">
          <div className="screen">
            <StatusBar />
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Screen key={stack.length + top.name} {...(top.props || {})} />
            </div>
          </div>
        </div>
        <div className="stage-caption">Demo for the ACME Bylaws Committee. Open this page on a phone for the full-screen view.</div>
      </div>
    </NavContext.Provider>
  );
}
