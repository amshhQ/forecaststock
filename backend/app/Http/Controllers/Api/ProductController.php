<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'sort' => ['nullable', Rule::in(['name', 'sku', 'current_stock', 'min_stock'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = $request->user()->products()->with('category:id,name')
            ->orderBy($request->query('sort', 'name'), $request->query('direction', 'asc'))
            ->orderBy('id');

        if ($search = trim((string) $request->query('q'))) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"));
        }
        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        return response()->json($query->get());
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($request->user()->products()->with('category:id,name')->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $product = $request->user()->products()->create($request->validate($this->rules($request)));

        return response()->json($product->load('category:id,name'), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $product = $request->user()->products()->findOrFail($id);
        $product->update($request->validate($this->rules($request, $id)));

        return response()->json($product->load('category:id,name'));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $request->user()->products()->findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function rules(Request $request, ?int $ignoreId = null): array
    {
        $userId = $request->user()->id;

        return [
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('user_id', $userId)],
            'sku' => ['required', 'string', 'max:50', Rule::unique('products')->where('user_id', $userId)->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:150'],
            'unit' => ['required', 'string', 'max:20'],
            'current_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
            'min_stock' => ['required', 'integer', 'min:0', 'max:1000000'],
        ];
    }
}
