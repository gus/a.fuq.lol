# Fuq Docs (a.fuq.lol)

## Development

The `dev.Dockerfile` is provided solely for developing, building, and locally hosting
content as it provides a consistent OS and toolkit. It is not required for production
use. If you have all the tools installed locally, you won't need the docker image.
`dev.Dockerfile` provides the following:

- `make`
- `nodejs` + `npm`
- npm-module: `ugligy-js`
- npm-module: `ugligycss`
- `python3` (for running a static HTTP server)

To get started, ensure you have docker and direnv installed and run the following:

```sh
$ direnv allow .    # ensures bin/ is added to your $PATH
$ dev init
$ dev build
```

If you are using VSCode, you can now attach to the container remotely; though this
is entirely unnecessary. `dev` mounts the repo's dir; any changes you make on your
host or in the container are synced. Otherwise, or regardless, you can open a terminal
and attach to the container:

```sh
$ dev run
# you are logged in
dev@dev:/workspace/dev$ 
```

_You can run `dev run` in as many terminals as you like; subsequent calls will `exec` into
the container._

Next, make the distribution. This distribution is the same regardless of running locally
or in prod.

```sh
dev@...$ make build
```

If you are on linux, you can now also serve content from the `dev` container:

```sh
dev@...$ make server
# url: http://localhost:3456/
...
```

This won't work on OSX becase ... alas ... OSX doesn't allow `-net -host` options when
running a container. If you have `python3` and `make` installed locally, you can run
`make server` from your host machine and things should work just fine.

You'll know things are working if you see the "Hello, World" [doc in your browser](http://localhost:3456/)
and zero errors/warnings in your browser's dev console.

After that, edit away. All source code lives in the `src/` dir. There ain't much and I
trust you'll figure it out so I'm not going to bother with any kind of design thingie.
Any edits you make require you run `make build` again. Feel free to set an `fswatch` if
you like (if I haven't already added it to the Makefile) so builds happen automatically.

## Deployment

This is a **you** problem. I know where I deploy Fuq Docs :)

Everything in the `dist/` dir is all you need. It's not much and it's all relative URLs,
so you should just be able to drop all that anywhere you can serve static content. Don't
just take what's in `src/` as `make build` actually does do some things for you.

## Miscellaneous

Fonts

- Typeface from Google Fonts: Fira Code (monospace), Newsreader (serif), Roboto + Roboto Condensed (sans-serif)
- Icons from custom Fontawesome kit: v5 free icons 