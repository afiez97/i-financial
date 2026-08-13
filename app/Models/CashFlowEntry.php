<?php

namespace App\Models;

use App\Enums\CashFlowCategory;
use App\Enums\CashFlowType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['month', 'year', 'type', 'category', 'label', 'amount'])]
class CashFlowEntry extends Model
{
    protected function casts(): array
    {
        return [
            'type' => CashFlowType::class,
            'category' => CashFlowCategory::class,
            'month' => 'integer',
            'year' => 'integer',
            'amount' => 'decimal:2',
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
