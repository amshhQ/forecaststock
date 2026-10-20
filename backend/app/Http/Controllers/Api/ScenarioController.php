<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ScenarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->scenarios()->with('category:id,name')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($request->user()->scenarios()->create($request->validate($this->rules($request)))->load('category:id,name'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $scenario = $request->user()->scenarios()->findOrFail($id);
        $scenario->update($request->validate($this->rules($request)));

        return response()->json($scenario->load('category:id,name'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->user()->scenarios()->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function rules(Request $request): array
    {
        return [
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('user_id', $request->user()->id)],
            'name' => ['required', 'string', 'max:100'],
            'adjustment_percent' => ['required', 'numeric', 'between:-100,500'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
