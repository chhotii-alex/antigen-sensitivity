# antigen-sensitivity

The COVIRAL webapp consists of two parts, the back-end (running on the server) and the front-end (files that run in the user's browser).

The back-end, which exposes a few simple API endpoints, is currently to be found in the separate
antigen-flask repo. See https://github.com/chhotii-alex/antigen-flask
Note that the Node/Express version of the back-end in this repo is **OBSOLETE**.

This repo contains the front-end, implemented in Svelte. See https://svelte.dev/ for more information about
Svelte.

## HOW-TO, for development

### Set-up
* You need node and npm to run this. On a Mac, try `brew install node`
* Current development is with node version 19.1.0. Check the node version using `node -v`
* `cd` into the `antigen-sensitivity` directory, then `cd` into `frontend`.
  From there install/update dependencies using `npm install`

### Running/development
* `cd antigen-sensitivity/frontend`
* `npm run dev`
* A URL that works locally will appear in the Terminal output, something like `http://localhost:5173/`

### Deployment
* `cd antigen-sensitivity/frontend`
* `npm run build`
* Copy ENTIRE contents of `frontend/build/` directory (build products that are created in the command above)
   to your website
Note: The build command blows away the exsting contents of the build directory, including the file named
.htaccess. You may need the .htaccess file for deployment to an Apache server, otherwise Apache may not
attach the appropriate content-type header to .mjs files. 
