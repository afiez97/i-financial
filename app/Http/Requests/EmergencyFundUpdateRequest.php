<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmergencyFundUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_months' => ['required', 'integer', Rule::in([3, 6])],
            'current_savings' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'target_months.in' => 'Sasaran mesti 3 atau 6 bulan.',
            'current_savings.min' => 'Simpanan tidak boleh negatif.',
        ];
    }
}
