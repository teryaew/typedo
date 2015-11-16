# Typedo

Webfonts preparing tool on Node.js

```sh
$ [sudo] npm install -g typedo
```

## Input file types

TTF, OTF, FON

## Output file types

WOFF, WOFF2, CSS

## Required system packages

* [fontforge](http://fontforge.github.io)

```
brew install fontforge --with-x11
```

* [ttfautohint](http://www.freetype.org/ttfautohint/doc/ttfautohint.html#compilation-and-installation) (optional)

```
brew install ttfautohint --with-qt
```

* [woff2](https://github.com/google/woff2) (optional)

```
brew install bramstein/webfonttools/woff2
```

## Usage

```
Usage:
  typedo [SUBCOMMAND] [OPTIONS] [ARGS]

Subcommands:
  typedo build
  typedo server (WIP)

Options:
  -h, --help : Help
  -v, --version : Version
  -i INPUT, --input=INPUT : Input file or folder
  -o OUTPUT, --output=OUTPUT : Output (destination) folder

Arguments:
  INPUT : Alias to --input
  OUTPUT : Alias to --output
```

* with files:

```
$ typedo build test.ttf
$ typedo build -i test.ttf
$ typedo build -i test.ttf -o path/to/output/folder
```

* with folder:

```
$ typedo build -i path/to/input/folder
```