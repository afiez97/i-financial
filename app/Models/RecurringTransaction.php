<?php

namespace App\Models;

use App\Enums\CashFlowCategory;
use App\Enums\CashFlowType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['type', 'category', 'label', 'amount', 'is_active'])]
class RecurringTransaction extends Model
{
    protected function casts(): array
    {
        return [
            'type' => CashFlowType::class,
            'category' => CashFlowCategory::class,
            'amount' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function generatedEntries(): HasMany
    {
        return $this->hasMany(CashFlowEntry::class);
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
