<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DebtRequest;
use App\Models\Debt;
use Illuminate\Http\Request;

class DebtController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->debts()->get()]);
    }

    public function store(DebtRequest $request)
    {
        return response()->json(['data' => $request->user()->debts()->create($request->validated())], 201);
    }

    public function show(Debt $debt)
    {
        return response()->json(['data' => $debt]);
    }

    public function update(DebtRequest $request, Debt $debt)
    {
        $debt->update($request->validated());

        return response()->json(['data' => $debt]);
    }

    public function destroy(Debt $debt)
    {
        $debt->delete();

        return response()->json(status: 204);
    }
}
