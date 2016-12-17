var math = require('mathjs');
var randGen = require('randgen');

var randomProbList = function (num) {
    L = []
    for (var i = 0; i < num; i++) {
        L.push(math.random());
    }
    sum = math.sum(L);
    for (var i = 0; i < L.length; i++) {
        L[i] = L[i] / sum;
    }
    return L;
}

var nonRandomProbList = function (num) {
    var L = new Array(num);
    for (var i = 0; i < num; i++)
        L[i] = 1.0 / num;
    return L;
}

var randomChoice = function (List) {
    var rand = List[Math.floor(Math.random() * List.length)];
    return rand;
}

var range = function (start, end, step) {
    var range = [];
    var typeofStart = typeof start;
    var typeofEnd = typeof end;
    
    if (step === 0) {
        throw TypeError("Step cannot be zero.");
    }
    
    if (typeofStart == "undefined" || typeofEnd == "undefined") {
        throw TypeError("Must pass start and end arguments.");
    } else if (typeofStart != typeofEnd) {
        throw TypeError("Start and end arguments must be of same type.");
    }
    
    typeof step == "undefined" && (step = 1);
    
    if (end < start) {
        step = -step;
    }
    if (typeofStart == "number") {
        while (step > 0 ? end >= start : end <= start) {
            range.push(start);
            start += step;
        }
    } else if (typeofStart == "string") {
        if (start.length != 1 || end.length != 1) {
            throw TypeError("Only strings with one character are supported.");
        }
        
        start = start.charCodeAt(0);
        end = end.charCodeAt(0);
        
        while (step > 0 ? end >= start : end <= start) {
            range.push(String.fromCharCode(start));
            start += step;
        }

    } else {
        throw TypeError("Only string and number types are supported");
    }
    return range;
}

var getColVector = function (matrix, index) {
    var rows = math.size(matrix).valueOf()[0];
    return math.flatten(math.subset(matrix, math.index(range(0, rows - 1, 1), index)));
}

var getRowVector = function (matrix, index) {
    var cols = math.size(matrix).valueOf()[1];
    return math.flatten(math.subset(matrix, math.index(index, range(0, cols - 1, 1))));
}

var argmax = function (vector) {
    var array = vector._data;
    var maxIdx = -1;
    var maxValue = -10000;
    for (var i = 0; i < array.length; i++) {
        if (array[i] > maxValue) {
            maxIdx = i;
            maxValue = array[i];
        }
    }
    return maxIdx;
}

var getRandomFromProbDist = function (probList, valuesList) {
    var rand = math.random();
    console.log(rand);
    for (var i = 0; i < probList.length; i++) {
        if (rand < probList[i]) {
            return valuesList[i];
        }
        rand -= probList[i];
    }
    return "null";
}

exports.randomProbList = randomProbList
exports.nonRandomProbList = nonRandomProbList
exports.randomChoice = randomChoice
exports.range = range
exports.getColVector = getColVector
exports.getRowVector = getRowVector
exports.argmax = argmax
exports.getRandomFromProbDist = getRandomFromProbDist