<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CardStatementRequest;
use App\Models\CardProfile;
use App\Models\CardStatement;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class CardStatementController extends Controller
{
    public function index(Request $request)
    {
        $statements = $request->user()->cardStatements()
            ->orderByDesc('year')->orderByDesc('month')
            ->get();

        return response()->json(['data' => $this->withEstimates($statements, $request->user()->cardProfile)]);
    }

    public function store(CardStatementRequest $request)
    {
        $statement = $request->user()->cardStatements()->create($request->validated());

        return response()->json(['data' => $this->appendEstimates($statement, $request->user()->cardProfile)], 201);
    }

    public function update(CardStatementRequest $request, CardStatement $card_statement)
    {
        $card_statement->update($request->validated());

        return response()->json(['data' => $this->appendEstimates($card_statement, $request->user()->cardProfile)]);
    }

    public function destroy(CardStatement $card_statement)
    {
        $card_statement->delete();

        return response()->json(status: 204);
    }

    /** Attach the dynamic interest estimate for a whole collection, fetching the card profile once. */
    private function withEstimates(Collection $statements, ?CardProfile $cardProfile): Collection
    {
        return $statements->map(fn (CardStatement $statement) => $this->appendEstimates($statement, $cardProfile));
    }

    private function appendEstimates(CardStatement $statement, ?CardProfile $cardProfile): array
    {
        return [
            ...$statement->toArray(),
            'estimated_retail_interest' => $cardProfile?->estimateRetailInterest(
                (float) $statement->balance,
                (float) $statement->payment_amount,
                $statement->month,
                $statement->year,
                $statement->payment_date,
            ) ?? 0.0,
            'estimated_late_payment_interest' => $cardProfile?->estimateLatePaymentInterest(
                (float) $statement->balance,
                $statement->month,
                $statement->year,
                $statement->payment_date,
            ) ?? 0.0,
        ];
    }
}
