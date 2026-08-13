<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Sila masukkan nama anda.',
            'email.required' => 'Sila masukkan alamat e-mel.',
            'email.email' => 'Alamat e-mel tidak sah.',
            'email.unique' => 'E-mel ini sudah didaftarkan.',
            'password.required' => 'Sila masukkan kata laluan.',
            'password.confirmed' => 'Pengesahan kata laluan tidak sepadan.',
        ];
    }
}
