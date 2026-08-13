<?php

namespace App\Models;

use App\Enums\DebtType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'type', 'balance', 'interest_rate', 'minimum_payment'])]
class Debt extends Model
{
    protected function casts(): array
    {
        return [
            'type' => DebtType::class,
            'balance' => 'decimal:2',
            'interest_rate' => 'decimal:2',
            'minimum_payment' => 'decimal:2',
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
