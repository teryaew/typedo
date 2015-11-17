'use strict';

var BuildPlatform = require('../build.js');
var coa = require('coa');
var fs = require('fs');
var hash = require('../hash.js');
var path = require('path');
var pkg = require('../../package.json');
var util = require('../util.js');

module.exports = coa.Cmd()
    .name(pkg.name).title(pkg.description)
    .helpful()
    .opt()
        .name('version').title('Version')
        .short('v').long('version')
        .only()
        .flag()
        .act(function() {
            return pkg.version;
        })
        .end()

    // Build subcommand
    .cmd()
        .name('build').title('Build subcommand')
        .helpful()
        .opt()
            .name('input').title('Input file or folder')
            .short('i').long('input')
            .arr()
            .val(function(val) {
                return val || this.reject('Option --input must have a value.');
            })
            .end()
        .opt()
            .name('output').title('Output file or folder')
            .short('o').long('output')
            .val(function(val) {
                return val || this.reject('Option --output must have a value.');
            })
            .end()
        .opt()
            .name('autohint').title('Autohint font option')
            .short('a').long('autohint')
            .val(function(val) {
                return val || this.reject('Option --autohint must have a value.');
            })
            .end()
        .opt()
            .name('bem').title('BEM naming option')
            .short('b').long('bem')
            .val(function(val) {
                return val || this.reject('Option --bem must have a value.');
            })
            .end()
        .opt()
            .name('embed').title('Embedding font option')
            .short('e').long('embed')
            .val(function(val) {
                return val || this.reject('Option --embed must have a value.');
            })
            .end()
        .arg()
            .name('input').title('Input file or folder')
            .arr()
            .end()
        .act(function(opts, args) {
            // Variations:
            // Input: file / Output: dir  | v
            // Input: dir / Output: dir   | v
            // Input: file / Output: dir  | v
            // Input: dir / Output: file  | x

            var input = args.input ? args.input : opts.input;
            var output = args.output ? args.output : opts.output ? opts.output : path.resolve(__dirname, '../..');

            var walkDir = function(dir) {
                var results = [];
                var list = fs.readdirSync(dir);
                list.forEach(function(item) {
                    item = dir + '/' + item;
                    var stat = fs.statSync(item);
                    if (stat && stat.isDirectory()) {
                        // if item is directory — walk through it too
                        results = results.concat(walkDir(item));
                    } else {
                        // select files by proper extnames in hash
                        hash.extnames.map(function(extname) {
                            if (path.extname(item).toLowerCase() === extname) {
                                results.push(item);
                            }
                        });
                    }
                });
                return results;
            };

            // Input
            // condition for filenames with spaces
            var joinedInput = input.join('');
            if (util.existsSync(path.resolve(joinedInput)) && fs.statSync(path.resolve(joinedInput)).isFile()) {
                input = [joinedInput];
            } else {
                input.forEach(function(item) {
                    if (util.existsSync(item)) {
                        if (fs.statSync(item).isDirectory()) {
                            input = walkDir(path.resolve(item));
                        } else {
                            if (!fs.statSync(item).isFile())
                                return this.reject('Input is incorrect.');
                        }
                    } else {
                        return this.reject('Input is incorrect.');
                    }
                }, this);
            }

            // Output
            if (util.existsSync(output)) {
                if (fs.statSync(output).isFile()) {
                    console.log('Warn: Output file is exists!');
                } else if (fs.statSync(output).isDirectory()) {
                    console.log('Warn: Output directory is exists!');
                } else {
                    return this.reject('Output is incorrect.');
                }
            } else {
                fs.mkdirSync(path.resolve(output));
            }

            // Create starting config from opts/args
            var options = {
                input : input,
                output : path.resolve(output),
                autohint : opts.autohint || true,
                bem : opts.bem || true,
                embed : opts.embed || true
            };

            // TODO: Needs checking for file/folder in arguments
            var buildPlatform = new BuildPlatform();

            buildPlatform.init();
            buildPlatform.process(options);
            buildPlatform.getOutput(options.output);
            buildPlatform.destruct();
        })
        .end()

    // Server subcommand
    .cmd()
        .name('server').title('Start webfonts server')
        .act(function(opts, args) {
            console.log(opts);
            console.log(args);
        })
        .end()

    .act(function(opts, args) {
        // Show help if no options/arguments
        if (
            (!opts.input || opts.input === '-') &&
            !opts.string &&
            !opts.stdin &&
            !opts.folder && // ?
            process.stdin.isTTY
        ) return this.usage();
    })

    .run();