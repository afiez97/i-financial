<?php

namespace App\Http\Requests;

use App\Enums\CashFlowCategory;
use App\Enums\CashFlowType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BudgetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $expenseCategories = array_map(fn (CashFlowCategory $c) => $c->value, CashFlowCategory::forType(CashFlowType::Expense));

        return [
            'category' => [
                'required',
                Rule::in($expenseCategories),
                Rule::unique('budgets')
                    ->where(fn ($query) => $query->where('user_id', $this->user()->id))
                    ->ignore($this->route('budget')),
            ],
            'monthly_limit' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'category.required' => 'Sila pilih kategori.',
            'category.in' => 'Kategori mesti kategori perbelanjaan yang sah.',
            'category.unique' => 'Had perbelanjaan untuk kategori ini sudah wujud.',
            'monthly_limit.required' => 'Sila masukkan had bulanan.',
            'monthly_limit.min' => 'Had mesti lebih daripada RM0.',
        ];
    }
}
