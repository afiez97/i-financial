<?php

namespace App\Http\Requests;

use App\Enums\CashFlowCategory;
use App\Enums\CashFlowType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

class RecurringTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', new Enum(CashFlowType::class)],
            'category' => ['required', new Enum(CashFlowCategory::class)],
            'label' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.min' => 'Jumlah mesti lebih daripada RM0.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $type = CashFlowType::tryFrom($this->input('type'));
            $category = CashFlowCategory::tryFrom($this->input('category'));

            if ($type && $category && ! in_array($category, CashFlowCategory::forType($type), true)) {
                $validator->errors()->add('category', 'Kategori tidak sepadan dengan jenis (pendapatan/perbelanjaan).');
            }
        });
    }
}
