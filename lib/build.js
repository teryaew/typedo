var AdmZip = require('adm-zip');
var chalk = require('chalk');
var fs = require('fs');
var glob = require('glob');
var inherit = require('inherit');
var lodash = require('lodash');
var logger = require('./logger');
var mkdirp = require('mkdirp');
var path = require('path');
var ProgressBar = require('progress');
var temp = require('temp').track();
var util = require('./util.js');

var Engine = require('./engine');
var engine = new Engine();

module.exports = inherit({

    __constructor : function() {
        this.config = {};
    },

    init : function() {
        this._tmpDir = temp.mkdirSync();
        this._rootDir = path.join(path.resolve(__dirname), '..');
        logger.info('Temporary directory is: ' + this._tmpDir);
    },

    destruct : function() {
        temp.cleanupSync();
    },


    // for server only!
    // findReqFonts : function() {
    //     var srcFonts = this._getSrcFonts(srcPath);
    //     var pickedSrcFonts = this._findEqual(income.fonts, srcFonts);

    //     if (!pickedSrcFonts) {
    //         return false;
    //     } else {
    //         return pickedSrcFonts;
    //     }
    // },

    configure : function(options, src) {
        var _ = this.config;

        _.source = this._duplicateSrcFont(src);
        _.font = engine.getFontInfo(_.source);
        _.extension = path.extname(_.source);
        _.fileName = path.basename(_.source, _.extension);
        _.targetDir = this._tmpDir;
        _.targetName = path.join(_.targetDir, _.fileName);
        _.woff2 = true;
        _.woff = true;
        _.css = true;
        _.targets = ['woff2', 'woff', 'css'];
        _.bem = util.toBoolean(options.bem) || true;
        _.embed = util.toBoolean(options.embed) || true;
        _.hinted = util.toBoolean(_.autohint) || true;
    },

    process : function(options) {
        options.input.forEach(function(item) {
            this.configure(options, item);
            this._processFont();
        }, this);
    },

    getResultArchive : function() {
        var resultArchive = this._tmpDir + '/font.zip';

        var zip = new AdmZip();
        zip.addLocalFolder(this._tmpDir);
        zip.writeZip(resultArchive);
        logger.ok('zip: \u2714');

        return resultArchive;
    },

    getOutput : function(output) {
        var resultArchive = this.getResultArchive();
        var resultFileName = path.basename(resultArchive);

        fs.renameSync(resultArchive, path.join(output, resultFileName));
    },

    // Build or read config from source files
    // _getSrcFonts : function() {
    //     var srcListFile = path.join(this._rootDir, 'list.json');
    //     var srcDir = path.join(this._rootDir, 'src');
    //     var searchPattern = srcDir + '/**/*(*.ttf|*.ttc|*.otf|*.woff|*.pfb|*.fon)';
    //     var fontFiles = glob.sync(searchPattern,
    //         {
    //             nocase : true,
    //             nodir : true
    //         }
    //     );

    //     if (!fs.existsSync(srcListFile)) {
    //         if (!fontFiles.length) {
    //             logger.info('Can\'t find any files in /src for building source list.');
    //             return false;
    //         }
    //         this._generateSrcList(fontFiles);
    //     }
    //     return JSON.parse(fs.readFileSync(srcListFile, 'utf8'));
    // },

    // Generate source list
    // _generateSrcList : function(fontFiles) {
    //     logger.info('Generating source list. It could take awhile...');

    //     var bar = new ProgressBar(':percent |:bar| :title', {
    //         complete : chalk.green('\u25CF'),
    //         incomplete : chalk.gray('\u25CB'),
    //         width : 20,
    //         total : fontFiles.length
    //     });
    //     var barTimer = function (typename) {
    //         bar.tick(1, { title : !!typename ? typename : chalk.red('Error!') });
    //         if (bar.complete) logger.info('Source list is ready!');
    //     };

    //     var fonts = [];
    //     fontFiles.map(function(fontFile) {
    //         var fontInfo = engine.getFontInfo(fontFile);

    //         barTimer(fontInfo.typename);

    //         if (fontInfo) {
    //             return fonts.push(fontInfo);
    //         } else {
    //             return false;
    //         }
    //     });

    //     fs.writeFileSync(
    //         path.join(this._rootDir, 'list.json'),
    //         JSON.stringify(fonts, null, 4),
    //         'utf-8'
    //     );
    // },

    // Compare for equality of request fonts and source fonts
    // _findEqual : function(reqFonts, srcFonts) {
    //     var result = [];

    //     for (var ir = 0; ir < reqFonts.length; ir++) {
    //         for (var is = 0; is < srcFonts.length; is++) {
    //             var reqFont = reqFonts[ir];
    //             var srcFont = srcFonts[is].typename;

    //             if (lodash.isEqual(reqFont, srcFont)) {
    //                 result.push(srcFonts[is]);
    //             }
    //         }
    //     }

    //     if (result.length) {
    //         return result;
    //     } else {
    //         logger.info('Can\'t find any suitable font in sources.');
    //         return false;
    //     }
    // },


    // Process picked font
    _processFont : function() {
        var _ = this.config;

        if (_.hinted) {
            _.source = engine.autohintSrcFont(_);
        }

        if (_.woff2) engine.generateWoff2(_);
        if (_.woff) engine.generateWoff(_);
        if (_.css) engine.generateCss(_);

        // Eliminate dupl before bem/zipping
        this._removeDuplicate(_.source);

        if (_.bem) engine.fontToBem(_);
    },

    // Duplicate source font for comfy and safety following generation
    _duplicateSrcFont : function(source) {
        var duplPath = path.join(this._tmpDir, path.basename(source));
        fs.writeFileSync(duplPath, fs.readFileSync(source));
        return duplPath;
    },

    // Close out duplicate
    _removeDuplicate : function(file) {
        return fs.unlinkSync(file);
    }

});