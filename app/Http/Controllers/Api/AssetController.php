<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssetRequest;
use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->assets()->get()]);
    }

    public function store(AssetRequest $request)
    {
        return response()->json(['data' => $request->user()->assets()->create($request->validated())], 201);
    }

    public function show(Asset $asset)
    {
        return response()->json(['data' => $asset]);
    }

    public function update(AssetRequest $request, Asset $asset)
    {
        $asset->update($request->validated());

        return response()->json(['data' => $asset]);
    }

    public function destroy(Asset $asset)
    {
        $asset->delete();

        return response()->json(status: 204);
    }
}
