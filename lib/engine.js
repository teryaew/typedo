var bemNaming = require('bem-naming');
var exec = require('sync-exec');
var fs = require('fs');
var inherit = require('inherit');
var logger = require('./logger');
var path = require('path');
var temp = require('temp');
var util = require('./util');

module.exports = inherit({

    /**
     * Engine class constructor
     *
     * @constructor
     */
    __constructor : function () {
        this._globals = null;
        this._widthHash = {
            1 : 'ultra-condensed',
            2 : 'extra-condensed',
            3 : 'condensed',
            4 : 'semi-condensed',
            5 : 'normal',
            6 : 'semi-expanded',
            7 : 'expanded',
            8 : 'extra-expanded',
            9 : 'ultra-expanded'
        };
    },

    /**
     * Generate global command for checking it existance
     *
     * @see this._commandPath
     *
     * @param  {string} command
     * @return false
     */
    _generateGlobals : function(command) {
        this._globals = {};
        this._globals[command] = this._commandPath(command);

        if (!this._globals[command]) {
            var error = 'Can\'t find required font package: ' + command;
            logger.info(error);
        }
        return false;
    },

    /**
     * Check if command is installed globally
     *
     * @param  {[type]} command [description]
     * @return {string}         [description]
     */
    _commandPath : function(command) {
        var result = exec('which ' + command, { encoding : 'utf8' });
        if (result.status == 0) {
            return result.stdout.trim();
        } else {
            logger.info(command + ' isn\'t installed globally.');
            return false;
        }
    },

    _fontforge : function() {
        var args, script, command, result;

        this._generateGlobals('fontforge');

        args = Array.prototype.slice.call(arguments);
        if (args.length < 1) {
            return false;
        }

        script = '' +
            'import re, sys; ' +
            'filename = unicode(sys.argv[1], "utf8"); ' +
            'escFilename = re.sub(r"&#39;", u"\\u0027", filename); ' +
            'font = fontforge.open(escFilename, 1); ' +
            args.shift();
        command = this._globals.fontforge + ' -lang=py -c \'' + script + '\'';

        args.forEach(function(arg) {
            command += ' \'' + arg.replace(/'/g, '&#39;') + '\'';
        });

        result = exec(command + ' 2> /dev/null', { encoding : 'utf8' });
        if (result.status == 0) {
            return result.stdout.trim();
        } else {
            logger.error(result.stderr);
            return false;
        }
    },

    _woff2 : function(source) {
        var command, result;

        this._generateGlobals('woff2_compress');

        source = util.screenSpaces(source);
        command = this._globals.woff2_compress + ' ' + source;

        result = exec(command + ' 2> /dev/null', { encoding : 'utf8' });
        if (result.status == 0) {
            logger.ok('woff2 \u2714');
            return;
        } else {
            logger.info('woff2 \u2716');
            logger.error(result.sterr);
            return false;
        }
    },

    _ttfautohint : function(source, interim) {
        var command, result, target;

        this._generateGlobals('ttfautohint');

        command = this._globals.ttfautohint + ' ' + util.screenSpaces(source) + ' ' + util.screenSpaces(interim);

        result = exec(command + ' 2> /dev/null', { encoding : 'utf8' });
        if (result.status == 0) {
            // Substitute source by hinted file
            target = source;
            fs.unlinkSync(source);
            fs.renameSync(interim, target);

            logger.ok('ttfautohint \u2714');
            return target;
        } else {
            fs.unlinkSync(interim);

            logger.info('ttfautohint \u2716');
            logger.error(result.stderr);
            return source;
        }
    },

    _embedFont : function(file) {
        var dataUri = fs.readFileSync(file, 'base64');
        var type = path.extname(file).substring(1);
        var fontUrl = 'data:application/x-font-' + type + ';charset=utf-8;base64,' + dataUri;

        fs.unlinkSync(file);
        logger.ok('base64 ' + type + ' \u2714');

        return fontUrl;
    },

    _getBemName : function(typename) {
        var elem = typename.toLowerCase().replace(/\s/g, '-');

        return bemNaming.stringify({
            block : 'font',
            elem : elem
            // modName : 'face',
            // modVal : ''
        });
    },


    getFontInfo : function(source) {
        var command = [
            'print font.fullname',
            'print font.italicangle',
            'print font.os2_weight',
            'print font.os2_width'
        ].join('; ');

        var resultString = this._fontforge(command, source);

        if (resultString) {
            var name, slope, weight, width;
            var resultArray = resultString.split('\n');

            name = util.normalizeName(resultArray[0]);
            slope = (resultArray[1] == 0) ? 'normal' : 'italic';
            weight = resultArray[2];
            width = resultArray[3];

            if (this._widthHash[width]) {
                width = this._widthHash[width];
            }

            return {
                typename : name,
                typeface : {
                    slope : slope,
                    weight : weight,
                    width : width
                }
                // src : source
            };
        } else {
            return false;
        }
    },

    autohintSrcFont : function(config) {
        var interim = path.join(config.targetDir, '_' + config.fileName + config.extension);
        return this._ttfautohint(config.source, interim);
    },

    generateWoff : function(config) {
        return this._fontforge('font.generate("' + config.targetName + '.woff' + '")', config.source);
    },

    generateWoff2 : function(config) {
        return this._woff2(config.source);
    },

    generateCss : function(config) {
        var woff, woff2;

        if (config.embed) {
            woff = this._embedFont(config.woff);
            woff2 = this._embedFont(config.woff2);
        } else if (config.bem) {
            woff = this._getBemName(config.font.typename) + '.woff';
            woff2 = this._getBemName(config.font.typename) + '.woff2';
        } else {
            woff = path.basename(config.woff);
            woff2 = path.basename(config.woff2);
        }

        var result = [
            '@font-face {',
            '    font-family: "' + config.font.typename + '";',
            '    src: url("' + woff2 + '") format("woff2"),',
            '         url("' + woff + '") format("woff");',
            '    font-weight: ' + config.font.typeface.weight + ';',
            '    font-style: ' + config.font.typeface.slope + ';',
            '    font-stretch: ' + config.font.typeface.width + ';',
            '}'
        ].join('\n');

        fs.writeFileSync(config.targetName + '.css', result);

        logger.ok('css \u2714');
        return result;
    },

    fontToBem : function(config) {
        var bemName = this._getBemName(config.font.typename);
        var typename = bemNaming.parse(bemName).elem;
        var blockDir = path.join(config.targetDir, 'font');
        var elemDir = path.join(blockDir, '__' + typename);

        // make 'font' (block) directory
        if (!fs.existsSync(blockDir)) {
            fs.mkdirSync(blockDir);
        }

        // make 'typename' (elem) directory
        if (!fs.existsSync(elemDir)) {
            fs.mkdirSync(elemDir);
        }

        // move all files to /font/__typename
        config.targets.map(function(target) {
            var targetPath = config.targetName + '.' + target;

            // check that target is file (not embedded)
            if (!fs.existsSync(targetPath)) {
                return false;
            }

            var targetExtension = path.extname(targetPath);
            var resultName = bemName + targetExtension;
            var resultPath = path.join(elemDir, resultName);

            fs.renameSync(targetPath, resultPath);
        });

        logger.ok('bem \u2714');
    }

});