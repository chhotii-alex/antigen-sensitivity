# Svelte frontend for "Learning from COVID-19 Viral Loads"

Everything that runs at the client (browser) end of things.

## Development

Unlike traditional web development, in a Svelte project, HTML, CSS,  and JavaScript
are combined into the same file. See the tutorial link below regarding the format
of `.svelte` files.

Run `npm run dev` in a Terminal and open the URL given there. You can see your changes
update every time you save files, very nifty!

However, if using Emacs to edit `.svelte` files, be sure that Emacs is configured to put autosave
and backup files in another directory; otherwise, the Vite server will keep crashing the
app, very annoying.

## Testing a Production Build

To prove that the app runs when served from Apache, I have created a Dockerfile to create
an Apache container. Run these in the Terminal:

`npm run build`
`docker build -t my-apache2 .`
`docker run -dit --name my-running-app -p 8080:80 my-apache2`

The app will then be available at `http:\\localhost:8080`.

## Deployment

This is confugured for "static site generation". See https://kit.svelte.dev/docs/adapter-static
Thus, the build products should run on a vanilla un-fancy web server such as Apache (possibly with
some twiddling, see below).

To deploy:
* Make sure that `src/routes/server_url.js` is edited to export the URL at which `backend` is running.
* Run, in this directory, `npm run build`
* Upload the contents of `./build/` to the web server.

The site might not work with an error in the console of something like this:
`Failed to load module script: The server responded with a non-JavaScript MIME type of "".
Strict MIME type checking is enforced for module scripts per HTML spec.`

This is because, weirdly enough, in 2023, we seem to not be able to count on either Apache or
nginx to know what `Content-Type` to apply to files with the `.mjs` extension. Things to do
to try to fix this problem, if it occurs (this is assuming that the host is running Apache):

1) **Make sure** that the file named `.htaccess` in the `build` directory got uploaded along with the
rest of the files. Hopefully Apache is configured to not ignore that. If that doesn't work...
2) Maintainers of the Apache installation can add the following line to the `conf/mime.types`:
`text/javascript					js mjs`
Not only *can* they, but they *should*. I cannot fathom why this is missing from, for, example,
the default Docker container for Apache, given that this change was merged in long before the
release of the current version of Apache, supposedly; see
https://github.com/apache/httpd/pull/318/commits/223bb1a713533d517679a65073a2e4b612a1da08
for evidence of this.
3) If (1) doesn't work and the sysadmins won't listen to us regarding (2), then perhaps
we resort to hosting the `.mjs` files elsewhere, and manually editing the build to retrive
those from elsewhere. This would probably be terrible for performance, though. Hopefully
it does not come to this.

**Note** that there may be additional configuration tweaking required to run the app from
a subdomain or a subdirectory.

# Original README from project set-up:
# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
