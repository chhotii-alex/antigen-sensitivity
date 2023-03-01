# antigen-sensitivity

This consists of two parts, the back-end (running on the server) and the front-end (files that run in the user's browser.

The back-end exposes a few simple API endpoints. It is implemented in Node/Express.

The front-end is implemented in Svelte. See https://svelte.dev/

## HOW-TO, for development

### Set-up
* You need node and npm to run this. On a Mac, try `brew install node`
* Current development is with node version 19.1.0. Check the node version using `node -v`
* `cd` into the `antigen-sensitivity` directory, then `cd` into each of the two directories in turn (`frontend` and
   `backend`. In each, install/update dependencies using `npm install`
* Find out the IP address of where the database is running, and the password for the `webapp` db login
* `cd` into the `backend/routes` directory
* Edit `template.credentials.any.json` and save as `credentials.development.json` 
* Edit `frontend/src/routes/server_url.js` to export the URL for the port that the backend exposes (something like 'http://10.24.66.66:82' where the IP address is 
   the IP address of the machine where you're running this (the port may be overridden if needed by an environment variable))

### Running
* `cd antigen-sentitvity/backend`
* `npm start`
* Open another Terminal session
* `cd antigen-sensitivity/frontend`
* `npm run dev`
* A URL that works locally will appear in the Terminal output, something like `http://localhost:5173/`

Note that frontend and backend do not have to be served from the same machine. As long as frontend knows how to find backend (by editing
`frontend/src/routes/server_url.js`).

# VERY OBSOLETE to-do list below, see GitHub Issues for the current to-do items (see to-do's in shovel repository as well).
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
