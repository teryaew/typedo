var winston = require('winston');
var log = {
    logger : {
        levels : {
            error : 0,
            ok : 1,
            info : 2
        }
    }
};

function getLogger() {
    var logger = new (winston.Logger)({
        'transports': [
            new (winston.transports.Console)({
                level : 'ok',
                showLevel : false // temp. doesn't work in 0.9.0 (https://github.com/winstonjs/winston/issues/557)
            }),
            new (winston.transports.File)({
                filename : './error.log',
                json : false,
                level : 'error',
                maxFiles : 10,
                maxsize : 40000,
                prettyPrint : false,
                silent : false,
                timestamp : true
            })
        ]
    });

    logger.setLevels(log.logger.levels);

    return logger;
}

module.exports = getLogger();