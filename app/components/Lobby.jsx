'use client';

import { useState } from 'react';
import { avatarStyle, initials } from '@/lib/client';

const MAX = 4;

export default function Lobby({ state, isHost, onStart, onLeave, starting }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }

  const players = state.players;
  const emptySlots = Math.max(0, MAX - players.length);
  const canStart = isHost && players.filter((p) => p.connected).length >= 2;

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <div className="room-head">
        <div className="code-pill">
          <div>
            <div className="label">Room code</div>
            <div className="value">{state.code}</div>
          </div>
          <button className="copy-btn" onClick={copyCode}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button className="btn ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      <div className="panel">
        <h3 style={{ marginBottom: 12 }}>
          Players <span className="muted">({players.length}/{MAX})</span>
        </h3>
        <div className="player-list">
          {players.map((p, i) => (
            <div key={p.id} className={`player-row ${p.connected ? '' : 'offline'}`}>
              <span className="avatar" style={avatarStyle(i)}>
                {initials(p.name)}
              </span>
              <span className="name">{p.name}</span>
              <span className="meta">
                {p.isYou && <span className="tag you">You</span>}
                {p.isHost && <span className="tag host">Host</span>}
              </span>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="player-row slot-empty">
              Waiting for a player...
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          {isHost ? (
            <>
              <button className="btn gold block lg" onClick={onStart} disabled={!canStart || starting}>
                {starting ? 'Dealing...' : canStart ? 'Start game' : 'Need 2+ players'}
              </button>
              <p className="muted center" style={{ marginTop: 10, fontSize: 13 }}>
                Share the code <b style={{ color: 'var(--gold-bright)' }}>{state.code}</b> so friends can join.
              </p>
            </>
          ) : (
            <p className="muted center" style={{ fontSize: 14 }}>
              Waiting for the host to start the game...
            </p>
          )}
        </div>
      </div>

      <div className="rules panel" style={{ marginTop: 14 }}>
        <b>On your turn</b>, flip one card. King = <b>500</b>, Queen = <b>300</b>, Jack = <b>100</b>,
        and they all belong to one hidden suit. Find all three to end the round; highest score wins.
      </div>
    </div>
  );
}
