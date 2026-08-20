<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CardStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'month' => [
                'required', 'integer', 'between:1,12',
                Rule::unique('card_statements')
                    ->where(fn ($q) => $q->where('user_id', $this->user()->id)->where('year', $this->input('year')))
                    ->ignore($this->route('card_statement')),
            ],
            'year' => ['required', 'integer', 'between:2000,2100'],
            'balance' => ['required', 'numeric', 'min:0'],
            'payment_amount' => ['required', 'numeric', 'min:0'],
            'payment_date' => ['nullable', 'date'],
            'payer_name' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:500'],
            'actual_retail_interest' => ['nullable', 'numeric', 'min:0'],
            'actual_late_payment_interest' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'month.between' => 'Bulan mesti antara 1 dan 12.',
            'month.unique' => 'Rekod penyata untuk bulan/tahun ini sudah wujud.',
            'year.between' => 'Tahun tidak sah.',
            'balance.min' => 'Baki tidak boleh negatif.',
            'payment_amount.min' => 'Jumlah bayaran tidak boleh negatif.',
            'note.max' => 'Nota tidak boleh lebih 500 aksara.',
        ];
    }
}
