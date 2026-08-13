<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinancialGoalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'target_amount' => ['required', 'numeric', 'min:0.01'],
            'current_amount' => ['required', 'numeric', 'min:0'],
            'target_date' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Sila masukkan nama matlamat.',
            'target_amount.required' => 'Sila masukkan sasaran jumlah.',
            'target_amount.min' => 'Sasaran mesti lebih daripada RM0.',
            'current_amount.min' => 'Jumlah simpanan tidak boleh negatif.',
            'target_date.date' => 'Tarikh sasaran tidak sah.',
        ];
    }
}
