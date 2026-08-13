<?php

namespace App\Http\Requests;

use App\Enums\CashFlowCategory;
use App\Enums\CashFlowType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

class CashFlowEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'month' => ['required', 'integer', 'between:1,12'],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'type' => ['required', new Enum(CashFlowType::class)],
            'category' => ['required', new Enum(CashFlowCategory::class)],
            'label' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'month.between' => 'Bulan mesti antara 1 dan 12.',
            'amount.min' => 'Jumlah tidak boleh negatif.',
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
