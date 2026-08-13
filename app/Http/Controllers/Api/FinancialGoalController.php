<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FinancialGoalRequest;
use App\Models\FinancialGoal;
use Illuminate\Http\Request;

class FinancialGoalController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->financialGoals()->get()]);
    }

    public function store(FinancialGoalRequest $request)
    {
        return response()->json(['data' => $request->user()->financialGoals()->create($request->validated())], 201);
    }

    public function show(FinancialGoal $financialGoal)
    {
        return response()->json(['data' => $financialGoal]);
    }

    public function update(FinancialGoalRequest $request, FinancialGoal $financialGoal)
    {
        $financialGoal->update($request->validated());

        return response()->json(['data' => $financialGoal]);
    }

    public function destroy(FinancialGoal $financialGoal)
    {
        $financialGoal->delete();

        return response()->json(status: 204);
    }
}
