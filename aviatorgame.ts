// TypeScript implementation of an Aviator-like casino game logic.
// This is a core script for game logic, similar to what is shown in the provided image.
// The UI and integration with images/cards/dice is handled elsewhere, this is game logic only.

type Bet = {
  amount: number;
  autoCashoutAt?: number; // optional: player can set an auto-cashout multiplier
  playerId: string;
  hasCashedOut: boolean;
  cashoutMultiplier?: number;
};

type GameState = 'waiting' | 'in-progress' | 'crashed';

interface AviatorGameOptions {
  minBet: number;
  maxBet: number;
  roundIntervalMs: number;
  minMultiplier: number;
  maxMultiplier: number;
}

export class AviatorGame {
  private bets: Bet[] = [];
  private state: GameState = 'waiting';
  private crashMultiplier: number = 0;
  private currentMultiplier: number = 1;
  private timer?: NodeJS.Timeout;
  private readonly options: AviatorGameOptions;
  private readonly randomSeed?: string; // for provably fair

  constructor(options?: Partial<AviatorGameOptions>, randomSeed?: string) {
    this.options = {
      minBet: 1,
      maxBet: 1000,
      roundIntervalMs: 50,
      minMultiplier: 1.01,
      maxMultiplier: 100,
      ...options,
    };
    this.randomSeed = randomSeed;
  }

  placeBet(playerId: string, amount: number, autoCashoutAt?: number): boolean {
    if (this.state !== 'waiting') return false;
    if (amount < this.options.minBet || amount > this.options.maxBet) return false;
    this.bets.push({ amount, playerId, autoCashoutAt, hasCashedOut: false });
    return true;
  }

  startRound() {
    if (this.state !== 'waiting') return;
    this.bets.forEach(b => {
      b.hasCashedOut = false;
      b.cashoutMultiplier = undefined;
    });
    this.state = 'in-progress';
    this.crashMultiplier = this.generateCrashMultiplier();
    this.currentMultiplier = 1;
    this.runMultiplier();
  }

  private runMultiplier() {
    this.timer = setInterval(() => {
      this.currentMultiplier = Math.min(
        this.currentMultiplier * 1.011 + 0.01,
        this.options.maxMultiplier
      );
      this.autoCashoutAll();
      if (this.currentMultiplier >= this.crashMultiplier) {
        this.state = 'crashed';
        clearInterval(this.timer);
        this.bets.forEach(bet => {
          if (!bet.hasCashedOut) {
            bet.cashoutMultiplier = undefined; // lost
          }
        });
      }
    }, this.options.roundIntervalMs);
  }

  private autoCashoutAll() {
    this.bets.forEach(bet => {
      if (
        !bet.hasCashedOut &&
        bet.autoCashoutAt &&
        this.currentMultiplier >= bet.autoCashoutAt
      ) {
        this.cashout(bet.playerId);
      }
    });
  }

  cashout(playerId: string): boolean {
    if (this.state !== 'in-progress') return false;
    const bet = this.bets.find(b => b.playerId === playerId && !b.hasCashedOut);
    if (!bet) return false;
    bet.hasCashedOut = true;
    bet.cashoutMultiplier = this.currentMultiplier;
    return true;
  }

  getResults() {
    return this.bets.map(bet => ({
      playerId: bet.playerId,
      amount: bet.amount,
      cashedOut: bet.hasCashedOut,
      cashoutMultiplier: bet.cashoutMultiplier,
      win:
        bet.hasCashedOut && bet.cashoutMultiplier
          ? bet.amount * bet.cashoutMultiplier
          : 0,
    }));
  }

  isWaiting() {
    return this.state === 'waiting';
  }

  isCrashed() {
    return this.state === 'crashed';
  }

  getCurrentMultiplier() {
    return this.currentMultiplier;
  }

  getCrashMultiplier() {
    return this.crashMultiplier;
  }

  getBets() {
    return this.bets;
  }

  // Provably fair crash multiplier
  private generateCrashMultiplier(): number {
    // Simple provably fair implementation (not for production)
    let rand = Math.random();
    if (this.randomSeed) {
      rand = parseFloat(
        (
          '0.' +
          require('crypto')
            .createHash('sha256')
            .update(this.randomSeed + Date.now())
            .digest('hex')
        ).substr(0, 16)
      );
    }
    // Standard aviator curve formula
    const crash = Math.floor(1 / (1 - rand));
    return Math.max(this.options.minMultiplier, Math.min(crash, this.options.maxMultiplier));
  }

  // Reset for next round
  reset() {
    this.state = 'waiting';
    this.bets = [];
    this.crashMultiplier = 0;
    this.currentMultiplier = 1;
  }
}
