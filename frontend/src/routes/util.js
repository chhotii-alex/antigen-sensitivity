
import { interpolateViridis, interpolateInferno,
         interpolateBuGn } from 'd3-scale-chromatic';

function scalePValue(p) {
    if (p < 0.0) {
        p = 0.0;
    }
    p = -Math.log10(p)/10;
    if (p < 0.0) p = 0.0;
    if (p > 1.0) p = 1.0;
    return p;
}

export function colorForPValue(p) {
    return interpolateInferno(scalePValue(p));
}

export function textColorForPValue(p) {
    p = scalePValue(p);
    if (p < 0.75) {
        return 'white';
    }
    else {
        return 'black';
    }
}

export function expo(x, decimalPlaces = 1) {
    return Number.parseFloat(x).toExponential(decimalPlaces);
}

export function formatPValue(p) {
    let s = formatSciNot(p, 1);
    return `(<em>p</em>=${s})`;
}

export function formatSciNot(num, places) {
    if (num >= 0.01 && num <= 1) {
        return num.toFixed(2);
    }
    let s = expo(num, places);
    const r = /(\d\.\d)e([+-])(\d+)/
    const match = s.match(r);
    if (!match) return "";
    let exp = Number.parseInt(match[3]);
    if (exp == 0) {
        return Number.parseFloat(num).toFixed(places);
    }
    let sign = match[2];
    if (sign == '+') {
        sign = '';
    }
    let result = `${match[1]}x10<sup class="exponent">${sign}${exp}</sup>`;
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

export function addAlpha(color, alpha) {
    const re = /rgb\((\d+),(\d+),(\d+)\)/;
    const found = color.match(re);
    if (!found) {
        throw new Error("Color specification does not match pattern.");
    }
    let r = found[1];
    let g = found[2];
    let b = found[3];
    return `rgba(${r},${g},${b},${alpha})`;
}   

