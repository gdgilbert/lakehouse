// Edited tutorial wording, while editing is turned on (FEATURES.editTips).
//
// On the published page the edits live in the artifact's database
// (collection "tipEdits"), so they last across runs and devices, only the
// artifact's owner can change them, and Claude can read them back to make the
// wording permanent. Running locally (npm run dev) there is no database, so the
// edits are kept in this browser's localStorage instead.
//
// Each edit is one document keyed by tip and page:
//   { tipId, page, title, body, originalTitle, originalBody, dynamic, updatedAt }

import { useEffect, useState } from 'react';

const LOCAL_KEY = 'acme-vote-tip-edits-v1';
let state = { ready: false, canEdit: false, edits: {}, source: 'none' };
const listeners = new Set();
let started = false;
let db = null;

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

/** The stable key for one page of one tip. Ballot ids change every run, so they are dropped. */
export function editKey(tipId, page) {
  return `${tipId.replace(/b-[a-z0-9]+-[a-z0-9]+/g, 'ballot')}~p${page}`.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch { return {}; }
}
function writeLocal(edits) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(edits)); } catch { /* ignore */ }
}

async function start() {
  if (started) return;
  started = true;
  const claude = typeof window !== 'undefined' ? window.claude : null;
  if (!claude || typeof claude.use !== 'function') {
    emit({ ready: true, canEdit: true, edits: readLocal(), source: 'local' });
    return;
  }
  try {
    const [d, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    db = d;
    if (!db) { emit({ ready: true, canEdit: false, source: 'none' }); return; }
    const owner = user ? await user.isOwner() : false;
    emit({ canEdit: Boolean(owner), source: 'db' });
    db.collection('tipEdits').onSnapshot(
      (snap) => {
        const edits = {};
        snap.docs.forEach((doc) => { edits[doc.id] = doc.data(); });
        emit({ ready: true, edits });
      },
      () => emit({ ready: true })
    );
  } catch {
    emit({ ready: true, canEdit: false, source: 'none' });
  }
}

export function useTipEdits() {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    start();
    setS(state);
    return () => listeners.delete(setS);
  }, []);
  return s;
}

export async function saveTipEdit(key, data) {
  const doc = { ...data, updatedAt: new Date().toISOString() };
  if (state.source === 'db' && db) {
    await db.collection('tipEdits').doc(key).set(doc);
  } else {
    const edits = { ...readLocal(), [key]: doc };
    writeLocal(edits);
    emit({ edits });
  }
}

export async function removeTipEdit(key) {
  if (state.source === 'db' && db) {
    await db.collection('tipEdits').doc(key).delete();
  } else {
    const edits = { ...readLocal() };
    delete edits[key];
    writeLocal(edits);
    emit({ edits });
  }
}
