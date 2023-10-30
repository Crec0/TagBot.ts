export function bitapSearch(text: string, pattern: string): number {
    const m = pattern.length;
    const R: number[] = [];
    const patternMask: number[] = [];
    let patternLastBit: number = 0;

    for ( let i = 0; i < m; i++ ) {
        patternMask[pattern.charCodeAt(i)] |= 1 << i;
    }

    for ( let i = 0; i < text.length; i++ ) {
        let oldR = 0;
        let newR = 0;
        const oldPatternLastBit = patternLastBit;

        patternLastBit = ( patternLastBit << 1 ) | 1;

        R[0] = ( R[0] << 1 ) | 1;

        for ( let j = 0; j < m; j++ ) {
            const charCode = text.charCodeAt(i + j);

            const substitution = ( R[j] | patternLastBit ) & patternMask[charCode];
            const insertion = ( R[j + 1] | patternLastBit ) & patternMask[charCode];
            const deletion = ( oldR | patternLastBit ) & patternMask[charCode];

            newR = ( substitution | ( insertion << 1 ) | ( deletion << 1 ) | 1 ) << 1;

            oldR = R[j + 1];
            R[j + 1] = newR;

            if ( ( newR & ( 1 << m ) ) !== 0 ) {
                return i - m + 1;
            }
        }

        if ( ( newR & 1 ) !== 0 ) {
            return -1;
        }

        patternLastBit = oldPatternLastBit;
    }

    return -1;
}