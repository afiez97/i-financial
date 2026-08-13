<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\CardProfileController;
use App\Http\Controllers\Api\CashFlowEntryController;
use App\Http\Controllers\Api\DebtController;
use App\Http\Controllers\Api\EmergencyFundController;
use App\Http\Controllers\Api\FinancialAdviceController;
use App\Http\Controllers\Api\FinancialGoalController;
use App\Http\Controllers\Api\RecurringTransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::get('/card-profile', [CardProfileController::class, 'show']);
    Route::put('/card-profile', [CardProfileController::class, 'update']);

    Route::get('/emergency-fund', [EmergencyFundController::class, 'show']);
    Route::put('/emergency-fund', [EmergencyFundController::class, 'update']);

    Route::apiResource('cash-flow-entries', CashFlowEntryController::class)
        ->only(['index', 'store', 'update', 'destroy'])
        ->parameters(['cash-flow-entries' => 'cash_flow_entry']);

    Route::apiResource('debts', DebtController::class);

    Route::apiResource('assets', AssetController::class);

    Route::apiResource('budgets', BudgetController::class);

    Route::apiResource('recurring-transactions', RecurringTransactionController::class)
        ->only(['index', 'update', 'destroy'])
        ->parameters(['recurring-transactions' => 'recurring_transaction']);

    Route::apiResource('financial-goals', FinancialGoalController::class)
        ->parameters(['financial-goals' => 'financial_goal']);

    Route::post('/financial-advice', [FinancialAdviceController::class, 'generate'])
        ->middleware('throttle:10,1');
});
