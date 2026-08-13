<?php

namespace App\Enums;

enum DebtType: string
{
    case Ptptn = 'ptptn';
    case CarLoan = 'car_loan';
    case CreditCard = 'credit_card';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Ptptn => 'PTPTN',
            self::CarLoan => 'Pinjaman Kereta',
            self::CreditCard => 'Kad Kredit Lain',
            self::Other => 'Lain-lain',
        };
    }
}
