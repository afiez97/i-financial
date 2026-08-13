<?php

namespace App\Enums;

enum AssetCategory: string
{
    case Savings = 'savings';
    case Asb = 'asb';
    case Stocks = 'stocks';
    case Property = 'property';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Savings => 'Simpanan',
            self::Asb => 'ASB/ASNB',
            self::Stocks => 'Saham/Unit Amanah',
            self::Property => 'Hartanah',
            self::Other => 'Lain-lain',
        };
    }
}
