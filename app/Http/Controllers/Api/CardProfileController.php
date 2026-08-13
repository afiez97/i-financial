<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CardProfileUpdateRequest;
use Illuminate\Http\Request;

class CardProfileController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->cardProfile()->firstOrCreate([], [
            'card_type' => 'classic',
            'balance' => 5500.00,
            'statement_day' => 17,
            'due_day' => 6,
            'payment_amount' => 5000.00,
            'payment_day' => 11,
            'interest_rate' => 15.000,
            'rate_type' => 'annual',
        ]);

        return response()->json(['data' => $profile]);
    }

    public function update(CardProfileUpdateRequest $request)
    {
        $profile = $request->user()->cardProfile()->firstOrNew();
        $profile->fill($request->validated());
        $profile->save();

        return response()->json(['data' => $profile]);
    }
}
