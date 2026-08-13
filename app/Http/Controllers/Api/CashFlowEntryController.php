<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashFlowEntryRequest;
use App\Models\CashFlowEntry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashFlowEntryController extends Controller
{
    public function index(Request $request)
    {
        $this->materializeDueRecurring($request->user());

        $filters = $request->validate([
            'month' => ['sometimes', 'integer', 'between:1,12'],
            'year' => ['sometimes', 'integer', 'between:2000,2100'],
        ]);

        $entries = $request->user()->cashFlowEntries()
            ->when($filters['month'] ?? null, fn ($q, $m) => $q->where('month', $m))
            ->when($filters['year'] ?? null, fn ($q, $y) => $q->where('year', $y))
            ->orderBy('year')->orderBy('month')->orderBy('id')
            ->get();

        return response()->json(['data' => $entries]);
    }

    public function store(CashFlowEntryRequest $request)
    {
        $validated = $request->validated();
        $isRecurring = $validated['is_recurring'] ?? false;
        unset($validated['is_recurring']);

        if (! $isRecurring) {
            $entry = $request->user()->cashFlowEntries()->create($validated);

            return response()->json(['data' => $entry], 201);
        }

        $entry = DB::transaction(function () use ($request, $validated) {
            $template = $request->user()->recurringTransactions()->create([
                'type' => $validated['type'],
                'category' => $validated['category'],
                'label' => $validated['label'] ?? null,
                'amount' => $validated['amount'],
            ]);

            return $request->user()->cashFlowEntries()->create([
                ...$validated,
                'recurring_transaction_id' => $template->id,
            ]);
        });

        return response()->json(['data' => $entry->load('recurringTransaction')], 201);
    }

    /** Lazily generates this month's (and any skipped past months') cash-flow
     *  entries for every active recurring template, since the app has no
     *  cron/scheduler — this runs on every app load instead. Idempotent. */
    private function materializeDueRecurring(User $user): void
    {
        $now = now();
        $currentKey = $now->year * 12 + $now->month;

        foreach ($user->recurringTransactions()->where('is_active', true)->get() as $template) {
            $latest = $template->generatedEntries()->orderByDesc('year')->orderByDesc('month')->first();
            $year = $latest ? $latest->year : $template->created_at->year;
            $month = $latest ? $latest->month : $template->created_at->month;

            for ($i = 0; $i < 36; $i++) {
                $month++;
                if ($month > 12) {
                    $month = 1;
                    $year++;
                }
                if ($year * 12 + $month > $currentKey) {
                    break;
                }

                $user->cashFlowEntries()->firstOrCreate(
                    [
                        'recurring_transaction_id' => $template->id,
                        'month' => $month,
                        'year' => $year,
                    ],
                    [
                        'type' => $template->type->value,
                        'category' => $template->category->value,
                        'label' => $template->label,
                        'amount' => $template->amount,
                    ]
                );
            }
        }
    }

    public function update(CashFlowEntryRequest $request, CashFlowEntry $cash_flow_entry)
    {
        $cash_flow_entry->update($request->validated());

        return response()->json(['data' => $cash_flow_entry]);
    }

    public function destroy(CashFlowEntry $cash_flow_entry)
    {
        $cash_flow_entry->delete();

        return response()->json(status: 204);
    }
}
