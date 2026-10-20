<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->categories()->withCount('products')->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules($request));

        return response()->json($request->user()->categories()->create($data), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $category = $request->user()->categories()->findOrFail($id);
        $category->update($request->validate($this->rules($request, $id)));

        return response()->json($category);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->user()->categories()->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function rules(Request $request, ?int $ignoreId = null): array
    {
        return [
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('categories')->where('user_id', $request->user()->id)->ignore($ignoreId),
            ],
        ];
    }
}
