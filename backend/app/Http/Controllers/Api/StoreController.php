<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StoreController extends Controller
{
    public function businessTypes(): JsonResponse
    {
        $types = collect(config('business.types'))
            ->map(fn (array $type, string $value) => ['value' => $value, 'label' => $type['label'], 'units' => $type['units']])
            ->values();

        return response()->json($types);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validate([
            'name' => ['required', 'string', 'max:100'],
            ...self::storeRules(),
        ]));

        return response()->json(AuthController::userData($user));
    }

    public static function storeRules(): array
    {
        return [
            'store_name' => ['required', 'string', 'max:100'],
            'business_type' => ['required', Rule::in(array_keys(config('business.types')))],
        ];
    }
}
