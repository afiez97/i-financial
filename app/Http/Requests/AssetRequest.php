<?php

namespace App\Http\Requests;

use App\Enums\AssetCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class AssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', new Enum(AssetCategory::class)],
            'current_value' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Sila masukkan nama aset.',
            'current_value.required' => 'Sila masukkan nilai semasa.',
            'current_value.min' => 'Nilai tidak boleh negatif.',
        ];
    }
}
