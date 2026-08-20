<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['month', 'year', 'balance', 'payment_amount', 'payment_date', 'payer_name', 'note', 'actual_retail_interest', 'actual_late_payment_interest'])]
class CardStatement extends Model
{
    protected function casts(): array
    {
        return [
            'month' => 'integer',
            'year' => 'integer',
            'balance' => 'decimal:2',
            'payment_amount' => 'decimal:2',
            'payment_date' => 'date:Y-m-d',
            'actual_retail_interest' => 'decimal:2',
            'actual_late_payment_interest' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Scope every route-model-bound lookup to the authenticated user, so a
     *  mismatched owner resolves to a plain 404 instead of leaking existence. */
    public function resolveRouteBinding($value, $field = null): self
    {
        return $this->where($field ?? $this->getRouteKeyName(), $value)
            ->where('user_id', auth()->id())
            ->firstOrFail();
    }
}
