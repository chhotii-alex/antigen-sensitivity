export function expo(x) {
    return Number.parseFloat(x).toExponential(1);
}

export function formatPValue(p) {
    let s = expo(p);
    const r = /(\d\.\d)e([+-]\d+)/
    const match = s.match(r);
    if (!match) return "";
    let result = `(<em>p</em>=${match[1]}x10<sup>${match[2]}</sup>)`;
    return result;
}

export function range(start, stop, step=1) {
    let a = [];
    if (!step) return a; // zero step means empty array, not forever
    for (let x = start; ; x += step) {
        if (step < 0) {
            if (x <= stop) {
                break;
            }
        }
        else {
            if (x >= stop) {
                break;
            }
        }
        a.push(x);
    }
    return a;
}

export function linspace(start, stop, n) {
    if (n < 2) {
        return [start, stop];
    }
    if (stop <= start) {
        return [stop, start];
    }
    let step = (stop-start)/(n-1);
    let a = [];
    for (let x = start, j = 0; j < n; ++j, x += step) {
        a.push(x);
    }
    return a;
}

