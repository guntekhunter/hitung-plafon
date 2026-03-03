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
    shapes, activeShapeId, addShape, deleteShape, setActiveShape,
    updateShapeProperty, calculateMaterials, reset,
    boardPreference, setBoardPreference
  } = usePlafonStore();

  const results = calculateMaterials();
  const activeShape = shapes.find(s => s.id === activeShapeId) || shapes[0];

  const updateActiveProperty = (prop: string, val: any) => {
    if (activeShape) updateShapeProperty(activeShape.id, prop, val);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Aplikasi Hitung Pevesindo</h1>
            <p className="text-slate-500">Plafon & Material Calculator</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addShape('room')}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition flex items-center gap-2"
            >
              <Box size={18} /> + Add Room
            </button>
            <button
              onClick={() => addShape('trap')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition flex items-center gap-2"
            >
              <Layers size={18} /> + Add Trap
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Canvas & Shape List */}
          <div className="lg:col-span-2 space-y-6">
            <CanvasEditor />

            {/* Shape List / Management */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 px-2">Daftar Bidang (Shapes)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {shapes.map((s, idx) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveShape(s.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center ${s.id === activeShapeId ? 'border-sky-500 bg-sky-50' : 'border-slate-100 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${s.type === 'room' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>
                        {s.type === 'room' ? <Box size={16} /> : <Layers size={16} />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{s.type === 'room' ? 'Ruangan' : 'Trap Manual'} {idx + 1}</div>
                        <div className="text-[10px] text-slate-500">{s.points.length} Titik • {s.isClosed ? 'Selesai' : 'Belum Selesai'}</div>
                      </div>
                    </div>
                    {shapes.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteShape(s.id); }}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <RefreshCcw size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 text-sm text-slate-600">
              <button
                onClick={reset}
                className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium ml-auto"
              >
                <RefreshCcw size={16} /> Reset Semua
              </button>
            </div>
          </div>

          {/* Right Column: Controls & Results */}
          <div className="space-y-6">

            {/* Shape Settings */}
            {activeShape && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-800">
                  <Palette size={20} className="text-sky-600" />
                  Pengaturan: {activeShape.type === 'room' ? 'Ruangan' : 'Trap'}
                </h3>

                <div className="space-y-5">
                  {/* Common: Direction */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Arah Panel</label>
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                      {(['horizontal', 'vertical'] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => updateActiveProperty('direction', d)}
                          className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${activeShape.direction === d ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                        >
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Room Specific: Ceiling Model */}
                  {activeShape.type === 'room' && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Model Plafon</label>
                        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                          {(['flat', 'drop1', 'drop2'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => updateActiveProperty('ceilingType', type)}
                              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${activeShape.ceilingType === type ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {activeShape.ceilingType !== 'flat' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tebal Trap 1</label>
                            <input
                              type="number" step="0.05"
                              value={activeShape.edgeOffset}
                              onChange={(e) => updateActiveProperty('edgeOffset', parseFloat(e.target.value))}
                              className="w-full p-2 text-sm border rounded-md"
                            />
                          </div>
                          {activeShape.ceilingType === 'drop2' && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tebal Trap 2</label>
                              <input
                                type="number" step="0.05"
                                value={activeShape.secondEdgeOffset}
                                onChange={(e) => updateActiveProperty('secondEdgeOffset', parseFloat(e.target.value))}
                                className="w-full p-2 text-sm border rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Vertical Depth */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      {activeShape.type === 'room' ? 'Tinggi Drop' : 'Tinggi Trap (Vertical)'}
                    </label>
                    <div className="flex items-center gap-2">
                      <ArrowDownToLine size={16} className="text-slate-400" />
                      <input
                        type="number" step="0.01"
                        value={activeShape.dropDepth}
                        onChange={(e) => updateActiveProperty('dropDepth', parseFloat(e.target.value))}
                        className="w-full p-2 text-sm border rounded-md"
                      />
                    </div>
                  </div>

                  {/* Simple Texture Toggle for active shape */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Tekstur Utama</label>
                    <div className="grid grid-cols-6 gap-1">
                      {Array.from({ length: 12 }, (_, i) => `${i + 1}.png`).map((tex) => (
                        <button
                          key={tex}
                          onClick={() => updateActiveProperty('primaryTexture', tex)}
                          className={`aspect-square rounded border-2 bg-cover bg-center transition-all ${activeShape.primaryTexture === tex ? 'border-sky-500 scale-110' : 'border-slate-100'}`}
                          style={{ backgroundImage: `url(/texture/${tex})` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Card */}
            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border-t-4 border-sky-500">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Box className="text-sky-400" /> Ringkasan Material
              </h3>

              <div className="space-y-6">
                {/* Board Preference */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Pilihan Panjang Papan</label>
                  <div className="flex p-1 bg-slate-800 rounded-lg gap-1 border border-slate-700">
                    {(['4m', '6m', 'both'] as const).map((pref) => (
                      <button
                        key={pref}
                        onClick={() => setBoardPreference(pref)}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all ${boardPreference === pref ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {pref.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Luas Flat</div>
                    <div className="text-xl font-mono text-white">{results.totalArea.toFixed(2)}m²</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Luas Drop</div>
                    <div className="text-xl font-mono text-sky-400">{results.totalVerticalArea.toFixed(2)}m²</div>
                  </div>
                </div>

                {/* Lis Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm p-2 bg-slate-800/30 rounded border border-slate-700/50">
                    <span className="text-slate-300 italic">Lis Dinding (4m)</span>
                    <span className="font-mono text-yellow-400 font-bold">{results.totalLisDinding} btg</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-2 bg-slate-800/30 rounded border border-slate-700/50">
                    <span className="text-slate-300 italic">Lis Siku / Drop (4m)</span>
                    <span className="font-mono text-yellow-400 font-bold">{results.totalLisSiku} btg</span>
                  </div>
                </div>

                {/* Helper for Part Optimization Result */}
                {(() => {
                  const renderOpt = (title: string, opt: any, color: string) => (
                    <div className={`pt-4 border-t border-slate-800`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className={`text-xs font-bold text-${color}-400 uppercase tracking-wider underline decoration-${color}-500/30 underline-offset-4`}>{title}</div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${opt.efficiency > 90 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {opt.efficiency.toFixed(1)}% Efisien
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Board Counts */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-400 mb-1">PAPAN 4M</div>
                            <div className="text-2xl font-bold font-mono">{opt.boardCount4m} <span className="text-xs font-normal text-slate-500">btg</span></div>
                          </div>
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-400 mb-1">PAPAN 6M</div>
                            <div className="text-2xl font-bold font-mono">{opt.boardCount6m} <span className="text-xs font-normal text-slate-500">btg</span></div>
                          </div>
                        </div>

                        {/* Waste Summary */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-dashed border-slate-700">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Total Sampah (Waste)</span>
                            <span className="font-mono text-red-400">{opt.totalWaste.toFixed(2)}m</span>
                          </div>
                          {opt.invalidCuts.length > 0 && (
                            <div className="mt-2 text-[10px] text-amber-500 font-bold bg-amber-500/10 p-2 rounded">
                              ⚠️ Warning: {opt.invalidCuts.length} potongan melebihi panjang papan! Butuh sambungan.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-6">
                      {renderOpt("Bagian Luar (Flat Utama)", results.outerOptimization, "sky")}
                      {renderOpt("Bagian Dalam (Drop/Trap)", results.innerOptimization, "amber")}
                    </div>
                  );
                })()}

                <div className="text-[10px] text-slate-500 text-center leading-relaxed">
                  *Optimasi dihitung terpisah untuk setiap bagian untuk kemudahan pemasangan.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
