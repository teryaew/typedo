var _ = require('lodash');
var fs = require('fs');
var exports = {};

exports.isInArray = function(value, array) {
    return array.indexOf(value) > -1;
};

exports.normalizeName = function(name) {
    var result = name.replace(/([a-z](?=[A-Z]))/g, '$1 ');
    return _.startCase(result);
};

exports.screenSpaces = function(val) {
    return val.replace(/ /g, '\\ ');
};

exports.toBoolean = function(val) {
    return /true/i.test(val);
};

exports.existsSync = fs.existsSync || function existsSync(val) {
    try {
        fs.statSync(val);
    } catch(err) {
        if (err.code === 'ENOENT') return false;
    }
    return true;
}

module.exports = exports;