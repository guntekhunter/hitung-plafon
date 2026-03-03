/**
 * Material Optimization Algorithm for PVC Ceiling Boards
 * Implements 1D Bin Packing using First Fit Decreasing (FFD) logic.
 * 
 * Target: Minimize total waste and number of boards needed.
 */

export interface BoardOption {
    length: number; // 4 or 6 meters
    count: number;
}

export interface OptimizationResult {
    scenarioName: string;
    boardCount4m: number;
    boardCount6m: number;
    totalWaste: number; // in meters
    efficiency: number; // percentage
    invalidCuts: number[]; // lengths that exceed any available board
}

interface Bin {
    capacity: number;
    remaining: number;
    cuts: number[];
}

/**
 * Core optimization function using First Fit Decreasing (FFD) logic.
 */
export function optimizeCuts(
    requiredCuts: number[],
    allowedLengths: number[]
): OptimizationResult {
    // 1. Sort lengths descending for "Decreasing" part of FFD
    const sortedCuts = [...requiredCuts].sort((a, b) => b - a);
    const maxBoardLength = Math.max(...allowedLengths);

    const validCuts: number[] = [];
    const invalidCuts: number[] = [];

    // Identify cuts that are too long for any available board
    sortedCuts.forEach(cut => {
        if (cut > maxBoardLength) {
            invalidCuts.push(cut);
        } else {
            validCuts.push(cut);
        }
    });

    const bins: Bin[] = [];

    // 2. Process each valid cut (First Fit logic)
    validCuts.forEach(cut => {
        let placed = false;

        // Try to fit in existing bins
        for (const bin of bins) {
            if (bin.remaining >= cut) {
                bin.cuts.push(cut);
                bin.remaining = parseFloat((bin.remaining - cut).toFixed(4));
                placed = true;
                break;
            }
        }

        // 3. If it doesn't fit, open a new bin
        if (!placed) {
            // Pick the best board length for this new cut
            // For FFD with multiple bin sizes: pick the smallest board that fits the current cut
            const bestBoardLength = allowedLengths
                .filter(len => len >= cut)
                .sort((a, b) => a - b)[0];

            if (bestBoardLength) {
                bins.push({
                    capacity: bestBoardLength,
                    remaining: parseFloat((bestBoardLength - cut).toFixed(4)),
                    cuts: [cut]
                });
            }
        }
    });

    // Calculate results
    const boards4m = bins.filter(b => b.capacity === 4).length;
    const boards6m = bins.filter(b => b.capacity === 6).length;

    const totalLengthUsed = bins.reduce((acc, b) => acc + (b.capacity - b.remaining), 0);
    const totalBoardLength = bins.reduce((acc, b) => acc + b.capacity, 0);
    const totalWaste = parseFloat((totalBoardLength - totalLengthUsed).toFixed(4));
    const efficiency = totalBoardLength > 0 ? (totalLengthUsed / totalBoardLength) * 100 : 0;

    return {
        scenarioName: "",
        boardCount4m: boards4m,
        boardCount6m: boards6m,
        totalWaste,
        efficiency,
        invalidCuts
    };
}

/**
 * Compares multiple scenarios (4m only, 6m only, and mixed) 
 * and returns the one with the highest efficiency / lowest waste.
 */
export function runScenarioComparison(requiredCuts: number[]): OptimizationResult {
    const scenarios = [
        { name: "Scenario A: Only 6m", lengths: [6] },
        { name: "Scenario B: Only 4m", lengths: [4] },
        { name: "Scenario C: Mixed 4m + 6m", lengths: [4, 6] }
    ];

    const results = scenarios.map(s => {
        const result = optimizeCuts(requiredCuts, s.lengths);
        return { ...result, scenarioName: s.name };
    });

    // Filter out scenarios that can't fulfill all cuts (if any invalid cuts exist)
    // Usually Scenario A (6m) will have the fewest invalid cuts.
    // We prioritize scenarios with mapping all cuts, then by efficiency.

    const sortedByQuality = results.sort((a, b) => {
        // Primary sort: fewest invalid cuts
        if (a.invalidCuts.length !== b.invalidCuts.length) {
            return a.invalidCuts.length - b.invalidCuts.length;
        }
        // Secondary sort: highest efficiency
        return b.efficiency - a.efficiency;
    });

    return sortedByQuality[0];
}

/**
 * Helper to split long cuts that exceed board length
 * (e.g., a 10m room side needs to be split if board is max 6m)
 */
export function preprocessCuts(cuts: number[], maxLength: number): number[] {
    const results: number[] = [];
    cuts.forEach(cut => {
        let remaining = cut;
        while (remaining > maxLength) {
            results.push(maxLength);
            remaining -= maxLength;
        }
        if (remaining > 0) {
            results.push(parseFloat(remaining.toFixed(4)));
        }
    });
    return results;
}
