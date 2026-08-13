<?php

namespace App\Enums;

enum CardStatus: string
{
    case Active = 'active';
    case PlannedTermination = 'planned_termination';
    case Terminated = 'terminated';
}
