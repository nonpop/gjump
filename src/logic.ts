type Match = {
    rangeIndex: number;
    offsetIntoRangeText: number;
};

function equalMatches(a: Match, b: Match): boolean {
    return a.rangeIndex === b.rangeIndex && a.offsetIntoRangeText === b.offsetIntoRangeText;
}

function getMatchesByPrefix(rangeTexts: string[], needle: string): Map<string, Match[]> {
    const matchesByPrefix = new Map<string, Match[]>();
    rangeTexts.forEach((text, index) => {
        for (let i = 0; i < text.length; i++) {
            for (let j = 1; j <= needle.length; j++) {
                if (i+j > text.length) {
                    break;
                }
                const prefix = needle.slice(0, j);
                if (text.slice(i, i+j) === prefix) {
                    if (!matchesByPrefix.has(prefix)){
                        matchesByPrefix.set(prefix, []);
                    }
                    matchesByPrefix.get(prefix)!.push({ rangeIndex: index, offsetIntoRangeText: i });
                }
            }
        }
    });
    return matchesByPrefix;
}

function getLabelableMatches(availableLabels: string[], matchesByPrefix: Map<string, Match[]>, needle: string): Match[] {
    for (let j = 1; j <= needle.length; j++) {
        const prefix = needle.slice(0, j);
        const matches = matchesByPrefix.get(prefix);
        if (matches !== undefined && matches.length <= availableLabels.length) {
            return matches;
        }
    }
    return [];
}

type LabeledMatch = {
    rangeIndex: number;
    offsetIntoRangeText: number;
    label: string;
};

function getLabeledMatches(availableLabels: string[], labelableMatches: Match[], targetableMatches: Match[]): LabeledMatch[] {
    const labeledMatches = [];
    for (let i = 0; i < labelableMatches.length; i++) {
        const match = labelableMatches[i];
        if (targetableMatches.some((targetable) => equalMatches(match, targetable))) {
            const label = availableLabels[i];
            labeledMatches.push({ ...match, label });
        }
    }
    return labeledMatches;
}

type Matches = {
    labeledMatches: LabeledMatch[];
    totalMatches: number;
};

export function getMatches(availableLabels: string[], rangeTexts: string[], needle: string): Matches {
    const matches = getMatchesByPrefix(rangeTexts, needle);
    const labelableMatches = getLabelableMatches(availableLabels, matches, needle);
    const targetableMatches = matches.get(needle) ?? [];
    const labeledMatches = getLabeledMatches(availableLabels, labelableMatches, targetableMatches);
    return { labeledMatches, totalMatches: targetableMatches.length };
}
