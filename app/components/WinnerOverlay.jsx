'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function WinnerOverlay({ state, isHost, onRematch, onLeave, busy }) {
  const firedRef = useRef(false);
  const isAce = state.winReason === 'ace';
  const isAbandoned = state.winReason === 'abandoned';

  const winners = state.players.filter((p) => state.winnerIds.includes(p.id));
  const youWon = winners.some((p) => p.isYou);
  const tie = winners.length > 1;
  const ranked = [...state.players].sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const gold = ['#ffe39a', '#e9c767', '#b8923a', '#fff6df'];

    if (isAce) {
      // Big dramatic jackpot burst.
      const end = Date.now() + 2200;
      const boom = () => {
        confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0 }, colors: gold, scalar: 1.2 });
        confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1 }, colors: gold, scalar: 1.2 });
        if (Date.now() < end) requestAnimationFrame(boom);
      };
      confetti({ particleCount: 180, spread: 100, startVelocity: 55, origin: { y: 0.4 }, colors: gold, scalar: 1.3 });
      boom();
      setTimeout(() => {
        confetti({ particleCount: 140, spread: 120, startVelocity: 45, origin: { y: 0.5 }, colors: gold });
      }, 350);
    } else if (!isAbandoned) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.45 }, colors: gold, scalar: 1.1 });
    }
  }, [isAce, isAbandoned]);

  let title = 'Round over';
  if (isAce) title = 'JACKPOT!';
  else if (tie) title = "It's a tie!";
  else if (youWon) title = 'You win!';

  return (
    <div className="overlay">
      <motion.div
        className={`winner-card ${isAce ? 'ace' : ''}`}
        initial={{ scale: 0.7, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <motion.div
          className="crown"
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260 }}
        >
          {isAce ? '★' : isAbandoned ? '♚' : '♚'}
        </motion.div>

        <h2>{title}</h2>
        <div className="who">
          {winners.length === 0 ? 'No winner' : winners.map((w) => w.name).join(' & ')}
          {tie ? ' share the crown' : ''}
        </div>
        <div className="reason">
          {isAce ? (
            <>
              Flipped the secret <b style={{ color: 'var(--gold-bright)' }}>Ace</b> for 1000 points and
              an instant win.
            </>
          ) : isAbandoned ? (
            'Everyone left — final standings below.'
          ) : (
            'All three royals were found. Highest score takes it.'
          )}
        </div>

        <div className="final-scores">
          {ranked.map((p) => (
            <div key={p.id} className={`row ${state.winnerIds.includes(p.id) ? 'win' : ''}`}>
              <span>
                {state.winnerIds.includes(p.id) ? '♚ ' : ''}
                {p.name}
                {p.isYou ? ' (you)' : ''}
              </span>
              <span className="pts">{p.score}</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn gold block lg" onClick={onRematch} disabled={busy}>
            {busy ? 'Resetting...' : 'Play again'}
          </button>
        ) : (
          <p className="muted" style={{ marginBottom: 14 }}>
            Waiting for the host to start a rematch...
          </p>
        )}
        <button className="btn ghost block" style={{ marginTop: 10 }} onClick={onLeave}>
          Leave room
        </button>
      </motion.div>
    </div>
  );
}
