<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'Pautan tidak sah.',
            'email.required' => 'Sila masukkan alamat e-mel.',
            'email.email' => 'Alamat e-mel tidak sah.',
            'password.required' => 'Sila masukkan kata laluan.',
            'password.confirmed' => 'Pengesahan kata laluan tidak sepadan.',
        ];
    }
}
