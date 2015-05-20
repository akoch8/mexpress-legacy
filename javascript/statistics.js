function pAdjust(p, method) {

    // This function corrects p values using the user-specified method.
    // Currently, it only supports the Benjamini-Hochberg method ('bh').

    // get the length of the p values array and use it to create an index array (1-based!)
    if (method === "bh") {
        var n = p.length;
        var i = [];
        for (var c = n; c > 0; c--) {
            i.push(c);
        }
        var pValues = [];
        for (var c = 0; c < n; c++) {
            pValues[c] = [p[c], c];
        }
        // sort the p values
        var pValuesSorted = nestedArraySort(pValues, true, 0);
        var cumMin;
        for (var c = 0; c < n; c++) {
            var x = pValuesSorted[c][0]*n/i[c];
            if (c !== 0) {
                if (x < cumMin) {
                    cumMin = x;
                } else {
                    x = cumMin;
                }   
            } else {
                cumMin = x;
            }
            if (x > 1) {
                x = 1;
            }
            pValuesSorted[c][0] = x;
        }
        // put the adjusted p values back in their original order
        pValuesSorted = nestedArraySort(pValuesSorted, false, 1);
        result = [];
        for (var i = 0; i < pValuesSorted.length; i++) {
            result.push(pValuesSorted[i][0]);
        }
        return result;
    }

}

function pearsonCorrelation(x, y) {
    
    // This function calculates the Pearson correlation coefficient between two arrays.
    
    // check if the arrays have the same length
    if (x.length !== y.length) {
        return "failed";
    }
    // check if there are any missing values and remove them from both arrays if there are
    var newX = [];
    var newY = [];
    for (var p in y) {
        if (!isNaN(y[p]) && !isNaN(x[p])) {
            newY.push(+y[p]);
            newX.push(+x[p]);
        }
    }
    if (newY.length > 10) {
        // we have enough methylation and expression values to calculate the correlation value
        var n = newY.length;
        var xSum = 0;
        var ySum = 0;
        var xSquaredSum = 0;
        var ySquaredSum = 0;
        var xyProd = 0;
        for (var p in newY) {
            xSum += newX[p];
            xSquaredSum += Math.pow(newX[p], 2);
            ySum += newY[p];
            ySquaredSum += Math.pow(newY[p], 2);
            xyProd += newX[p]*newY[p];
        }
        var numerator = xyProd - xSum*ySum/n;
        var denominator = Math.sqrt(xSquaredSum - Math.pow(xSum, 2)/n)*(Math.sqrt(ySquaredSum - Math.pow(ySum, 2)/n));
        var r = numerator/denominator;
        //return r;
        // calculate the significance of the correlation value
        // 1. calculate the t statistic
        var df = newY.length - 2;
        var t = Math.abs(r/(Math.sqrt((1 - Math.pow(r, 2))/df)));
        // 2. look up the p value using the t distribution
        var p = tDistribution(df, t);
        return {
            r: r,
            p: p
        };
    } else {
        return "failed";
    }
    
}

function mean(x) {
    
    // This function calculates the mean of an array of numeric values.

    var n = x.length;
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum += x[i];
    }
    var m = sum/n;
    return m;
    
}

function variance(x) {
    
    // This function calculates the variance of an array of numeric values.

    var n = x.length;
    var m = mean(x);
    var diff = 0;
    for (var i = 0; i < n; i++) {
        diff += Math.pow((x[i] - m), 2);
    }
    var v = diff/n;
    return v;
    
}

function degreesOfFreedom(x, y) {
    
    // This function calculates the number of degrees of freedom using Welch's formula.
    
    // number of elements in array1
    var nx = x.length;
    // number of elements in array2
    var ny = y.length;
    // variance of array1
    var xVar = variance(x);
    // variance of array2
    var yVar = variance(y);
    var numerator = Math.pow((xVar/nx + yVar/ny), 2);
    var denominator = (Math.pow(xVar/nx, 2)/(nx - 1)) + (Math.pow(yVar/ny, 2)/(ny - 1));
    var df = numerator/denominator;
    return df;
    
}

function tDistribution(df, t) {
    
    // This function returns a p value range based on a supplied number of degrees of freedom
    // and t value and on the t distribution.

    /****************
    *** calculate the p value using the numerical approximation
    *****************/
    // Abramowitz, M and Stegun, I. A. (1970), Handbook of Mathematical
    // Functions With Formulas, Graphs, and Mathematical Tables, NBS Applied
    // Mathematics Series 55, National Bureau of Standards, Washington, DC.
    // p 932: function 26.2.19
    // p 949: function 26.7.8
    var a1 = 0.049867347;
    var a2 = 0.0211410061;
    var a3 = 0.0032776263;
    var a4 = 0.0000380036;
    var a5 = 0.0000488906;
    var a6 = 0.000005383;
    var x = t*(1 - 1/(4*df))/Math.sqrt(1 + Math.pow(t, 2)/(2*df));
    var p = 2*(1/(2*Math.pow(1 + a1*x + a2*Math.pow(x, 2) + a3*Math.pow(x, 3) + a4*Math.pow(x, 4) + a5*Math.pow(x, 5) + a6*Math.pow(x, 6), 16)));
    return p;
    
}

