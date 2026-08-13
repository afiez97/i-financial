<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RecurringTransactionRequest;
use App\Models\RecurringTransaction;
use Illuminate\Http\Request;

class RecurringTransactionController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->recurringTransactions()->get()]);
    }

    public function update(RecurringTransactionRequest $request, RecurringTransaction $recurring_transaction)
    {
        $recurring_transaction->update($request->validated());

        return response()->json(['data' => $recurring_transaction]);
    }

    public function destroy(RecurringTransaction $recurring_transaction)
    {
        $recurring_transaction->delete();

        return response()->json(status: 204);
    }
}
