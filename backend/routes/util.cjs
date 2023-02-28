
exports.sanitizeDateInput = function(str) {
    let numSec = Date.parse(str);
    if (typeof numSec != 'number') {
        return null;
    }
    if (!isFinite(numSec)) {
        return null;
    }
    let date = new Date(numSec);
    return date.toISOString();
}