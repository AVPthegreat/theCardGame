'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveCred } from '@/lib/client';

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('kqj:name');
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function rememberName(n) {
    try {
      localStorage.setItem('kqj:name', n);
    } catch {
      /* ignore */
    }
  }

  async function handleCreate() {
    setError('');
    if (!name.trim()) return setError('Enter your name first');
    setBusy('create');
    try {
      rememberName(name.trim());
      const res = await api.createRoom(name.trim());
      saveCred(res.code, { playerId: res.playerId, token: res.token, name: name.trim() });
      router.push(`/room/${res.code}`);
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  }

  async function handleJoin() {
    setError('');
    if (!name.trim()) return setError('Enter your name first');
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError('Enter the 4-letter room code');
    setBusy('join');
    try {
      rememberName(name.trim());
      const res = await api.joinRoom(c, name.trim());
      saveCred(res.code, { playerId: res.playerId, token: res.token, name: name.trim() });
      router.push(`/room/${res.code}`);
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  }

  return (
    <main className="page">
      <div className="wrap" style={{ maxWidth: 480 }}>
        <div className="brand">
          <div className="kicker">The card hunt</div>
          <h1>Ace in the Hole</h1>
          <div className="suits">
            <span className="suit-black">&#9824;</span>{' '}
            <span className="suit-red">&#9829;</span>{' '}
            <span className="suit-red">&#9830;</span>{' '}
            <span className="suit-black">&#9827;</span>
          </div>
          <p className="tagline">
            Flip cards with up to 4 friends. Claim the <b>King</b>, <b>Queen</b> and <b>Jack</b> for
            points, and beware the one card that changes everything.
          </p>
        </div>

        <div className="panel stack" style={{ marginTop: 22 }}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              className="input"
              maxLength={20}
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button
            className="btn gold block lg"
            onClick={handleCreate}
            disabled={busy !== ''}
          >
            {busy === 'create' ? 'Creating room...' : 'Create a room'}
          </button>

          <div className="divider">or join</div>

          <div className="field">
            <label htmlFor="code">Room code</label>
            <input
              id="code"
              className="input code-input"
              maxLength={5}
              placeholder="ABCD"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <button className="btn block" onClick={handleJoin} disabled={busy !== ''}>
            {busy === 'join' ? 'Joining...' : 'Join room'}
          </button>

          <div className="err center">{error}</div>
        </div>

        <div className="rules panel" style={{ marginTop: 16 }}>
          <b>How it works</b>
          <br />
          25 cards lie face down. On your turn, flip one. Somewhere in there hide the King (500),
          Queen (300) and Jack (100) of one suit. First to reveal them all ends the round, and the
          highest score wins. There may also be a secret worth chasing...
        </div>

        <p className="footer-note">2 to 4 players &middot; pass-and-play on separate devices</p>
      </div>
    </main>
  );
}
