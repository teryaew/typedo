var connect = require('connect');
var fs = require('fs');
var inherit = require('inherit');
var BuildPlatform = require('./build');
var path = require('path');
var qs = require('qs');


module.exports = inherit({

    init : function(options) {
        this._port = options.port;
        this._host = options.host;
        this._source = options.source;
        this._options = options;
    },

    run : function() {
        var _this = this;
        var app = connect();

        app.use(this.middleware(_this._options));

        process.on('uncaughtException', function (err) {
            console.log(err.stack);
        });

        var socket = 'http://' + _this._host + ':' + _this._port;
        app.listen(_this._port, _this._host, function() {
            return console.log('Server started at ' + socket);
        });
    },

    middleware : function(options) {
        var buildPlatform = new BuildPlatform();

        return function(req, res, next) {
            var reqData = qs.parse(req.url.substr(1));

            if (!reqData.fonts) {
                console.log('Invalid request. Please check fonts in config.');
                return false;
            } else if (!reqData.properties) {
                console.log('Invalid request. Please check properties in config.');
                return false;
            }

            var config = {
                fonts : reqData.fonts,
                props : reqData.properties
            };

            buildPlatform.init(this._source);
            buildPlatform.processing(config);

            var resultFile = buildPlatform.outputFile();
            var resultFileName = path.basename(resultFile);

            res.statusCode = 200;
            res.setHeader('Content-disposition', 'attachment; filename=' + resultFileName);
            res.setHeader('Content-type', 'application/zip');

            var filestream = fs.createReadStream(resultFile);
            filestream.pipe(res);

            buildPlatform.destruct();

            res.end();
            next();
        };
    }
});