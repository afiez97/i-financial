<?php

namespace App\Models;

use App\Enums\CardStatus;
use App\Enums\CardType;
use App\Enums\RateType;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['card_type', 'balance', 'statement_day', 'due_day', 'interest_rate', 'rate_type', 'status', 'termination_target_date', 'termination_note'])]
class CardProfile extends Model
{
    /** The only interest-rate presets the UI is allowed to submit. */
    public const array RATE_PRESETS = [
        ['interest_rate' => 15.0, 'rate_type' => 'annual'],
        ['interest_rate' => 18.0, 'rate_type' => 'annual'],
        ['interest_rate' => 2.0, 'rate_type' => 'monthly'],
    ];

    protected function casts(): array
    {
        return [
            'card_type' => CardType::class,
            'rate_type' => RateType::class,
            'status' => CardStatus::class,
            'balance' => 'decimal:2',
            'interest_rate' => 'decimal:3',
            'statement_day' => 'integer',
            'due_day' => 'integer',
            'termination_target_date' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The annual-equivalent interest rate, converting monthly presets (×12). */
    public function annualPercent(): float
    {
        return $this->rate_type === RateType::Monthly
            ? (float) $this->interest_rate * 12
            : (float) $this->interest_rate;
    }

    /**
     * The cycle-start, due, and statement dates for a given (month, year) —
     * `month`/`year` identify the cycle by the date the STATEMENT ITSELF is
     * issued (matching what's printed on the real bank statement), so the
     * interest being reported covers the cycle that just closed: from the
     * previous statement date up to this one. The due date falls wherever it
     * lands within that window (same month as cycle-start when due_day is
     * later in the month than statement_day, otherwise the same month as the
     * statement — matching the app's default: statement 17th, due 6th, so a
     * cycle from 17 Jul to 17 Aug has its due date on 6 Aug).
     *
     * @return array{0: Carbon, 1: Carbon, 2: Carbon} [cycleStart, dueDate, statementDate]
     */
    public function cycleDates(int $month, int $year): array
    {
        $monthStart = Carbon::create($year, $month, 1);
        $statementDate = $monthStart->copy()->day(min($this->statement_day, $monthStart->daysInMonth));
        $cycleStart = $statementDate->copy()->subMonthNoOverflow();

        $dueDate = $this->due_day > $this->statement_day
            ? $cycleStart->copy()
            : $statementDate->copy();
        $dueDate->day(min($this->due_day, $dueDate->daysInMonth));

        return [$cycleStart, $dueDate, $statementDate];
    }

    /**
     * Dual-phase daily interest estimate for a billing cycle: the full balance
     * accrues interest until the payment is made, then the remaining balance
     * accrues interest for the rest of the cycle. This is an approximation
     * (day-of-month presets, not exact calendar billing) — not an official figure.
     */
    public function estimateRetailInterest(float $balance, float $paymentAmount, int $month, int $year, ?Carbon $paymentDate): float
    {
        [$cycleStart, , $statementDate] = $this->cycleDates($month, $year);
        $effectivePaymentDate = $paymentDate ? $paymentDate->copy()->max($cycleStart)->min($statementDate) : $statementDate->copy();

        $phase1Days = $cycleStart->diffInDays($effectivePaymentDate);
        $phase2Days = $effectivePaymentDate->diffInDays($statementDate);

        $dailyRate = $this->annualPercent() / 100 / 365;
        $remainingBalance = max($balance - $paymentAmount, 0);

        return round(($balance * $dailyRate * $phase1Days) + ($remainingBalance * $dailyRate * $phase2Days), 2);
    }

    /** Flat 1% late-payment penalty on the balance if payment lands after the cycle's due date. */
    public function estimateLatePaymentInterest(float $balance, int $month, int $year, ?Carbon $paymentDate): float
    {
        if (! $paymentDate) {
            return 0.0;
        }

        [, $dueDate] = $this->cycleDates($month, $year);

        return $paymentDate->gt($dueDate) ? round($balance * 0.01, 2) : 0.0;
    }
}
