'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { SUIT_SYMBOL, isRedSuit } from '@/lib/client';

export default function PlayingCard({ card, flippable, onFlip, flyPoints }) {
  const up = card.faceUp;
  const red = up && isRedSuit(card.suit);
  const colorClass = red ? 'r-red' : 'r-black';
  const symbol = up ? SUIT_SYMBOL[card.suit] : '';

  const frontClass = ['card-face', 'card-front', card.ace ? 'ace' : card.scoring ? 'scoring' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`card-slot ${flippable ? 'flippable' : ''}`}>
      <button
        type="button"
        aria-label={
          up
            ? `${card.rank} of ${card.suit}${card.scoring ? `, ${card.points} points` : ''}`
            : flippable
              ? 'Face-down card, flip it'
              : 'Face-down card'
        }
        disabled={!flippable}
        onClick={flippable ? onFlip : undefined}
        style={{
          all: 'unset',
          position: 'absolute',
          inset: 0,
          cursor: flippable ? 'pointer' : 'default',
        }}
      >
        <div className={`card-inner ${up ? 'up' : ''}`}>
          {/* back */}
          <div className="card-face card-back">
            <div className="pattern" />
            <div className="monogram">KQJ</div>
          </div>
          {/* front */}
          <div className={frontClass}>
            {up && (
              <>
                <div className={`corner tl ${colorClass}`}>
                  <span className="r">{card.rank}</span>
                  <span className="s">{symbol}</span>
                </div>
                <div className={`pip ${colorClass}`}>{card.ace ? '★' : symbol}</div>
                <div className={`corner br ${colorClass}`}>
                  <span className="r">{card.rank}</span>
                  <span className="s">{symbol}</span>
                </div>
                {card.claimedByName && (
                  <div className="claim">{card.claimedByName}</div>
                )}
              </>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {flyPoints != null && (
          <motion.div
            className="fly-points"
            initial={{ opacity: 0, y: 6, scale: 0.6 }}
            animate={{ opacity: 1, y: -34, scale: 1.15 }}
            exit={{ opacity: 0, y: -64, scale: 0.9 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          >
            +{flyPoints}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
