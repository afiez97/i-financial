<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FinancialAdviceController extends Controller
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
        Jawab HANYA dalam Bahasa Malaysia. Anda seorang penasihat kewangan peribadi yang membantu
        pengguna memahami kedudukan kewangan mereka berdasarkan data yang diberikan. Berikan
        cadangan yang spesifik, praktikal dan boleh diambil tindakan berdasarkan angka sebenar
        yang dibekalkan — jangan beri nasihat generik. Jangan beri cadangan pelaburan spesifik
        (saham, crypto, unit amanah). Fokus pada pengurusan hutang, tabung kecemasan, dan disiplin
        perbelanjaan. Format jawapan sebagai senarai bullet ringkas (3-5 bullet), setiap satu 1-2 ayat.
        PROMPT;

    public function generate(Request $request)
    {
        $apiKey = config('services.gemini.api_key');
        if (! $apiKey) {
            return response()->json([
                'message' => 'Ciri Nasihat AI belum ditetapkan — GEMINI_API_KEY belum dikonfigurasikan.',
            ], 503);
        }

        $snapshot = $this->buildSnapshot($request->user());
        $model = config('services.gemini.model');

        try {
            $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
                ->timeout(30)
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                    'systemInstruction' => ['parts' => [['text' => self::SYSTEM_PROMPT]]],
                    'contents' => [[
                        'role' => 'user',
                        'parts' => [[
                            'text' => "Berikut data kewangan saya (JSON):\n".json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
                                ."\n\nBerikan 3-5 cadangan kewangan yang spesifik dan boleh diambil tindakan berdasarkan data ini.",
                        ]],
                    ]],
                    'generationConfig' => ['maxOutputTokens' => 800],
                ]);
        } catch (ConnectionException $e) {
            Log::warning('Gemini API connection failed: '.$e->getMessage());

            return response()->json(['message' => 'Gagal menghubungi perkhidmatan AI. Sila cuba lagi.'], 502);
        }

        if ($response->failed()) {
            Log::warning('Gemini API request failed', ['status' => $response->status(), 'body' => $response->body()]);

            return response()->json(['message' => 'Gagal mendapatkan nasihat AI. Sila cuba lagi.'], 502);
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');
        if (! $text) {
            return response()->json(['message' => 'Tidak dapat menjana nasihat buat masa ini. Sila cuba lagi.'], 502);
        }

        return response()->json(['data' => ['advice' => trim($text)]]);
    }

    private function buildSnapshot(User $user): array
    {
        $cardProfile = $user->cardProfile;
        $debts = $user->debts;
        $emergencyFund = $user->emergencyFund;

        $currentMonth = (int) now()->format('n');
        $currentYear = (int) now()->format('Y');
        $entriesThisMonth = $user->cashFlowEntries()
            ->where('month', $currentMonth)
            ->where('year', $currentYear)
            ->get();
        $income = (float) $entriesThisMonth->where('type', 'income')->sum('amount');
        $expense = (float) $entriesThisMonth->where('type', 'expense')->sum('amount');

        $debtsMinTotal = (float) $debts->sum('minimum_payment');
        $uobMin = $cardProfile ? max(((float) $cardProfile->balance) * 0.05, 50) : 0;
        $totalObligations = $debtsMinTotal + $uobMin;
        $dtiPercent = $income > 0 ? round(($totalObligations / $income) * 100, 1) : null;

        return [
            'kad_uob_one' => $cardProfile ? [
                'jenis' => $cardProfile->card_type->value,
                'baki' => (float) $cardProfile->balance,
                'kadar_faedah' => (float) $cardProfile->interest_rate,
                'jenis_kadar' => $cardProfile->rate_type->value,
                'status' => $cardProfile->status->value,
                'tarikh_sasaran_terminate' => $cardProfile->termination_target_date?->format('Y-m-d'),
            ] : null,
            'aliran_tunai_bulan_ini' => [
                'bulan' => now()->translatedFormat('F Y'),
                'pendapatan' => $income,
                'perbelanjaan' => $expense,
                'baki_bersih' => round($income - $expense, 2),
            ],
            'hutang_lain' => $debts->map(fn ($d) => [
                'nama' => $d->name,
                'baki' => (float) $d->balance,
                'kadar_faedah_setahun' => (float) $d->interest_rate,
                'bayaran_minimum' => (float) $d->minimum_payment,
            ])->values()->all(),
            'nisbah_dti_peratus' => $dtiPercent,
            'tabung_kecemasan' => [
                'sasaran_bulan' => $emergencyFund?->target_months ?? 6,
                'simpanan_semasa' => (float) ($emergencyFund?->current_savings ?? 0),
            ],
        ];
    }
}
