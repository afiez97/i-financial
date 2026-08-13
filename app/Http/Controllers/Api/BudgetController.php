<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BudgetRequest;
use App\Models\Budget;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->budgets()->get()]);
    }

    public function store(BudgetRequest $request)
    {
        return response()->json(['data' => $request->user()->budgets()->create($request->validated())], 201);
    }

    public function show(Budget $budget)
    {
        return response()->json(['data' => $budget]);
    }

    public function update(BudgetRequest $request, Budget $budget)
    {
        $budget->update($request->validated());

        return response()->json(['data' => $budget]);
    }

    public function destroy(Budget $budget)
    {
        $budget->delete();

        return response()->json(status: 204);
    }
}
