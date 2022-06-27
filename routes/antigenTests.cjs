
class Assay {
    positiveCount(viralLoadLog, totalCount) {
        return 0;
    }

    negativeCount(viralLoadLog, totalCount) {
        return totalCount - this.positiveCount(viralLoadLog, totalCount);
    }

    distinguishedCatagories() {
        return {"negatives" : null,
        "positives" : null};
    }
}


/* All this is completely fictitous math. Will have to find out from Ramy 
how to actually calculate % antigen positive/negative for each antigen test. 
Just a placeholder, to test the rest of the infrastructure... */
class AcmeAssay extends Assay {
    positiveCount(log, count) {
        if (log < 3) {
            return 0;
          }
          else if (log > 8) {
            return count;
          }
          else {
            return Math.round(count * (log - 3) * 0.2);
          }
    }
    distinguishedCatagories() {
        return {"negatives" : "Antigen negatives",
        "positives" : "Antigen positives"};
    }
}

class OtherAssay extends AcmeAssay {
    positiveCount(log, count) {
        if (log < 2) {
            return 0;
        }
        else if (log > 9) {
            return count;
        }
        else {
            return Math.round(count * (log - 2) * 0.1);
        }
    }
}

exports.assayForIdentifier = function(id) {
    if (id === undefined) {
        return new Assay();
    }
    else if (id == 1) {
        return new AcmeAssay();
    }
    else if (id == 2) {
        return new OtherAssay();
    }
}
