# antigen-sensitivity

## HOW-TO

* You need node and npm to run this. On a Mac, try `brew install node`
* Current development is with node version 19.1.0. Check the node version using `node -v`
* `cd` into the `antigen-sensitivity` directory, and install/update dependencies using `npm install`

## TO-DO list, sort-of catagorized and sort-of sorted:

# MUST DO items:
- HTML page title (trivial).
- Use our *real* *actual* database schema. Depends on progress of shovel.
- Put in some actual antigen tests and their actual sensitivity(vl) functions. Depends on Ramy having some time available to explain this.
- Implment Download (just bin summaries 'til new IRB)
- Header, footer; sidebar maybe? Links to textual information? Waiting for specifications for this.

# Nice to do:
- Revisit media queries i.e. iPhone layout
- Make layout of query controls nice, not messy.
- Make web page style consistent with Arnaout Lab website.
- Allow CORS to open up API

# Extra credit:
- drop-down list of variants' date ranges (according to covarients.org data for Massachusetts), populates date range fields
- Allow splitting of population by more than on variable
- More filters that can be applied wrt what patients included in data set
- Some patients in database have more than one positive result. Do we worry at all about the statistical non-independene?
- Use "import" not "require" (type of JS module)
- Make color selection sensible?
- Refactor -> shorter functions
