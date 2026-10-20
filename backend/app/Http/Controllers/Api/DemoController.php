<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoController extends Controller
{
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->email === DatabaseSeeder::DEMO_EMAIL, 403, 'Reset hanya tersedia untuk akun demo.');

        (new DatabaseSeeder)->seedDemoData($user);

        return response()->json(['message' => 'Data demo dikembalikan ke kondisi awal.']);
    }
}
