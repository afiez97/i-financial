<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EmergencyFundUpdateRequest;
use Illuminate\Http\Request;

class EmergencyFundController extends Controller
{
    public function show(Request $request)
    {
        $fund = $request->user()->emergencyFund()->firstOrCreate([], [
            'target_months' => 6,
            'current_savings' => 0,
        ]);

        return response()->json(['data' => $fund]);
    }

    public function update(EmergencyFundUpdateRequest $request)
    {
        $fund = $request->user()->emergencyFund()->firstOrNew();
        $fund->fill($request->validated());
        $fund->save();

        return response()->json(['data' => $fund]);
    }
}
