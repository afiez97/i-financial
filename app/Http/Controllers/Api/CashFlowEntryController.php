<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CashFlowEntryRequest;
use App\Models\CashFlowEntry;
use Illuminate\Http\Request;

class CashFlowEntryController extends Controller
{
    public function index(Request $request)
    {
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
        $entry = $request->user()->cashFlowEntries()->create($request->validated());

        return response()->json(['data' => $entry], 201);
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
