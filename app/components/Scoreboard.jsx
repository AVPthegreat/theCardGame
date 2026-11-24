'use client';

import { motion } from 'framer-motion';
import { avatarStyle, initials } from '@/lib/client';

export default function Scoreboard({ players, currentTurnId, log }) {
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="panel">
      <h3 style={{ fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
        Scoreboard
      </h3>
      <div className="scoreboard">
        {ranked.map((p) => {
          const idx = players.findIndex((x) => x.id === p.id);
          const isTurn = p.id === currentTurnId;
          return (
            <div
              key={p.id}
              className={`score-row ${isTurn ? 'turn' : ''} ${p.connected ? '' : 'offline'}`}
            >
              <span className="avatar av" style={avatarStyle(idx)}>
                {initials(p.name)}
              </span>
              <span className="nm">
                {p.name}
                {p.isYou ? ' (you)' : ''}
              </span>
              <motion.span
                className="pts"
                key={`${p.id}-${p.score}`}
                initial={{ scale: 1.5, color: '#fff' }}
                animate={{ scale: 1, color: '#ffe39a' }}
                transition={{ duration: 0.4 }}
              >
                {p.score}
              </motion.span>
            </div>
          );
        })}
      </div>

      {log && log.length > 0 && (
        <div className="feed">
          {log.map((e, i) => (
            <div className="line" key={`${e.at}-${i}`}>
              {e.ace ? (
                <>
                  <span className="hi">{e.byName}</span> flipped the <span className="hi">ACE</span> — jackpot!
                </>
              ) : e.scoring ? (
                <>
                  <span className="hi">{e.byName}</span> found the {e.rank} (+{e.points})
                </>
              ) : (
                <>
                  <span className="hi">{e.byName}</span> flipped a {e.rank}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
