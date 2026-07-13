// app/constants/options.js
// Shared option lists reused across screens (AddBet today; History/Insights filters later)

export const SPORTS = ['Football', 'Basketball', 'Tennis'];

export const PLATFORMS = ['Betika', 'SportPesa', 'Odibets', 'M-Cheza'];

// Market lists are sport-specific — not every market makes sense for every sport
// (e.g. BTTS doesn't apply to Basketball). Fall back to a generic list for any
// sport added to SPORTS without an explicit entry here.
export const SPORT_MARKETS = {
  Football: ['1X2', 'Double Chance', 'Over/Under', 'BTTS', 'Handicap', 'Correct Score', 'Other'],
  Basketball: ['Moneyline', 'Over/Under', 'Handicap', 'Player Prop', 'Other'],
  Tennis: ['Moneyline', 'Over/Under', 'Handicap', 'Set Betting', 'Other'],
};

export const DEFAULT_MARKETS = ['Moneyline', 'Over/Under', 'Handicap', 'Other'];

// Event/Match field placeholder — sport-keyed so the example matches the selected sport.
export const EVENT_PLACEHOLDERS = {
  Football: 'e.g. Arsenal vs Chelsea',
  Basketball: 'e.g. Warriors vs Lakers',
  Tennis: 'e.g. Sinner vs Alcaraz',
};

export const DEFAULT_EVENT_PLACEHOLDER = 'e.g. Team A vs Team B';
