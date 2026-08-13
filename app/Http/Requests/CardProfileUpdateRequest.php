<?php

namespace App\Http\Requests;

use App\Models\CardProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CardProfileUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'card_type' => ['required', Rule::in(['classic', 'platinum'])],
            'balance' => ['required', 'numeric', 'min:0'],
            'statement_day' => ['required', 'integer', 'between:1,31'],
            'due_day' => ['required', 'integer', 'between:1,31'],
            'payment_amount' => ['required', 'numeric', 'min:0'],
            'payment_day' => ['required', 'integer', 'between:1,31'],
            'interest_rate' => ['required', 'numeric', 'min:0'],
            'rate_type' => ['required', Rule::in(['annual', 'monthly'])],
            'status' => ['required', Rule::in(['active', 'planned_termination', 'terminated'])],
            'termination_target_date' => ['nullable', 'date', 'required_unless:status,active'],
            'termination_note' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'statement_day.between' => 'Tarikh penyata mesti antara 1 dan 31.',
            'due_day.between' => 'Tarikh akhir bayaran mesti antara 1 dan 31.',
            'payment_day.between' => 'Tarikh bayaran dibuat mesti antara 1 dan 31.',
            'balance.min' => 'Baki tidak boleh negatif.',
            'payment_amount.min' => 'Jumlah bayaran tidak boleh negatif.',
            'termination_target_date.required_unless' => 'Sila masukkan tarikh sasaran.',
            'termination_note.max' => 'Nota tidak boleh lebih 500 aksara.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $matches = collect(CardProfile::RATE_PRESETS)->contains(
                fn ($preset) => (float) $preset['interest_rate'] === (float) $this->input('interest_rate')
                    && $preset['rate_type'] === $this->input('rate_type')
            );

            if (! $matches) {
                $validator->errors()->add(
                    'interest_rate',
                    'Kadar faedah mesti salah satu daripada: 15% setahun, 18% setahun, atau 2.0% sebulan.'
                );
            }
        });
    }
}