function tTest(x, y) {
    
    // This function perform's a Welch's t-test.
    
    // check whether the arrays contain more than just NaN values
    for (var a in x) {
        if (isNaN(x[a])) {
            x[a] = null;
        }
    }
    for (var a in y) {
        if (isNaN(y[a])) {
            y[a] = null;
        }
    }
    if (!x.some(function(a){ return a !== null })) {
        return "failed";
    } else if (!y.some(function(a){ return a !== null })) {
        return "failed";
    } else {
        // number of elements in array1
        var nx = x.length;
        // number of elements in array2
        var ny = y.length;
        if (nx >= 3 && ny >= 3) {
            // mean of array1
            var xMean = mean(x);
            // mean of array2
            var yMean = mean(y);
            // variance of array1
            var xVar = variance(x);
            // variance of array2
            var yVar = variance(y);
            // t statistic
            var t = (xMean - yMean)/(Math.sqrt(xVar/nx + yVar/ny));
            t = Math.abs(t);
            // degrees of freedom
            var df = degreesOfFreedom(x, y);
            var answer = tDistribution(df, t);
            return answer;
        } else {
            return "failed";
        }
    }
    
}


function nestedArraySort(x, descending, sortIndex) {
    
    // This function sorts an array of nested arrays on the first element of each nested array.

    if (descending) {
        x.sort(function(a,b) {
            a = a[sortIndex];
            b = b[sortIndex];
            return a === b ? 0 : (a > b ? -1 : 1);
        });
    } else {
        x.sort(function(a,b) {
            a = a[sortIndex];
            b = b[sortIndex];
            return a === b ? 0 : (a < b ? -1 : 1);
        });
    }
    return x;
    
}

function wilcoxonRankSumTest(xInput, yInput) {
    
    // This function calculates the Wilcoxon-rank sum test for two arrays.
    
    var x = [];
    var y = [];
    for (var a in xInput) {
        if (xInput[a] && xInput[a] !== "null") {
            x.push(+xInput[a]);
        }
    }
    for (var a in yInput) {
        if (yInput[a] && yInput[a] !== "null") {
            y.push(+yInput[a]);
        }
    }
    var nx = x.length;
    var ny = y.length;
    if (nx < 3 || ny < 3) {
        return "failed";
    } else {
        var n = nx + ny;
        var m = nx*ny/2;
        var s = Math.sqrt(nx*ny*(nx + ny + 1)/12);
        var xy = [];
        for (var a in x) {
            xy.push([x[a], 1]);
        }
        for (var a in y) {
            xy.push([y[a], 2]);
        }
        var xySorted = nestedArraySort(xy, false, 0);
        var values = [];
        var groups = [];
        for (var a in xySorted) {
            values.push(xySorted[a][0]);
            groups.push(xySorted[a][1]);
        }
        var ranks = [];
        for (var a in xySorted) {
            var element = xySorted[a][0];
            var rank = values.indexOf(element) + 1;
            ranks.push(rank);
        }
        var rankSumX = 0;
        var rankSumY = 0;
        for (var a in groups) {
            var group = groups[a];
            if (group === 1) {
                rankSumX += ranks[a];
            } else {
                rankSumY += ranks[a];
            }
        }
        var u = nx*ny + nx*(nx + 1)/2 - rankSumX;
        var z = (u - m)/s;
        z = Math.abs(z);

        /****************
        *** calculate the p value using the numerical approximation
        *****************/
        // http://en.wikipedia.org/wiki/Error_function#Numerical_approximation
        var x = z/Math.sqrt(2);
        var t = 1/(1 + 0.5*x);
        var tau = t*Math.exp(-Math.pow(x, 2) - 1.26551223 + 1.00002368*t + 0.37409196*Math.pow(t, 2) + 0.09678418*Math.pow(t, 3) - 0.18628806*Math.pow(t, 4) + 0.27886807*Math.pow(t, 5) - 1.13520398*Math.pow(t, 6) + 1.48851587*Math.pow(t, 7) - 0.82215223*Math.pow(t, 8) + 0.17087277*Math.pow(t, 9));
        var erf = 1 - tau;
        var p = (1 - 0.5*(1 + erf))*2;
        return p;
    }
    
}