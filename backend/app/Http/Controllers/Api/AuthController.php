<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            ...StoreController::storeRules(),
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create($data);
            foreach (config("business.types.{$data['business_type']}.categories") as $name) {
                $user->categories()->create(['name' => $name]);
            }

            return $user;
        });

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => self::userData($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Email atau password salah.']);
        }

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => self::userData($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(self::userData($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil logout']);
    }

    public static function userData(User $user): array
    {
        return [
            ...$user->only('id', 'name', 'email', 'store_name', 'business_type'),
            'business_label' => config("business.types.{$user->business_type}.label"),
            'units' => config("business.types.{$user->business_type}.units", []),
            'is_demo' => $user->email === DatabaseSeeder::DEMO_EMAIL,
        ];
    }
}
