<?php

namespace App\Enums;

enum CashFlowCategory: string
{
    case Salary = 'salary';
    case SideHustle = 'side_hustle';
    case OtherIncome = 'other_income';
    case Rent = 'rent';
    case Bills = 'bills';
    case Groceries = 'groceries';
    case Petrol = 'petrol';
    case Insurance = 'insurance';
    case Dining = 'dining';
    case Grab = 'grab';
    case OtherExpense = 'other_expense';

    /** @return CashFlowCategory[] */
    public static function forType(CashFlowType $type): array
    {
        return $type === CashFlowType::Income
            ? [self::Salary, self::SideHustle, self::OtherIncome]
            : [self::Rent, self::Bills, self::Groceries, self::Petrol, self::Insurance, self::Dining, self::Grab, self::OtherExpense];
    }

    /** The 4 categories used by the annual-fee retail-spend projection. */
    public static function retailSpend(): array
    {
        return [self::Petrol, self::Groceries, self::Dining, self::Grab];
    }

    /** Malay display label for the frontend. */
    public function label(): string
    {
        return match ($this) {
            self::Salary => 'Gaji',
            self::SideHustle => 'Side-hustle',
            self::OtherIncome => 'Pendapatan Lain',
            self::Rent => 'Sewa',
            self::Bills => 'Bil',
            self::Groceries => 'Makanan/Runcit',
            self::Petrol => 'Petrol',
            self::Insurance => 'Insurans',
            self::Dining => 'Dining',
            self::Grab => 'Grab',
            self::OtherExpense => 'Lain-lain',
        };
    }
}
