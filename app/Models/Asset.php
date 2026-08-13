<?php

namespace App\Models;

use App\Enums\AssetCategory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'category', 'current_value', 'note'])]
class Asset extends Model
{
    protected function casts(): array
    {
        return [
            'category' => AssetCategory::class,
            'current_value' => 'decimal:2',
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
