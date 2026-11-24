'use client';

import PlayingCard from './PlayingCard';
import Scoreboard from './Scoreboard';

export default function Board({ state, onFlip, flyPoints, pending }) {
  const myTurn = state.yourTurn;
  const found = state.foundKQJ;

  return (
    <div className="wrap">
      <div className="board-top">
        <div className={`turn-banner ${myTurn ? 'mine' : ''}`}>
          <span className="dot" />
          {myTurn ? 'Your turn — flip a card' : `${state.currentTurnName || 'Opponent'}'s turn`}
        </div>

        <div className="royal-track" title="Royals found">
          {['K', 'Q', 'J'].map((r) => (
            <div key={r} className={`royal-chip ${found[r] ? 'found' : ''}`}>
              {r}
            </div>
          ))}
          <div className="hint-strip" style={{ marginTop: 0 }}>
            <span className="pill">
              <b>{state.flippedCount}</b>/{state.totalCards} flipped
            </span>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel" style={{ padding: 'clamp(10px,2.5vw,18px)' }}>
          <div className="game-grid">
            {state.cards.map((card) => (
              <PlayingCard
                key={card.index}
                card={card}
                flippable={myTurn && !card.faceUp && !pending}
                onFlip={() => onFlip(card.index)}
                flyPoints={flyPoints && flyPoints.index === card.index ? flyPoints.points : null}
              />
            ))}
          </div>
        </div>

        <Scoreboard players={state.players} currentTurnId={state.currentTurnId} log={state.log} />
      </div>
    </div>
  );
}
