'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, loadCred, saveCred, clearCred } from '@/lib/client';
import Lobby from '@/app/components/Lobby';
import Board from '@/app/components/Board';
import WinnerOverlay from '@/app/components/WinnerOverlay';

const POLL_MS = 1500;

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const code = String(params.code || '').toUpperCase();

  const [cred, setCred] = useState(null); // { playerId, token, name }
  const [state, setState] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | joining | ready | missing | error
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(''); // '', 'flip', 'start', 'rematch'
  const [flyPoints, setFlyPoints] = useState(null);
  const [joinName, setJoinName] = useState('');

  const credRef = useRef(null);
  const pollingRef = useRef(false);
  const lastFlipAtRef = useRef(0);

  credRef.current = cred;

  // Load saved credentials (if this browser created/joined the room).
  useEffect(() => {
    const saved = loadCred(code);
    if (saved) {
      setCred(saved);
      setJoinName(saved.name || '');
    } else {
      try {
        setJoinName(localStorage.getItem('kqj:name') || '');
      } catch {
        /* ignore */
      }
    }
  }, [code]);

  // Pull state and apply it, detecting scoring flips for the flying-points FX.
  const refresh = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const viewerId = credRef.current?.playerId || null;
      const { state: s } = await api.getState(code, viewerId);

      if (s.lastFlip && s.lastFlip.at !== lastFlipAtRef.current) {
        lastFlipAtRef.current = s.lastFlip.at;
        if (s.lastFlip.points > 0) {
          setFlyPoints({ index: s.lastFlip.index, points: s.lastFlip.points });
          setTimeout(() => setFlyPoints(null), 1200);
        }
      }

      setState(s);
      setStatus('ready');
      setError('');
    } catch (e) {
      if (/No room/i.test(e.message)) {
        setStatus('missing');
      } else {
        setError(e.message);
        if (!state) setStatus('error');
      }
    } finally {
      pollingRef.current = false;
    }
  }, [code, state]);

  // Poll loop.
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Best-effort "leave" when closing the tab.
  useEffect(() => {
    function onHide() {
      const c = credRef.current;
      if (!c) return;
      try {
        fetch('/api/leave-room', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, playerId: c.playerId, token: c.token }),
          keepalive: true,
        });
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [code]);

  // ---- actions ----
  async function handleJoin() {
    setError('');
    const name = joinName.trim();
    if (!name) return setError('Enter your name');
    setStatus('joining');
    try {
      const res = await api.joinRoom(code, name);
      const newCred = { playerId: res.playerId, token: res.token, name };
      saveCred(code, newCred);
      try {
        localStorage.setItem('kqj:name', name);
      } catch {
        /* ignore */
      }
      setCred(newCred);
      setState(res.state);
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('ready');
    }
  }

  async function handleStart() {
    if (!cred) return;
    setBusy('start');
    try {
      const res = await api.startGame(code, cred.playerId, cred.token);
      setState(res.state);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function handleFlip(index) {
    if (!cred || busy) return;
    setBusy('flip');
    try {
      const res = await api.flipCard(code, cred.playerId, cred.token, index);
      if (res.event && res.event.at !== lastFlipAtRef.current) {
        lastFlipAtRef.current = res.event.at;
        if (res.event.points > 0) {
          setFlyPoints({ index: res.event.index, points: res.event.points });
          setTimeout(() => setFlyPoints(null), 1200);
        }
      }
      setState(res.state);
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      setBusy('');
    }
  }

  async function handleRematch() {
    if (!cred) return;
    setBusy('rematch');
    try {
      const res = await api.rematch(code, cred.playerId, cred.token);
      lastFlipAtRef.current = 0;
      setState(res.state);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function handleLeave() {
    if (cred) {
      try {
        await api.leaveRoom(code, cred.playerId, cred.token);
      } catch {
        /* ignore */
      }
      clearCred(code);
    }
    router.push('/');
  }

  // ---- render ----
  if (status === 'loading') {
    return (
      <main className="page">
        <div className="loading">
          <div className="spinner" />
          <div>Loading room {code}...</div>
        </div>
      </main>
    );
  }

  if (status === 'missing') {
    return (
      <main className="page">
        <div className="wrap" style={{ maxWidth: 420 }}>
          <div className="panel center stack">
            <h2>Room not found</h2>
            <p className="muted">
              Room <b>{code}</b> does not exist or has expired (rooms last 6 hours).
            </p>
            <button className="btn gold block" onClick={() => router.push('/')}>
              Back to start
            </button>
          </div>
        </div>
      </main>
    );
  }

  const me = state?.players.find((p) => p.isYou);

  // We have no credentials, or we are not a member — offer to join (lobby only).
  if (!cred || !me) {
    if (state && state.status !== 'lobby') {
      return (
        <main className="page">
          <div className="wrap" style={{ maxWidth: 420 }}>
            <div className="panel center stack">
              <h2>Game in progress</h2>
              <p className="muted">
                Room <b>{code}</b> has already started, so you cannot join right now.
              </p>
              <button className="btn block" onClick={() => router.push('/')}>
                Back to start
              </button>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="page">
        <div className="wrap" style={{ maxWidth: 420 }}>
          <div className="brand">
            <div className="kicker">Join room</div>
            <h1 style={{ fontSize: 40 }}>{code}</h1>
          </div>
          <div className="panel stack">
            <div className="field">
              <label htmlFor="jn">Your name</label>
              <input
                id="jn"
                className="input"
                maxLength={20}
                placeholder="e.g. Sam"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button className="btn gold block lg" onClick={handleJoin} disabled={status === 'joining'}>
              {status === 'joining' ? 'Joining...' : 'Join game'}
            </button>
            <div className="err center">{error}</div>
          </div>
        </div>
      </main>
    );
  }

  const isHost = state.hostId === cred.playerId;

  return (
    <main className="page">
      {state.status === 'lobby' && (
        <Lobby
          state={state}
          isHost={isHost}
          onStart={handleStart}
          onLeave={handleLeave}
          starting={busy === 'start'}
        />
      )}

      {state.status === 'playing' && (
        <Board
          state={state}
          onFlip={handleFlip}
          flyPoints={flyPoints}
          pending={busy === 'flip'}
        />
      )}

      {state.status === 'finished' && (
        <>
          <Board state={state} onFlip={() => {}} flyPoints={null} pending />
          <WinnerOverlay
            state={state}
            isHost={isHost}
            onRematch={handleRematch}
            onLeave={handleLeave}
            busy={busy === 'rematch'}
          />
        </>
      )}

      {error && state.status !== 'lobby' && (
        <div className="wrap" style={{ maxWidth: 560, marginTop: 10 }}>
          <div className="err center">{error}</div>
        </div>
      )}
    </main>
  );
}
