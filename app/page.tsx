'use client';
import dynamic from 'next/dynamic';
import { usePlafonStore } from '@/app/function/usePlafonStore';
import { RefreshCcw, Box, ArrowDownToLine, Maximize, Layers, Palette, ArrowRightLeft } from 'lucide-react';

// Dynamically import Canvas (No SSR)
const CanvasEditor = dynamic(() => import('@/app/component/CanvasEditor'), {
  ssr: false,
  loading: () => <div className="h-[600px] bg-slate-100 animate-pulse rounded-lg">Loading Canvas...</div>
});

export default function PlafonCalculator() {
  const {
    calculateMaterials, reset, isClosed,
    dropDepth, setDropDepth,
    edgeOffset, setEdgeOffset,
    ceilingType, setCeilingType,
    secondEdgeOffset, setSecondEdgeOffset,
    primaryColor, secondaryColor, setColors,
    primaryTexture, secondaryTexture, setTextures,
    direction, setDirection
  } = usePlafonStore();

  const results = calculateMaterials();

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Aplikasi Hitung Pevesindo</h1>
          <p className="text-slate-500">Silahkan Gambar Dibawah</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Canvas */}
          <div className="lg:col-span-2">
            <CanvasEditor />
            <div className="mt-4 flex gap-4 text-sm text-slate-600">
              {/* <span>Skala: 50px = 1 Meter</span> */}
              <button
                onClick={reset}
                className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium ml-auto"
              >
                <RefreshCcw size={16} /> Reset Gambar
              </button>
            </div>
          </div>

          {/* Right Column: Controls & Results */}
          <div className="space-y-6">

            {/* NEW: Color & Texture Visualization Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
                <Palette size={20} className="text-sky-600" /> Visualization & Pattern
              </h3>

              <div className="space-y-4">
                {/* Direction Control */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Panel Direction</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setDirection('horizontal')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-all ${direction === 'horizontal'
                        ? 'bg-white shadow text-slate-800'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Horizontal
                    </button>
                    <button
                      onClick={() => setDirection('vertical')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-all ${direction === 'vertical'
                        ? 'bg-white shadow text-slate-800'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Vertical
                    </button>
                  </div>
                </div>
                {/* Level 1 Control */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-500">Level 1 (Main/Border)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Color:</span>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setColors(e.target.value, secondaryColor)}
                        className="h-6 w-6 rounded cursor-pointer border-none p-0"
                      />
                    </div>
                  </div>

                  {/* Texture Grid */}
                  <div className="grid grid-cols-8 gap-2 p-2 bg-slate-50 rounded border border-slate-100 max-h-[120px] overflow-y-auto">
                    <button
                      onClick={() => setTextures('', secondaryTexture)}
                      className={`aspect-square rounded border-2 flex items-center justify-center bg-white text-[10px] text-slate-400 ${!primaryTexture ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      None
                    </button>
                    {Array.from({ length: 22 }, (_, i) => `${i + 1}.png`).map((tex) => (
                      <button
                        key={tex}
                        onClick={() => setTextures(tex, secondaryTexture)}
                        className={`aspect-square rounded border-2 bg-cover bg-center transition-all ${primaryTexture === tex ? 'border-sky-500 ring-1 ring-sky-500 scale-105' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        style={{ backgroundImage: `url(/texture/${tex})` }}
                        title={tex}
                      />
                    ))}
                  </div>
                </div>

                {/* Level 2 Control */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-500">Level 2 (Drop/Inner)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Color:</span>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setColors(primaryColor, e.target.value)}
                        className="h-6 w-6 rounded cursor-pointer border-none p-0"
                      />
                    </div>
                  </div>

                  {/* Texture Grid */}
                  <div className="grid grid-cols-8 gap-2 p-2 bg-slate-50 rounded border border-slate-100 max-h-[120px] overflow-y-auto">
                    <button
                      onClick={() => setTextures(primaryTexture, '')}
                      className={`aspect-square rounded border-2 flex items-center justify-center bg-white text-[10px] text-slate-400 ${!secondaryTexture ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      None
                    </button>
                    {Array.from({ length: 22 }, (_, i) => `${i + 1}.png`).map((tex) => (
                      <button
                        key={tex}
                        onClick={() => setTextures(primaryTexture, tex)}
                        className={`aspect-square rounded border-2 bg-cover bg-center transition-all ${secondaryTexture === tex ? 'border-sky-500 ring-1 ring-sky-500 scale-105' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        style={{ backgroundImage: `url(/texture/${tex})` }}
                        title={tex}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Select a texture or color for each ceiling level.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ArrowDownToLine size={20} /> Pilihan Model
              </h3>

              {/* Ceiling Type Selector */}
              <div className="mb-6 p-1 bg-slate-100 rounded-lg flex gap-1">
                {(['flat', 'drop1', 'drop2'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCeilingType(type)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${ceilingType === type
                      ? 'bg-white shadow text-slate-800'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {type === 'flat' && 'Flat'}
                    {type === 'drop1' && 'Drop 1'}
                    {type === 'drop2' && 'Drop 2'}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tinggi Trap (Meters)</label>
                <input
                  type="number"
                  step="0.01"
                  value={dropDepth}
                  onChange={(e) => setDropDepth(parseFloat(e.target.value))}
                  disabled={ceilingType === 'flat'}
                  className="w-full p-2 border rounded-md disabled:opacity-50"
                />
                <p className="text-xs text-slate-400 mt-1">tinggi trap (e.g. 0.15m)</p>
              </div>

              {ceilingType !== 'flat' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Tebal Trap 1 (Meters)</label>
                  <div className="flex items-center gap-2">
                    <Maximize size={16} className="text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={edgeOffset}
                      onChange={(e) => setEdgeOffset(parseFloat(e.target.value))}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
              )}

              {ceilingType === 'drop2' && (
                <div>
                  <label className="block text-sm font-medium mb-2">tebal Trap 2 (Middle) Width</label>
                  <div className="flex items-center gap-2">
                    <Maximize size={16} className="text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={secondEdgeOffset}
                      onChange={(e) => setSecondEdgeOffset(parseFloat(e.target.value))}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Ukuran Trap 2</p>
                </div>
              )}
            </div>

            {/* Results Card */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Box /> Kebutuhan Material
              </h3>

              {!isClosed ? (
                <div className="text-slate-400 italic">Silahkan Gambar Dibawah...</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span>Total Area</span>
                    <span className="font-mono">{results.area.toFixed(2)} m²</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span>Lis Dinding (4m)</span>
                    <span className="font-mono text-yellow-400">{results.lisDindingCount} pcs</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span>Lis Siku (4m)</span>
                    <span className="font-mono text-yellow-400">{results.lisSikuCount} pcs</span>
                  </div>

                  {ceilingType !== 'flat' && (
                    <div className="pl-4 text-sm text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>• Level 1 (Border)</span>
                        <span className="font-mono">{results.level1Area.toFixed(2)} m²</span>
                      </div>
                      {ceilingType === 'drop2' && (
                        <div className="flex justify-between">
                          <span>• Level 2 (Middle)</span>
                          <span className="font-mono">{results.level2Area.toFixed(2)} m²</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>• {ceilingType === 'drop2' ? 'Level 3 (Center)' : 'Level 2 (Center)'}</span>
                        <span className="font-mono">{ceilingType === 'drop2' ? results.level3Area.toFixed(2) : results.level2Area.toFixed(2)} m²</span>
                      </div>
                    </div>
                  )}

                  {ceilingType !== 'flat' && (
                    <div className="flex justify-between border-b border-slate-700 pb-2">
                      <span>Vertical Drop Strip Area</span>
                      <span className="font-mono text-sky-400">{results.dropMaterialArea.toFixed(2)} m²</span>
                    </div>
                  )}

                  {/* SPLIT MATERIAL RESULTS */}
                  <div className="pt-4">
                    <h4 className="text-sky-400 font-semibold mb-2">Estimasi Per Material:</h4>

                    {/* Primary Material */}
                    <div className="mb-4">
                      <div className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: primaryColor, backgroundImage: primaryTexture ? `url(/texture/${primaryTexture})` : 'none', backgroundSize: 'cover' }}
                        />
                        Material 1 (Level 1 {ceilingType === 'drop2' && '+ Level 3'})
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800 p-2 rounded">
                          <span className="text-xs block text-slate-500">Papan 4m</span>
                          <span className="text-lg font-bold">{results.primaryUsage.boards4m}</span>
                        </div>
                        <div className="bg-slate-800 p-2 rounded">
                          <span className="text-xs block text-slate-500">Papan 6m</span>
                          <span className="text-lg font-bold">{results.primaryUsage.boards6m}</span>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Material (Only if Drops exist) */}
                    {ceilingType !== 'flat' && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-white/20"
                            style={{ backgroundColor: secondaryColor, backgroundImage: secondaryTexture ? `url(/texture/${secondaryTexture})` : 'none', backgroundSize: 'cover' }}
                          />
                          Material 2 (Level 2 + Drops)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-800 p-2 rounded">
                            <span className="text-xs block text-slate-500">Papan 4m</span>
                            <span className="text-lg font-bold">{results.secondaryUsage.boards4m}</span>
                          </div>
                          <div className="bg-slate-800 p-2 rounded">
                            <span className="text-xs block text-slate-500">Papan 6m</span>
                            <span className="text-lg font-bold">{results.secondaryUsage.boards6m}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                      <span className="text-sm font-semibold">Total Boards Needed:</span>
                      <div className="text-right">
                        <div className="text-sm"><span className="text-sky-400 font-bold">{results.boards4m}</span> pcs (4m)</div>
                        <div className="text-sm"><span className="text-sky-400 font-bold">{results.boards6m}</span> pcs (6m)</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                      *Estimasi kasar berdasarkan rasio luas area.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}