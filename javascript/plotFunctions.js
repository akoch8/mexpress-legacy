function removeMessages() {
    
    // check if there is an error, warning or information message box present
    // remove it if there is
    if ($('.errorMessage').length > 0) {
        $('.errorMessage').remove();
    }
    if ($('.warningMessage').length > 0) {
        $('.warningMessage').remove();
    }
    if ($('.infoMessage').length > 0) {
        $('.infoMessage').remove();
    }
    
}

function formatCorrelation(r, p) {

    // This function formats correlation values:
    // always three decimals and always a + or - at the start of the number
    var rString = r.toPrecision(3);
    if (r > 0) {
        rString = '+' + rString;
    }
    rString = 'r = ' + rString;
    if (p < 0.001) {
        rString += ' ***';
    } else if (p < 0.01) {
        rString += ' **';
    } else if (p < 0.05) {
        rString += ' *';
    }
    return rString;

}

function numberOfLevels(array) {
    
    var uniqueArrayValues = [];
    for (var a in array) {
        var value = array[a];
        if ($.inArray(value, uniqueArrayValues) === -1 && value !== null && value !== undefined) {
            uniqueArrayValues.push(value);
        }
    }
    var levels = uniqueArrayValues.length;
    return levels;
    
}

function sortData(queryResult, sorter) {
    
    // sort the sample names based on the sorter

    // declare the variables:
    var sortedSamples = [];
    var samples = [];
    var sampleList = [];
    var sample, element, s, p, value, i;

    for (sample in queryResult['expressionData']) {
        samples.push(sample);
    }
    var remainingSamples = samples;

    if (sorter === 'expressionData') {
        var expressionList = [];
        for (sample in queryResult['expressionData']) {
            var expressionValue = queryResult['expressionData'][sample];
            expressionList.push({key:sample, val:expressionValue});
        }
        expressionList.sort(function(a, b) { return b.val-a.val; });
        for (element in expressionList) {
            sortedSamples.push(expressionList[element].key);
        }
    } else if (sorter === 'sample type') {
        sampleList = [];
        for (sample in queryResult['expressionData']) {
            var code = sample.replace(/^.+_(\d\d)$/, '$1');
            sampleList.push({key:sample, val:code});
        }
        sampleList.sort(function(a, b) { return b.val-a.val; });
        for (element in sampleList) {
            sortedSamples.push(sampleList[element].key);
        }
    }
    /*else if (sorter === 'batch number') {
        var sampleList = [];
        for (var sample in queryResult['expressionData']) {
            var batch = +queryResult['batch'][sample];
            sampleList.push({key:sample, val:batch});
        }
        sampleList.sort(function(a, b) { return b.val-a.val });
        for (var element in sampleList) {
            sortedSamples.push(sampleList[element].key);
        }
    }*/
    else if (sorter === 'PAM50 subtype') {
        sampleList = [];
        var missingSamples = [];
        for (s in samples) {
            sample = samples[s];
            if (sample in queryResult['pam50']) {
                sampleList.push({key:sample, val:queryResult['pam50'][sample]});
            } else {
                missingSamples.push(sample);
            }
        }
        sampleList.sort(function(a, b) {
            
            // sort alphabetically
            var nameA = a.val.toLowerCase(), nameB = b.val.toLowerCase();
            if (nameA < nameB) {
                return -1;
            } else if (nameA > nameB) {
                return 1;
            } else {
                return 0;
            }
            
        });
        for (element in sampleList) {
            sortedSamples.push(sampleList[element].key);
        }
        sortedSamples = sortedSamples.concat(missingSamples);
    } else {
        // check whether the sorter is part of the patient annotation or the slide annotation
        var patientExample, slideExample;
        for (p in queryResult['annotation']) {
            patientExample = queryResult['annotation'][p];
            break;
        }
        for (s in queryResult['slide']) {
            slideExample = queryResult['slide'][s];
            break;
        }

        var selectedAnnotation, annotationList, nullValues;
        if (sorter in patientExample) {
            selectedAnnotation = 'annotation';
            annotationList = [];
            nullValues = [];
            for (s in queryResult[selectedAnnotation]) {
                if (s !== 'numberOfAnnotationFields') {
                    value = queryResult[selectedAnnotation][s][sorter];
                    if (value !== undefined && value !== null) {
                        value = +value;
                        annotationList.push({key:s, val:value});
                    } else {
                        nullValues.push({key:s, val:value});
                    }
                }
            }
            annotationList.sort(function(a, b) { return b.val-a.val; });
            annotationList = annotationList.concat(nullValues);
            for (element in annotationList) {
                var patient = annotationList[element].key;
                var re = RegExp(patient);
                // find the samples that matches the patient id
                // take the first match and remove it from the samples array
                // (it doesn't matter which sample we take because the annotation value will be the same for all samples that belong to one patient)
                for  (i = samples.length-1; i >= 0; i--) {
                    // loop through the samples array backwards, this will avoid messing up the indexes of the remainingSamples array (which caused certain samples to be skipped)
                    var sampleToCheck = samples[i];
                    var res = sampleToCheck.match(re);
                    if (res !== null) {
                        sortedSamples.push(sampleToCheck);
                        var position = $.inArray(sampleToCheck, remainingSamples);
                        remainingSamples.splice(position, 1);
                    }
                }
            }
            sortedSamples = sortedSamples.concat(remainingSamples);
        } else if (sorter in slideExample) {
            selectedAnnotation = 'slide';
            annotationList = [];
            nullValues = [];
            for (s in queryResult[selectedAnnotation]) {
                if (s !== 'numberOfSlideFields') {
                    value = queryResult[selectedAnnotation][s][sorter];
                    if (value !== undefined && value !== null) {
                        value = +value;
                        annotationList.push({key:s, val:value});
                    } else {
                        nullValues.push({key:s, val:value});
                    }
                }
            }
            annotationList.sort(function(a, b) { return b.val-a.val; });
            annotationList = annotationList.concat(nullValues);
            for (element in annotationList) {
                sample = annotationList[element].key;
                for (i = samples.length - 1; i >= 0; i--) {
                    if (samples[i] === sample) {
                        sortedSamples.push(sample);
                        samples.splice(i, 1);
                    }
                }
            }
            sortedSamples = sortedSamples.concat(samples);
        }
    }
    return(sortedSamples);
    
}

function calculateStats(r, slideFieldsArray, sortedSamplesReduced, annotationArray, annotationData, expressionData, methylationData, copyNumberData, probeLocations, slideData) {
    
    // create the stats object that will contain all the correlation and p values between the different data types
    var stats = {};
    stats['expressionData'] = {};
    stats['sample type'] = {};
    stats['PAM50 subtype'] = {};
    //stats['batch number'] = {};
    var sample, ann;
    for (sample in r['annotation']) {
        for (ann in r['annotation'][sample]) {
            stats[ann] = {};
        }
        break;
    }
    for (sample in r['slide']) {
        for (ann in r['slide'][sample]) {
            stats[ann] = {};
        }
        break;
    }

    // fill the stats object with correlation and p values
    // this means going through the elements that are in the stats object
    // and for each one of these elements to go through the different data types that are available:
    // expression, methylation, annotation, slide and sample type
    var element, patient, s, code;
    for (element in stats) {
        var elementData = {};
        var elementDataValues = [];
        if (element === 'expressionData') {
            elementData = r[element];
        } else if ($.inArray(element, annotationArray) !== -1) {
            for (patient in r['annotation']) {
                elementData[patient] = r['annotation'][patient][element];
            }
        } else if ($.inArray(element, slideFieldsArray) !== -1) {
            for (sample in r['slide']) {
                elementData[sample] = r['slide'][sample][element];
            }
        } else if (element === 'sample type') {
            for (s in sortedSamplesReduced) {
                sample = sortedSamplesReduced[s];
                code = sample.replace(/^.+_(\d\d)$/, '$1');
                if (code === '10' || code === '11' || code === '12' || code === '13' || code === '14') {
                    elementData[sample] = '1';
                } else {
                    elementData[sample] = '0';
                }
            }
        } else if (element === 'PAM50 subtype') {
            for (s in sortedSamplesReduced) {
                sample = sortedSamplesReduced[s];
                if (sample in r['pam50']) {
                    elementData[sample] = r['pam50'][sample];
                } else {
                    elementData[sample] = 'no data';
                }
            }
        }
        /*else if (element === 'batch number') {
            for (var s in sortedSamplesReduced) {
                var sample = sortedSamplesReduced[s];
                if (sample in r['batch']) {
                    elementData[sample] = r['batch'][sample];
                } else {
                    elementData[sample] = 'no data';
                }
            }
        }*/
        for (var e in elementData) {
            elementDataValues.push(elementData[e]);
        }
        var elementDataLevels = numberOfLevels(elementDataValues);
        // expression data
        var array1, array2, annotationValue, answer, p;
        if (element !== 'expressionData') {
            if (elementDataLevels === 2) {
                array1 = [];
                array2 = [];
                for (sample in expressionData) {
                    patient = sample.replace(/_\d\d$/, '');
                    if (annotationData[patient] !== 'no_annotation') {
                        if (element !== 'sample type') {
                            annotationValue = annotationData[patient][element];
                        } else {
                            annotationValue = elementData[sample];
                        }
                        if (annotationValue === '1') {
                            array1.push(expressionData[sample]);
                        } else if (annotationValue === '0') {
                            array2.push(expressionData[sample]);
                        }
                    }
                }
                answer = wilcoxonRankSumTest(array1, array2);
                stats[element]['expressionData'] = {p:answer};
            } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                array1 = [];
                array2 = [];
                for (s in sortedSamplesReduced) {
                    sample = sortedSamplesReduced[s];
                    array1.push(expressionData[sample]);
                    if ($.inArray(element, annotationArray) !== -1) {
                        patient = sample.replace(/_\d\d$/, '');
                        array2.push(elementData[patient]);
                    } else {
                        array2.push(elementData[sample]);
                    }
                }
                answer = pearsonCorrelation(array1, array2);
                stats[element]['expressionData'] = {r:answer['r'], rp:answer['p']};
            } else {
                stats[element]['expressionData'] = {n:'no normals'};
            }
        }
        // methylation data
        for (p in probeLocations) {
            if (elementDataLevels === 2) {
                // Wilcoxon rank-sum test
                array1 = [];
                array2 = [];
                for (s in sortedSamplesReduced) {
                    sample = sortedSamplesReduced[s];
                    patient = sample.replace(/_\d\d$/, '');
                    if (annotationData[patient] !== 'no_annotation') {
                        if (element !== 'sample type') {
                            annotationValue = annotationData[patient][element];
                        } else {
                            annotationValue = elementData[sample];
                        }
                        if (annotationValue === '1') {
                            array1.push(methylationData[sample][probeLocations[p]]);
                        } else if (annotationValue === '0') {
                            array2.push(methylationData[sample][probeLocations[p]]);
                        }
                    }
                }
                answer = wilcoxonRankSumTest(array1, array2);
                stats[element][probeLocations[p]] = {p:answer};
            } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                // correlation
                array1 = [];
                array2 = [];
                for (s in sortedSamplesReduced) {
                    sample = sortedSamplesReduced[s];
                    array1.push(methylationData[sample][probeLocations[p]]);
                    if ($.inArray(element, annotationArray) !== -1) {
                        patient = sample.replace(/_\d\d$/, '');
                        array2.push(elementData[patient]);
                    } else {
                        array2.push(elementData[sample]);
                    }
                }
                answer = pearsonCorrelation(array1, array2);
                stats[element][probeLocations[p]] = {r:answer['r'], rp:answer['p']};
            } else {
                stats[element][probeLocations[p]] = {n:'failed'};
            }
        }
        // copy number data
        if (copyNumberData !== 'no_data') {
            if (elementDataLevels === 2) {
                // Wilcoxon rank-sum test
                array1 = [];
                array2 = [];
                for (s in sortedSamplesReduced) {
                    sample = sortedSamplesReduced[s];
                    patient = sample.replace(/_\d\d$/, '');
                    if (annotationData[patient] !== 'no_annotation') {
                        if (element !== 'sample type') {
                            annotationValue = annotationData[patient][element];
                        } else {
                            annotationValue = elementData[sample];
                        }
                        if (annotationValue === '1') {
                            array1.push(copyNumberData[sample]);
                        } else if (annotationValue === '0') {
                            array2.push(copyNumberData[sample]);
                        }
                    }
                }
                answer = wilcoxonRankSumTest(array1, array2);
                stats[element]['copy number'] = {p:answer};
            } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                // correlation
                array1 = [];
                array2 = [];
                for (s in sortedSamplesReduced) {
                    sample = sortedSamplesReduced[s];
                    array1.push(copyNumberData[sample]);
                    if ($.inArray(element, annotationArray) !== -1) {
                        patient = sample.replace(/_\d\d$/, '');
                        array2.push(elementData[patient]);
                    } else {
                        array2.push(elementData[sample]);
                    }
                }
                answer = pearsonCorrelation(array1, array2);
                stats[element]['copy number'] = {r:answer['r'], rp:answer['p']};
            } else {
                stats[element]['copy number'] = {n:'failed'};
            }
        }
        // annotation data
        var secondElement, a;
        for (a in annotationArray) {
            secondElement = annotationArray[a];
            if (secondElement !== element) {
                var secondElementData = [];
                for (p in annotationData) {
                    secondElementData.push(annotationData[p][secondElement]);
                }
                var secondElementDataLevels = numberOfLevels(secondElementData);
                if (elementDataLevels === 2) {
                    if (secondElementDataLevels === 2) {
                        // Fisher's exact test
                        stats[element][secondElement] = {n:'failed'};
                    } else if (secondElementDataLevels > 2) {
                        // Wilcoxon rank-sum test
                        array1 = [];
                        array2 = [];
                        for (s in sortedSamplesReduced) {
                            sample = sortedSamplesReduced[s];
                            patient = sample.replace(/_\d\d$/, '');
                            if (annotationData[patient] !== 'no_annotation') {
                                if (element !== 'sample type') {
                                    annotationValue = annotationData[patient][element];
                                } else {
                                    annotationValue = elementData[sample];
                                }
                                if (annotationValue === '1') {
                                    array1.push(annotationData[patient][secondElement]);
                                } else if (annotationValue === '0') {
                                    array2.push(annotationData[patient][secondElement]);
                                }
                            }
                        }
                        answer = wilcoxonRankSumTest(array1, array2);
                        stats[element][secondElement] = {p:answer};
                    } else {
                        stats[element][secondElement] = {n:'failed'};
                    }
                } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                    if (secondElementDataLevels === 2) {
                        // Wilcoxon rank-sum test
                        array1 = [];
                        array2 = [];
                        for (s in sortedSamplesReduced) {
                            sample = sortedSamplesReduced[s];
                            patient = sample.replace(/_\d\d$/, '');
                            if (annotationData[patient] !== 'no_annotation') {
                                annotationValue = annotationData[patient][secondElement];
                                if (annotationValue === '1') {
                                    if ($.inArray(element, annotationArray) !== -1) {
                                        if (elementData[patient]) {
                                            array1.push(elementData[patient]);
                                        }
                                    } else {
                                        if (elementData[sample]) {
                                            array1.push(elementData[sample]);
                                        }
                                    }
                                } else if (annotationValue === '0') {
                                    if ($.inArray(element, annotationArray) !== -1) {
                                        if (elementData[patient]) {
                                            array2.push(elementData[patient]);
                                        }
                                    } else {
                                        if (elementData[sample]) {
                                            array2.push(elementData[sample]);
                                        }
                                    }
                                }
                            }
                        }
                        answer = wilcoxonRankSumTest(array1, array2);
                        stats[element][secondElement] = {p:answer};
                    } else if (secondElementDataLevels > 2) {
                        // correlation
                        array1 = [];
                        array2 = [];
                        for (s in sortedSamplesReduced) {
                            sample = sortedSamplesReduced[s];
                            patient = sample.replace(/_\d\d$/, '');
                            if ($.inArray(element, annotationArray) !== -1) {
                                if (elementData[patient]) {
                                    array1.push(elementData[patient]);
                                    array2.push(annotationData[patient][secondElement]);
                                }
                            } else {
                                if (elementData[sample]) {
                                    array1.push(elementData[sample]);
                                    array2.push(annotationData[patient][secondElement]);
                                }
                            }
                        }
                        answer = pearsonCorrelation(array1, array2);
                        stats[element][secondElement] = {r:answer['r'], rp:answer['p']};
                    } else {
                        stats[element][secondElement] = {n:'failed'};
                    }
                } else {
                    stats[element][secondElement] = {n:'failed'};
                }
            }
        }
        // slide data
        for (s in slideFieldsArray) {
            secondElement = slideFieldsArray[s];
            if (secondElement !== element) {
                if (elementDataLevels === 2) {
                    // Wilcoxon rank-sum test
                    array1 = [];
                    array2 = [];
                    for (s in sortedSamplesReduced) {
                        sample = sortedSamplesReduced[s];
                        patient = sample.replace(/_\d\d$/, '');
                        if (element !== 'sample type') {
                            annotationValue = annotationData[patient][element];
                        } else {
                            annotationValue = elementData[sample];
                        }
                        if (annotationValue === '1') {
                            array1.push(slideData[sample][secondElement]);
                        } else if (annotationValue === '0') {
                            array2.push(slideData[sample][secondElement]);
                        }
                    }
                    answer = wilcoxonRankSumTest(array1, array2);
                    stats[element][secondElement] = {p:answer};
                } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                    // correlation
                    array1 = [];
                    array2 = [];
                    for (s in sortedSamplesReduced) {
                        sample = sortedSamplesReduced[s];
                        patient = sample.replace(/_\d\d$/, '');
                        if ($.inArray(element, annotationArray) !== -1) {
                            if (elementData[patient]) {
                                array1.push(elementData[patient]);
                                array2.push(slideData[sample][secondElement]);
                            }
                        } else  {
                            array1.push(elementData[sample]);
                            array2.push(slideData[sample][secondElement]);
                        }
                    }
                    answer = pearsonCorrelation(array1, array2);
                    stats[element][secondElement] = {r:answer['r'], rp:answer['p']};
                } else {
                    stats[element][secondElement] = {n:'failed'};
                }
            }
        }
        // sample type
        if (element !== 'sample type') {
            var sampleTypeData = {};
            var sampleTypeValues = [];
            for (s in sortedSamplesReduced) {
                sample = sortedSamplesReduced[s];
                code = sample.replace(/^.+_(\d\d)$/, '$1');
                if (code === '10' || code === '11' || code === '12' || code === '13' || code === '14') {
                    sampleTypeData[sample] = '1';
                    sampleTypeValues.push('1');
                } else {
                    sampleTypeData[sample] = '0';
                    sampleTypeValues.push('0');
                }
            }
            var sampleTypeLevels = numberOfLevels(sampleTypeValues);
            if (sampleTypeLevels === 2) {
                // only do the calculations when there are 2 sample types (normal/tumor)
                if (elementDataLevels === 2) {
                    // Fisher's exact test
                    stats[element]['sample type'] = {n:'failed'};
                } else if (elementDataLevels > 2 && element !== 'PAM50 subtype' && element !== 'eye_color' && element !== 'batch number') {
                    // Wilcoxon rank-sum test
                    array1 = [];
                    array2 = [];
                    for (s in sortedSamplesReduced) {
                        sample = sortedSamplesReduced[s];
                        patient = sample.replace(/_\d\d$/, '');
                        var sampleTypeValue = sampleTypeData[sample];
                        if (sampleTypeValue === '1') {
                            if ($.inArray(element, annotationArray) !== -1) {
                                if (elementData[patient]) {
                                    array1.push(elementData[patient]);
                                }
                            } else {
                                if (elementData[sample]) {
                                    array1.push(elementData[sample]);
                                }
                            }
                        } else if (sampleTypeValue === '0') {
                            if ($.inArray(element, annotationArray) !== -1) {
                                if (elementData[patient]) {
                                    array2.push(elementData[patient]);
                                }
                            } else {
                                if (elementData[sample]) {
                                    array2.push(elementData[sample]);
                                }
                            }
                        }
                    }
                    answer = wilcoxonRankSumTest(array1, array2);
                    stats[element]['sample type'] = {p:answer};
                }
            } else {
                stats[element]['sample type'] = {n:'no normal samples'};
            }
        }
    }

    return stats;

}

function drawLegend(r, svg, leftMargin, topMargin, geneColor, transcriptColor, cpgiColor, expressionFillColor, methylationFillColor, addCopyNumber, copyNumberFillColor, annotationColorEven, missingValueColor, genderAnnotation, femaleColorEven, maleColorEven, statsFont, source, pam50subtypeColors, sampleTypesPresent, sampleTypes, sampleTypeColors) {

    // draw the legend
    var xPos, yPos;
    xPos = -leftMargin + 1;
    yPos = -topMargin + 24;
    // column 1: annotation
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos)
        .attr('font-weight', 'bold')
        .text('annotation');
    // gene
    svg.append('rect')
        .attr('fill', geneColor)
        .attr('x', xPos)
        .attr('y', yPos + 8)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18)
        .text('gene');
    // transcript
    svg.append('rect')
        .attr('fill', transcriptColor)
        .attr('x', xPos)
        .attr('y', yPos + 8 + 18)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18*2)
        .text('transcript');
    // CpG island
    svg.append('rect')
        .attr('fill', cpgiColor)
        .attr('x', xPos)
        .attr('y', yPos + 8 + 18*2)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18*3)
        .text('CpG island');
    xPos += 90;
    // column 2: data
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos)
        .attr('font-weight', 'bold')
        .text('data');
    // expression
    svg.append('rect')
        .attr('fill', expressionFillColor)
        .attr('x', xPos)
        .attr('y', yPos + 8)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18)
        .text('RNA-seq v2 (log2)');
    // methylation
    svg.append('rect')
        .attr('fill', methylationFillColor)
        .attr('x', xPos)
        .attr('y', yPos + 8 + 18)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18*2)
        .text(r['platform']);
    // clinical/slide
    svg.append('rect')
        .attr('fill', annotationColorEven)
        .attr('x', xPos)
        .attr('y', yPos + 8 + 18*2)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18*3)
        .text('slide/clinical data');
    svg.append('rect')
        .attr('fill', missingValueColor)
        .attr('x', xPos)
        .attr('y', yPos + 8 + 18*3)
        .attr('width', 3)
        .attr('height', 12);
    svg.append('text')
        .attr('x', xPos + 8)
        .attr('y', yPos + 18*4)
        .text('missing data');
    // copy number
    if (addCopyNumber) {
        svg.append('rect')
            .attr('fill', copyNumberFillColor)
            .attr('x', xPos)
            .attr('y', yPos + 8 + 18*4)
            .attr('width', 3)
            .attr('height', 12);
        svg.append('text')
            .attr('x', xPos + 8)
            .attr('y', yPos + 18*5)
            .text('copy number');
    }
    xPos += 120;
    // column 3: gender
    if (genderAnnotation) {
        svg.append('text')
            .attr('x', xPos)
            .attr('y', yPos)
            .attr('font-weight', 'bold')
            .text('gender');
        svg.append('rect')
            .attr('fill', femaleColorEven)
            .attr('x', xPos)
            .attr('y', yPos + 8)
            .attr('width', 3)
            .attr('height', 12);
        svg.append('text')
            .attr('x', xPos + 8)
            .attr('y', yPos + 18)
            .text('female');
        svg.append('rect')
            .attr('fill', maleColorEven)
            .attr('x', xPos)
            .attr('y', yPos + 8 + 18)
            .attr('width', 3)
            .attr('height', 12);
        svg.append('text')
            .attr('x', xPos + 8)
            .attr('y', yPos + 18*2)
            .text('male');
        xPos += 70;
    }
    // column 4: statistics
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos)
        .attr('font-weight', 'bold')
        .text('statistics');
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos + 18)
        .attr('font-size', '14px')
        .attr('font-family', statsFont)
        .text('p');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18)
        .text('Wilcoxon rank-sum test');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18 + 14)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p < 0.05');
    svg.append('text')
        .attr('x', xPos + 16 + 72)
        .attr('y', yPos + 18 + 14)
        .attr('fill', '#aaa')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p \u2265 0.05');
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos + 18*3)
        .attr('font-size', '14px')
        .attr('font-family', statsFont)
        .text('r');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18*3)
        .text('Pearson correlation');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18*3 + 14)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('***');
    svg.append('text')
        .attr('x', xPos + 16 + 32)
        .attr('y', yPos + 18*3 + 14)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p < 0.001');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18*3 + 14*2)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('**');
    svg.append('text')
        .attr('x', xPos + 16 + 32)
        .attr('y', yPos + 18*3 + 14*2)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p < 0.01');
    svg.append('text')
        .attr('x', xPos + 16)
        .attr('y', yPos + 18*3 + 14*3)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('*');
    svg.append('text')
        .attr('x', xPos + 16 + 32)
        .attr('y', yPos + 18*3 + 14*3)
        .attr('font-weight', 'bold')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p < 0.05');
    svg.append('text')
        .attr('x', xPos + 16 + 32)
        .attr('y', yPos + 18*3 + 14*4)
        .attr('fill', '#aaa')
        .attr('font-size', '11px')
        .attr('font-family', statsFont)
        .text('p \u2265 0.05');
    xPos += 160;
    // column 5: breast cancer subtypes
    if (source === 'BRCA breast invasive carcinoma') {
        svg.append('text')
            .attr('x', xPos)
            .attr('y', yPos)
            .attr('font-weight', 'bold')
            .text('BRCA subtype');
        i = 0;
        for (var subtype in pam50subtypeColors) {
            if (subtype !== 'no data') {
                svg.append('rect')
                    .attr('fill', pam50subtypeColors[subtype])
                    .attr('x', xPos)
                    .attr('y', yPos + 8 + 18*i)
                    .attr('width', 3)
                    .attr('height', 12);
                svg.append('text')
                    .attr('x', xPos + 8)
                    .attr('y', yPos + 18*(i + 1))
                    .text(subtype);
                i++;
            }
        }
        xPos += 106;
    }
    // column 6: sample type
    svg.append('text')
        .attr('x', xPos)
        .attr('y', yPos)
        .attr('font-weight', 'bold')
        .text('sample type');
    var sampleTypeCounter = 0;
    for (var s in sampleTypesPresent) {
        var code = sampleTypesPresent[s];
        var sampleText = sampleTypes[code];
        if (sampleText.length > 26) {
            sampleText = sampleText.substring(0, 23);
            sampleText = sampleText + '...';
        }
        svg.append('rect')
            .attr('fill', sampleTypeColors[code])
            .attr('x', xPos)
            .attr('y', yPos + 8 + 18*(sampleTypeCounter))
            .attr('width', 3)
            .attr('height', 12);
        svg.append('text')
            .attr('x', xPos + 8)
            .attr('y', yPos + 18*(sampleTypeCounter + 1))
            .text(sampleText);
        sampleTypeCounter++;
    }

}

function updatePlot(queryResult, gene, source, numberOfSamples, sorter) {
    
    $('.plotInfo').empty();
    $('.plotWindow').empty();
    createPlot(queryResult, gene, source, numberOfSamples, sorter);
    
}

function createPlot(queryResult, gene, source, numberOfSamples, sorter) {

    // declare the general plotting variables:
    // dimensions:
    var windowWidth = $(window).width();
    var inputWidth = $('.userInput').outerWidth();
    var plotWidth = windowWidth - inputWidth - 28;
    var sampleRowHeight = 18;
    var annotationRowHeight = 14;
    var geneWidth = 4;
    var cpgiWidth = 3;
    var transcriptWidth = 2;
    // text styling
    var statsTextSize = '11px';
    var statsFont = 'Courier New';
    // colors:
    var geneColor = '#f59322';
    var cpgiColor = '#4bc722';
    var transcriptColor = '#ffedc2';
    var exonColor = '#ffc842';
    var scaleBarColor = '#999';
    var probeLocationLineColor = '#acd2f2';
    var selectedProbeColor = '#1a70ba';
    var missingValueColor = '#f9f9f9';
    var expressionFillColor = '#ffd57a';
    var expressionLineColor = '#f59322';
    var expressionDashedLineColor = '#ffd161';
    var copyNumberFillColor = '#ffbd7a';
    var copyNumberLineColor = '#f55e22';
    var methylationFillColor = '#aad5fa';
    var methylationLineColor = '#4999de';
    var selectedMethFillColor = '#63aceb';
    var selectedMethLineColor = '#14568f';
    var noMethDataColor = '#b6d3f2';
    var annotationColorEven = '#dce1e6';
    var annotationColorUneven = '#c5ccd4';
    var femaleColorEven = '#fa89ca';
    var femaleColorUneven = '#f272bb';
    var maleColorEven = '#98d3fa';
    var maleColorUneven = '#7fc3f0';
    var blueEyesEven = '#98d3fa';
    var blueEyesUneven = '#4999de';
    var brownEyesEven = '#944e07';
    var brownEyesUneven = '#693705';
    var greenEyesEven = '#73cc5b';
    var greenEyesUneven = '#37ac19';
    var pam50subtypeColors = {
        'Normal': '#4999de',
        //'Normal': '#73cc5b',
        'Basal': '#ffc03b',
        //'Basal': '#f0452b',
        'Her2': '#ff983b',
        //'Her2': '#fa87c8',
        'LumA': '#73cc5b',
        //'LumA': '#4999de',
        'LumB': '#37ac19',
        //'LumB': '#aad5fa',
        'no data': missingValueColor
    };
    // TCGA sample type variables:
    var sampleTypes = { '01':'primary solid tumor',
                        '02':'recurrent solid tumor',
                        '03':'primary blood derived cancer - peripheral blood',
                        '04':'recurrent blood derived cancer - bone marrow',
                        '05':'additional - new primary',
                        '06':'metastatic',
                        '07':'additional metastatic',
                        '08':'human tumor original cells',
                        '09':'primary blood derived cancer - bone marrow',
                        '10':'blood derived normal',
                        '11':'solid tissue normal',
                        '12':'buccal cell normal',
                        '13':'EBV immortalized normal',
                        '14':'bone marrow normal',
                        '20':'control analyte',
                        '40':'recurrent blood derived cancer - peripheral blood',
                        '50':'cell lines',
                        '60':'primary xenograft tissue',
                        '61':'cell line derived xenograft tissue'};
    var sampleTypeColors = {    '01':'#98d3fa',
                                '02':'#f7a972',
                                '03':'#f2766f',
                                '04':'#db7346',
                                '05':'#3fd19b',
                                '06':'#ffd161',
                                '07':'#d13f75',
                                '08':'#6ff0f2',
                                '09':'#f29b6f',
                                '10':'#9dc9f5',
                                '11':'#4999de',
                                '12':'#4198f0',
                                '13':'#0f73d6',
                                '14':'#90d8f5',
                                '20':'#46bff0',
                                '40':'#db4e46',
                                '50':'#f07746',
                                '60':'#a17fad',
                                '61':'#8a38a8'};
    
    // declare the variables:
    // these are all variables that are used several times, which is why they
    // are all declared together here
    var ann, annotation, annotationCount, annotationValue, answer,
        code, correlationColor, correlationWeight,
        e, el, element, expression,
        field, fieldName,
        i,
        p, patient, pNum, pos,
        r, rectHeight, rString,
        s, sample, sampleNr, significanceColor, significanceWeight, slideField, slideFieldCount, stat;

    // data variables:
    var numberOfProbes = queryResult['numberOfProbes'];
    var geneInfo = queryResult['geneInfo'];
    var geneStart = +geneInfo['start'];
    var geneEnd = +geneInfo['end'];
    var strand = geneInfo['strand'];
    var transcripts = queryResult['transcripts'];
    var cpgi = queryResult['cpgi'];
    // determine the (maximal) number of annotation fields for all the samples,
    // the maximal value for each one of these annotation fields
    // and check whether or not there is gender annotation
    var maxNumberOfAnnotationFields = 0;
    var genderAnnotation = false;
    
    var maxAnnotationValues = {};
    var annotationArray = [];
    n = +queryResult['annotation']['numberOfAnnotationFields'];
    if (n > maxNumberOfAnnotationFields) {
        maxNumberOfAnnotationFields = n;
    }

    for (sample in queryResult['annotation']) {
        for (annotation in queryResult['annotation'][sample]) {
            if ($.inArray(annotation, annotationArray) === -1) {
                annotationArray.push(annotation);
            }
            if (annotation === 'gender') {
                genderAnnotation = true;
            }
            annotationValue = parseFloat(queryResult['annotation'][sample][annotation]);
            if (!isNaN(annotationValue)) {
                if (!maxAnnotationValues.hasOwnProperty(annotation)) {
                    maxAnnotationValues[annotation] = annotationValue;
                } else {
                    if (annotationValue > maxAnnotationValues[annotation]) {
                        maxAnnotationValues[annotation] = annotationValue;
                    }
                }
            } else {
                if (!maxAnnotationValues.hasOwnProperty(annotation)) {
                    maxAnnotationValues[annotation] = 0;
                }
            }
        }
    }
    maxNumberOfAnnotationFields++; // add 1 for the sample type (is linked to the sample name)
    //maxNumberOfAnnotationFields++; // add 1 for the batch number

    // create an array with the unique batch numbers for the selected cancer type
    // these unique numbers are then used to create the different batch colors
    /*var uniqueBatches = [];
    for (var s in queryResult['batch']) {
        var batch = +queryResult['batch'][s];
        if ($.inArray(batch, uniqueBatches) === -1) {
            uniqueBatches.push(batch);
        }
    }
    uniqueBatches = uniqueBatches.sort(function(a,b) { return a -b; });
    var nrBatches = uniqueBatches.length;
    var colorInterval = (255 - (255 % nrBatches))/nrBatches;
    var batchColors = {};
    for (b in uniqueBatches) {
        var batch = uniqueBatches[b];
        var rgbValue = colorInterval*b;
        batchColors[batch] = 'rgb(' + rgbValue + ','  + rgbValue +  ',' + rgbValue + ')';
    }*/
    
    // check the number of sample slide fields
    var maxNumberOfSlideFields = 0;
    var slideFieldsArray = [];
    if (queryResult['slide'] !== 'no_data') {
        n = +queryResult['slide']['numberOfSlideFields'];
        if (n > maxNumberOfSlideFields) {
            maxNumberOfSlideFields = n;
        }
        for (sample in queryResult['slide']) {
            if (sample !== 'numberOfSlideFields') {
                for (element in queryResult['slide'][sample]) {
                    slideFieldsArray.push(element);
                }
                break;
            }
        }
    }
    // add the number of slide annotation fields to the number of patient annotation fields
    // this sum will be used to determine the height of the plot
    maxNumberOfAnnotationFields += maxNumberOfSlideFields;
    // add 1 if brca is selected as the source, this will account for the pam50 subtypes
    if (source === 'BRCA breast invasive carcinoma') {
        maxNumberOfAnnotationFields++;
    }
    
    // get the maximal expression value (will be used to determine the plot height)
    var maxExpression = 0;
    for (sample in queryResult['expressionData']) {
        expr = +queryResult['expressionData'][sample];
        if (expr > maxExpression) {
            maxExpression = expr;
        }
    }

    // get the maximal copy number value (will be used to determine the plot height)
    if (queryResult['copyNumberData'] !== 'no_data') {
        var maxCopyNumber = 0;
        for (sample in queryResult['copyNumberData']) {
            cn = queryResult['copyNumberData'][sample];
            if (!isNaN(cn)) {
                cn = Math.abs(+cn);
                if (cn > maxCopyNumber) {
                    maxCopyNumber = cn;
                }
            }
        }
    }

    /*****

        DATA PROCESSING
        
    *****/

    // reorder the expression data
    // default = by expression, from high to low
    // all other data will be ordered based on the expression
    // the user can change this by clicking on one of the annotation variables
    // (the expression will then be reordered and based on the new expression order, so will the other data elements)
    var sortedSamples = sortData(queryResult, sorter);
    
    // store the expression data in a new array and the methylation data in a new object
    // the methylation data for the different samples needs to be grouped per probe in order to draw a single line for each probe
    var methylationData = [];
    var expressionData = [];
    var copyNumberData = [];
    var annotationData = [];
    var slideData = [];
    
    var probeLocations = []; // this array will be used to store the probe positions
    for (sample in queryResult['methylationData']) {
        for (pos in queryResult['methylationData'][sample]) {
            probeLocations.push(pos);
        }
        break; // we only need to loop through the positions of the first sample, since they are the same for all samples
    }

    var methylationValuesByProbe = {};
    for (pos in probeLocations) {
        methylationValuesByProbe[probeLocations[pos]] = [];
    }
    
    // some of the samples won't have both expression and methylation data
    // we will only keep those samples that have both:
    var sortedSamplesReduced = [];
    for (s in sortedSamples) {
        sample = sortedSamples[s];
        // check if there is methylation data available for a sample
        // if there isn't, skip to the next one
        if (queryResult['methylationData'][sample]) {
            sortedSamplesReduced.push(sample);
            // methylation data
            methylationData[sample] = queryResult['methylationData'][sample];
            for (pos in probeLocations) {
                methylationValuesByProbe[probeLocations[pos]].push(queryResult['methylationData'][sample][probeLocations[pos]]);
            }
            // annotation data
            patient = sample.replace(/_\d\d$/, '');
            if (queryResult['annotation'][patient]) {
                annotationData[patient] = queryResult['annotation'][patient];
            } else {
                annotationData[patient] = 'no_annotation';
            }
            // slide annotation data
            if (queryResult['slide'][sample]) {
                slideData[sample] = queryResult['slide'][sample];
            } else {
                slideData[sample] = 'no_data';
            }
            // expression data
            expression = queryResult['expressionData'][sample];
            expressionData[sample] = expression;
            // copy number data
            if (queryResult['copyNumberData'] == 'no_data') {
                copyNumberData = 'no_data';
            } else {
                if (queryResult['copyNumberData'][sample]) {
                    copyNumberData[sample] = queryResult['copyNumberData'][sample];
                } else {
                    copyNumberData[sample] = 'no_data';
                }
            }
        }
    }
    
    // create the stats object that will contain all the correlation and p values between the different data types
    var stats = calculateStats(queryResult, slideFieldsArray, sortedSamplesReduced, annotationArray, annotationData, expressionData, methylationData, copyNumberData, probeLocations, slideData);

    // get all the p values that will be shown in the plot
    // we need to adjust them for multiple hypothesis testing
    var allPValues = [];
    var allElements = [];
    for (e in stats[sorter]) {
        el = stats[sorter][e];
        if (el['rp'] && el['rp'] !== 'failed') {
            allPValues.push(el['rp']);
            allElements.push(e);
        } else if (el['p'] && el['p'] !== 'failed') {
            allPValues.push(el['p']);
            allElements.push(e);
        }
    }
    var correctedPValues = pAdjust(allPValues, 'bh');
    for (i=0; i<correctedPValues.length; i++) {
        var pVal = correctedPValues[i];
        pVal = +pVal.toPrecision(3);
        var pTest = pVal*1000;
        if (pTest < 1) {
            pVal = pVal.toExponential();
        }
        el = allElements[i];
        if (stats[sorter][el]['rp']) {
            stats[sorter][el]['rp'] = pVal;
        } else if (stats[sorter][el]['p']) {
            stats[sorter][el]['p'] = pVal;
        }
    }

    /*****

        PLOTTING

    *****/

    // determine the number of transcripts and whether or not there are any CpG islands
    // these numbers will determine the width of the plot
    tCount = 0;
    var key;
    for(key in transcripts) {
        if(transcripts.hasOwnProperty(key)) {
            tCount++;
        }
    }
    cpgiCount = 0;
    for(key in cpgi) {
        if(cpgi.hasOwnProperty(key)) {
            cpgiCount++;
        }
    }
    var annotationWidth = 8 + 4*tCount;
    if (cpgiCount > 0) {
        annotationWidth += 5;
    }
    
    // set all the plot variables
    // calculate the top margin based on the maximal height of the expression bars and the number of annotation fields
    var geneLength = Math.abs(geneStart - geneEnd);
    // determine the height of the legend
    // this must be at least 126px, but has to be higher if there are more than 7 different sample types
    var legendHeight = 148;
    var sampleTypesPresent = [];
    if (queryResult['annotation'] !== 'no_annotation') {
        for (s in sortedSamplesReduced) {
            sample = sortedSamplesReduced[s];
            code = sample.replace(/^.+_(\d\d)$/, '$1');
            if ($.inArray(code, sampleTypesPresent) === -1) {
                sampleTypesPresent.push(code);
            }
        }
    }
    if (sampleTypesPresent.length > 7) {
        legendHeight = 148 + 18*sampleTypesPresent.length;
    }
    var topMargin = 10 + (maxExpression/20)*sampleRowHeight*3 + 10 + (annotationRowHeight + 1)*maxNumberOfAnnotationFields + 20 + legendHeight;
    if (copyNumberData !== 'no_data') {
        topMargin = 10 + (maxExpression/20)*sampleRowHeight*3 + (maxCopyNumber/10)*sampleRowHeight*3 + 10 + (annotationRowHeight + 1)*maxNumberOfAnnotationFields + 20 + legendHeight;
    }
    var leftMargin = 170 + annotationWidth;
    var rightMargin = 110;
    var margin = {top: topMargin, left: leftMargin, bottom: 40, right: rightMargin};
    var width = plotWidth - leftMargin - rightMargin;
    // account for the width of the legend
    var minWidth = 600;
    var height;
    if (genderAnnotation) {
        minWidth = 750;
    }
    if (width < minWidth) {
        width = minWidth;
    }
    if (numberOfProbes < 10) {
        // ensure that even when there are only a few probes
        // the gene plot will still be big enough to interpret
        height = 10*sampleRowHeight;
    } else {
        if (geneLength > 100000 && numberOfProbes < 40) {
            // make sure that for very long genes with few probes the details (like exons and CpG islands) are still visible by stretching out the gene
            height = 40*sampleRowHeight;
        } else {
            height = numberOfProbes*sampleRowHeight;
        }
    }
    // determine the width of a sample column based on the width of the plot and the number of samples
    var sampleColumnWidth = Math.floor(width/numberOfSamples);
    if (sampleColumnWidth < 1) {
        sampleColumnWidth = 1;
    } else if (sampleColumnWidth > 6) {
        sampleColumnWidth = 6;
    }
    // recalculate the width based on the sample column width
    // this way we avoid potential white lines between the samples
    width = sampleColumnWidth*numberOfSamples;
    // scaling for x and y axis values
    var x = d3.scale.linear().range([0,width]);
    var y = d3.scale.linear().range([height,0]);
    
    // create the x axis object
    var xAxis = d3.svg.axis().scale(x).orient('top');
    
    // create a d3 line variable
    var line = d3.svg.line()
        .defined(function(d) { return d !== null; })
        .x(function(d,i) { return (x(i) + sampleColumnWidth/2); })
        .y(function(d){ return d; });
    
    // make the svg element visible
    $('.plotWindow').removeClass('hidden');
    
    // create the svg
    var svg = d3.select('.plotWindow')
        .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('text-rendering', 'geometricPrecision')
            .attr('font-family', 'arial')
            .attr('font-size', '12px')
            .attr('fill', '#666')
        .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    
    x.domain([0, numberOfSamples]);
    y.domain([0, numberOfProbes]);
    
    // add the annotation info (gene, transcript, cpg island)
    var extra = 1000.0;
    if (geneLength/10 > 1000) {
        extra = geneLength/10;
    }
    if (extra > 5000) {
        extra = 5000;
    }
    var plotStart = geneStart - extra;
    var plotEnd = geneEnd + extra;
    var factor = (plotEnd - plotStart)/numberOfProbes;
    var geneStartPlot = (geneStart - plotStart)/factor;
    var geneEndPlot = (geneEnd - plotStart)/factor;
    var promoterStart, promoterEnd;
    if (strand === '1') {
        promoterStart = geneStart - 1000;
        promoterEnd = geneStart + 500;
    } else {
        promoterStart = geneEnd - 500;
        promoterEnd = geneEnd + 1000;
    }
    
    // draw the legend
    var addCopyNumber = true;
    if (queryResult['copyNumberData'] === 'no_data') {
        addCopyNumber = false;
    }
    drawLegend(queryResult, svg, leftMargin, topMargin, geneColor, transcriptColor, cpgiColor, expressionFillColor, methylationFillColor, addCopyNumber, copyNumberFillColor, annotationColorEven, missingValueColor, genderAnnotation, femaleColorEven, maleColorEven, statsFont, source, pam50subtypeColors, sampleTypesPresent, sampleTypes, sampleTypeColors);

    // draw the lines to indicate the probe locations (connect the methylation value barplots to the corresponding genomic location on the gene annotation)
    // by drawing these lines first we ensure that they will be in the background
    var promoterClass, probeNr;
    for (sample in queryResult['methylationData']) {
        probeNr = 0;
        for (pos in queryResult['methylationData'][sample]) {
            probeNr++;
            promoterClass = '';
            if (pos >= promoterStart && pos <= promoterEnd) {
                promoterClass = 'prom';
            }
            var probeLocationPlot = (pos - plotStart)/factor;
            svg.append('line')
                .attr('x1', -leftMargin)
                .attr('x2', -leftMargin + annotationWidth + 80)
                .attr('y1', height - y(probeLocationPlot))
                .attr('y2', height - y(probeLocationPlot))
                .attr('stroke', probeLocationLineColor)
                .attr('stroke-opacity', 0.5)
                .attr('stroke-width', 1)
                .attr('class', promoterClass)
                .attr('id', 'annotationLine' + pos);
            svg.append('line')
                .attr('x1', -leftMargin + annotationWidth + 80)
                .attr('x2', x(1))
                .attr('y1', height - y(probeLocationPlot))
                .attr('y2', height - y(probeNr - 1) + sampleRowHeight/2)
                .attr('stroke', probeLocationLineColor)
                .attr('stroke-opacity', 0.5)
                .attr('stroke-width', 1)
                .attr('class', promoterClass);
        }
        break; // we only need to loop through the positions of the first sample, since they are the same for all samples
    }
    
    // draw the gene
    svg.append('rect')
        .attr('fill', geneColor)
        .attr('x', -leftMargin + 7)
        .attr('y', height - y(geneStartPlot))
        .attr('width', geneWidth)
        .attr('height', y(numberOfProbes - (geneEndPlot - geneStartPlot)));
    
    // add an arrow head (>) to the end of the gene to indicate its strand (down for +, up for -)
    if (strand === '1') {
        svg.append('line')
            .attr('x1', -leftMargin + 4)
            .attr('x2', -leftMargin + 9)
            .attr('y1', y(numberOfProbes - (geneEndPlot - geneStartPlot)) + height - y(geneStartPlot) - 7)
            .attr('y2', y(numberOfProbes - (geneEndPlot - geneStartPlot)) + height - y(geneStartPlot))
            .style('stroke', geneColor)
            .attr('stroke-width', (geneWidth - 1))
            .attr('stroke-linecap', 'round');
        svg.append('line')
            .attr('x1', -leftMargin + 9)
            .attr('x2', -leftMargin + 14)
            .attr('y1', y(numberOfProbes - (geneEndPlot - geneStartPlot)) + height - y(geneStartPlot))
            .attr('y2', y(numberOfProbes - (geneEndPlot - geneStartPlot)) + height - y(geneStartPlot) - 7)
            .style('stroke', geneColor)
            .attr('stroke-width', (geneWidth - 1))
            .attr('stroke-linecap', 'round');
    } else {
        svg.append('line')
            .attr('x1', -leftMargin + 4)
            .attr('x2', -leftMargin + 9)
            .attr('y1', height - y(geneStartPlot) + 7)
            .attr('y2', height - y(geneStartPlot))
            .style('stroke', geneColor)
            .attr('stroke-width', (geneWidth - 1))
            .attr('stroke-linecap', 'round');
        svg.append('line')
            .attr('x1', -leftMargin + 9)
            .attr('x2', -leftMargin + 14)
            .attr('y1', height - y(geneStartPlot))
            .attr('y2', height - y(geneStartPlot) + 7)
            .style('stroke', geneColor)
            .attr('stroke-width', (geneWidth - 1))
            .attr('stroke-linecap', 'round');
    }
    
    // add the CpG islands
    var cpgiCount = 0;
    for (var c in cpgi) {
        cpgiCount++;
        cStart = cpgi[c]['start'];
        cEnd = cpgi[c]['end'];
        if (cStart < plotStart) {
            cStart = plotStart;
        }
        if (cEnd > plotEnd) {
            cEnd = plotEnd;
        }
        cStartPlot = (cStart - plotStart)/factor;
        cEndPlot = (cEnd - plotStart)/factor;
        svg.append('rect')
            .attr('fill', cpgiColor)
            .attr('x', -leftMargin + 18)
            .attr('y', height - y(cStartPlot))
            .attr('width', cpgiWidth)
            .attr('height', y(numberOfProbes - (cEndPlot - cStartPlot)));
    }
    
    // add the transcripts and the exons
    var tCount = 0;
    for (var t in transcripts) {
        tCount++;
        var tStart = +transcripts[t]['start'];
        var tEnd = +transcripts[t]['end'];
        var tStartPlot = (tStart - plotStart)/factor;
        var tEndPlot = (tEnd - plotStart)/factor;
        svg.append('rect')
            .attr('fill', transcriptColor)
            .attr('x', -leftMargin + 22 + (tCount*6))
            .attr('y', height - y(tStartPlot))
            .attr('width', transcriptWidth)
            .attr('height', y(numberOfProbes - (tEndPlot - tStartPlot)))
            .html('<title>' + t + '</title');
        // add the exons
        var exons = queryResult['transcripts'][t]['exons'];
        for (e in exons) {
            var eStart = +exons[e]['start'];
            var eEnd = +exons[e]['end'];
            eStartPlot = (eStart - plotStart)/factor;
            eEndPlot = (eEnd - plotStart)/factor;
            svg.append('rect')
                .attr('fill', exonColor)
                .attr('x', -leftMargin + 22 + (tCount*6))
                .attr('y', height - y(eStartPlot))
                .attr('width', transcriptWidth)
                .attr('height', y(numberOfProbes - (eEndPlot - eStartPlot)));
        }
    }
    
    // add a small scale bar to the plot
    // for layout reasons, this scale bar has to be a power of 10 and be close to 1/10th of the size of the gene
    var geneLengthPow = Math.round(Math.log(geneLength)/Math.log(10));
    var scaleBarLength = Math.pow(10, geneLengthPow - 1);
    if (scaleBarLength < 1000 && geneLength < 5000) {
        scaleBarLength = 1000;
    }
    var sStart, sEnd;
    if (strand === '1') {
        sStart = geneStart - scaleBarLength/2;
        sEnd = geneStart + scaleBarLength/2;
    } else {
        sStart = geneEnd - scaleBarLength/2;
        sEnd = geneEnd + scaleBarLength/2;
    }
    var sStartPlot = (sStart - plotStart)/factor;
    var sEndPlot = (sEnd - plotStart)/factor;
    svg.append('rect')
        .attr('fill', scaleBarColor)
        .attr('x', -leftMargin + 2)
        .attr('y', height - y(sStartPlot))
        .attr('width', 2)
        .attr('id', 'scaleBar')
        .attr('height', y(numberOfProbes - (sEndPlot - sStartPlot)));
    // add a text element that shows the length of the scale bar in kb
    var kbLength = scaleBarLength/1000;
    kbLength = kbLength + 'kb';
    var textY;
    if (strand == '1') {
        textY = y(sStartPlot) + 2;
    } else {
        textY = y(sEndPlot) - 10;
    }
    svg.append('text')
        .attr('x', -leftMargin + 1)
        .attr('y', height - textY)
        .attr('font-size', '9px')
        .attr('fill', scaleBarColor)
        .text(kbLength);
    
    // draw the expression data
    var expressionLineData = [];
    for (s in sortedSamplesReduced) {
        sample = sortedSamplesReduced[s];
        expression = expressionData[sample];
        expressionLineData.push(height - y(0) - (expression/20)*sampleRowHeight*3 - 10);
    }

    var areaAddedValue = 0; // this value is used to make the filled areas fit under the line
    // for some reason, the overlap is not 100% and depends on the number of samples
    if (numberOfSamples < 100) {
        areaAddedValue = 2;
    } else if (numberOfSamples < 200) {
        areaAddedValue = 1;
    }
    var expressionArea = d3.svg.area()
        .defined(function(d) { return d; })
        .x(function(d,i) { return x(i) + areaAddedValue; })
        .y1(function(d) { return d; })
        .y0(height - y(0) - 10);
    svg.append('path')
        .attr('d', expressionArea(expressionLineData))
        .attr('fill', expressionFillColor);
    
    // draw a horizontal line at the value of highest expression
    // (makes it easier to compare values accross the plot)
    svg.append('line')
        .attr('x1', x(1))
        .attr('x2', x(numberOfSamples))
        .attr('y1',height - y(0) - (maxExpression/20)*sampleRowHeight*3 - 10)
        .attr('y2', height - y(0) - (maxExpression/20)*sampleRowHeight*3 - 10)
        .style('stroke', expressionDashedLineColor)
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges')
        .attr('stroke-dasharray', '5,5');
    
    // draw a single line for all the expression data
    svg.append('path')
        .attr('d', line(expressionLineData))
        .style('stroke', expressionLineColor)
        .attr('stroke-width', 1)
        .attr('fill', 'none');
    // add the expression tag
    svg.append('text')
            .attr('x', -4)
            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight)
            .attr('class', 'clickable')
            .attr('id', 'expressionData')
            .attr('text-anchor', 'end')
            .attr('font-size', '12px')
            .attr('fill', '#aaa')
            .text('expression')
            .on('mouseup', function() {
                
                if (sorter !== 'expressionData') {
                    updatePlot(queryResult, gene, source, numberOfSamples, 'expressionData');
                }
                
            });
    
    // draw the methylation lines
    var probeNumber = 0;
    for (pos in methylationValuesByProbe) {
        probeNumber++;
        // change the methylation values for each probe to the appropriate y values for the plot
        var methylationDataProbe = methylationValuesByProbe[pos];
        var methylationLineData = [];
        for (s in methylationDataProbe) {
            var methylation = methylationDataProbe[s];
            if (isNaN(methylation)) {
                methylationLineData.push(null);
            } else {
                var yValue = height - y(probeNumber - 1) + (1 - methylation)*sampleRowHeight;
                methylationLineData.push(yValue);
            }
        }
        promoterClass = '';
        if (pos >= promoterStart && pos <= promoterEnd) {
            promoterClass = 'prom';
        }
        if (!methylationLineData.some(function(v){ return v !== null; })) {
            // test whether all elements are null or not (this line returns true if all elements are null)
            // add text to the plot explaining there is no methylation data available
            svg.append('text')
                .attr('x', 4)
                .attr('y', height - y(probeNumber - 1) + sampleRowHeight*0.75)
                .attr('text-anchor', 'start')
                .attr('font-size', '9px')
                .attr('class', promoterClass)
                .attr('fill', noMethDataColor)
                .text('no data');
        } else {
            // add the area under the line
            var methylationArea = d3.svg.area()
                .defined(function(d) { return d; })
                .x(function(d,i) { return x(i) + areaAddedValue; })
                .y1(function(d) { return d; })
                .y0(height - y(probeNumber - 1) + sampleRowHeight);
            svg.append('path')
                .attr('d', methylationArea(methylationLineData))
                .attr('class', promoterClass)
                .attr('fill', methylationFillColor);
            // add the line
            svg.append('path')
                .attr('d', line(methylationLineData))
                .attr('stroke', methylationLineColor)
                .attr('class', promoterClass + ' line')
                .attr('stroke-width', 1)
                .attr('fill', 'none');
        }
    }
    
    // add the 'hover' state for each probe (when hovering the line area for a probe, the genomic location gets highlighted)
    var probePositions = [];
    for (s in sortedSamplesReduced) {
        sample = sortedSamplesReduced[s];
        probeNr = 0;
        if (methylationData[sample]) {
            for (pos in methylationData[sample]) {
                probeNr++;
                probePositions.push(pos);
                var probeId = queryResult['probeIds'][pos];
                svg.append('rect')
                    .attr('fill', '#fff')
                    .attr('fill-opacity', 0)
                    .attr('x', x(0))
                    .attr('y', height - y(probeNr - 1))
                    .attr('width', sampleColumnWidth*numberOfSamples)
                    .attr('height', sampleRowHeight)
                    .attr('id', pos + '_' + probeId + '_' + probeNr)
                    .attr('class', 'clickable')
                    .on('mouseover', function() {
                        
                        var positionProbeId = $(this).attr('id');
                        var position = positionProbeId.replace(/_.+$/, '');
                        var probeId = positionProbeId.replace(/^.+?_/, '');
                        probeId = probeId.replace(/_.+$/, '');
                        var probeLocationPlot = (position - plotStart)/factor;
                        // add a background for the probe ID text
                        svg.append('text')
                            .attr('x', -74)
                            .attr('y', height - y(probeLocationPlot) - 6)
                            .attr('text-anchor', 'end')
                            .attr('class', 'probeId')
                            .attr('font-size', '11px')
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 4)
                            .text(probeId);
                        svg.append('text')
                            .attr('x', -74)
                            .attr('y', height - y(probeLocationPlot) - 6)
                            .attr('text-anchor', 'end')
                            .attr('class', 'probeId')
                            .attr('font-size', '11px')
                            .attr('fill', methylationLineColor)
                            .text(probeId);
                        svg.append('line')
                            .attr('x1', -leftMargin)
                            .attr('x2', -leftMargin + annotationWidth + 80)
                            .attr('y1', height - y(probeLocationPlot))
                            .attr('y2', height - y(probeLocationPlot))
                            .style('stroke', methylationLineColor)
                            .attr('stroke-width', 2)
                            .attr('class', 'focusLine');
                        
                    })
                    .on('mouseout', function() {
                        
                        $('.focusLine').remove();
                        $('.probeId').remove();
                        
                    })
                    .on('mouseup', function() {
                        
                        // get the id of the clicked DOM element
                        var positionProbeId = $(this).attr('id');
                        // get the id of the probe ID DOM element
                        // if it matches the id of the clicked element we remove the probe ID
                        var existingId = $('.probeIdClicked').attr('id');
                        // remove the existing probe ID
                        $('.focusLineClicked').remove();
                        $('.probeIdClicked').remove();
                        $('.probeInfo').remove();
                        if (existingId !== positionProbeId) {
                            // add a new probe ID
                            var chromosome = queryResult['geneInfo']['chr'];
                            var position = positionProbeId.replace(/_.+$/, '');
                            var probeId = positionProbeId.replace(/^.+?_/, '');
                            probeId = probeId.replace(/_.+$/, '');
                            var probeNumber = positionProbeId.replace(/^.+_/, '');
                            var probeLocationPlot = (position - plotStart)/factor;
                            // add a background for the probe ID text
                            svg.append('text')
                                .attr('x', -74)
                                .attr('y', height - y(probeLocationPlot) - 6)
                                .attr('text-anchor', 'end')
                                .attr('class', 'probeIdClicked containsProbeId')
                                .attr('id', positionProbeId)
                                .attr('font-size', '11px')
                                .attr('stroke', '#fff')
                                .attr('stroke-width', 4)
                                .text(probeId);
                            svg.append('text')
                                .attr('x', -74)
                                .attr('y', height - y(probeLocationPlot) - 6)
                                .attr('text-anchor', 'end')
                                .attr('class', 'probeIdClicked clickable')
                                .attr('font-size', '11px')
                                .attr('fill', methylationLineColor)
                                .text(probeId)
                                .on('mouseup', function() {
                                    var annotation = queryResult['probeAnnotation'][position];
                                    // replace the '-' character by the plus over minus character
                                    annotation = annotation.replace(/-/g, ' \u00B1 ');
                                    var annWidth = 140;
                                    if (annotation.length > 20) {
                                        annWidth = 180;
                                    }
                                    // show the probe annotation
                                    svg.append('rect')
                                        .attr('x', -142)
                                        .attr('y', height - y(probeLocationPlot) - 24)
                                        .attr('width', annWidth)
                                        .attr('height', 66)
                                        .attr('fill', '#fff')
                                        .attr('stroke', methylationLineColor)
                                        .attr('stroke-width', 2)
                                        .attr('class', 'probeInfo clickable')
                                        .on('mouseup', function() {
                                            $('.probeInfo').remove();
                                        });
                                    svg.append('text')
                                        .attr('x', -136)
                                        .attr('y', height - y(probeLocationPlot) - 6)
                                        .attr('class', 'probeInfo')
                                        .attr('font-weight', 'bold')
                                        .text(probeId);
                                    // probe location & annotation
                                    svg.append('text')
                                        .attr('x', -136)
                                        .attr('y', height - y(probeLocationPlot) + 14)
                                        .attr('class', 'probeInfo')
                                        .text('chr' + chromosome + ':' + position);
                                    svg.append('text')
                                        .attr('x', -136)
                                        .attr('y', height - y(probeLocationPlot) + 30)
                                        .attr('class', 'probeInfo')
                                        .text(annotation);
                                    // add a multiplication character to indicate that the annotation info can be closed
                                    svg.append('text')
                                        .attr('x', -142 + annWidth - 20)
                                        .attr('y', height - y(probeLocationPlot) - 4)
                                        .attr('class', 'probeInfo clickable')
                                        .attr('font-size', '18px')
                                        .attr('font-weight', 'bold')
                                        .attr('fill', methylationLineColor)
                                        .text('\u00D7')
                                        .on('mouseup', function() {
                                            $('.probeInfo').remove();
                                        });
                                });
                            svg.append('line')
                                .attr('x1', -leftMargin)
                                .attr('x2', -leftMargin + annotationWidth + 80)
                                .attr('y1', height - y(probeLocationPlot))
                                .attr('y2', height - y(probeLocationPlot))
                                .style('stroke', methylationLineColor)
                                .attr('stroke-width', 2)
                                .attr('class', 'focusLineClicked');
                            svg.append('line')
                                .attr('x1', -leftMargin + annotationWidth + 80)
                                .attr('x2', x(1))
                                .attr('y1', height - y(probeLocationPlot))
                                .attr('y2', height - y(probeNumber - 1) + sampleRowHeight/2)
                                .style('stroke', methylationLineColor)
                                .attr('stroke-width', 2)
                                .attr('class', 'focusLineClicked');
                        }
                        
                    });
            }
            break; // only need to loop once, because the probes are the same for every sample
        }
    }
    
    // add the correlation values
    // loop through the probes and calculate the correlation value between the methylation and expression for each sample
    probeNr = 0;
    if (sorter === 'expressionData') {
        for (pos in probePositions) {
            probeNr++;
            // use the stats object to find the correlation values
            stat = stats[sorter][probePositions[pos]];
            if (stat['r']) {
                r = stat['r'];
                if (r !== 'failed') {
                    p = parseFloat(stat['rp']);
                    rString = formatCorrelation(r, p);
                    correlationColor = '#aaa';
                    correlationWeight = 'normal';
                    if (p < 0.05) {
                        correlationColor = '#666';
                        correlationWeight = 'bold';
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(probeNr - 1) + sampleRowHeight - 4)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', correlationWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', correlationColor)
                        .text(rString);
                }
            }
        }
    } else {
        for (pos in probePositions) {
            probeNr++;
            stat = stats[sorter][probePositions[pos]];
            if (stat['p'] || stat['p'] === 0) {
                p = stat['p'];
                if (p !== 'failed') {
                    significanceColor = '#aaa';
                    significanceWeight = 'normal';
                    pNum = parseFloat(p);
                    if (pNum < 0.05) {
                        significanceColor = '#666';
                        significanceWeight = 'bold';
                    }
                    if (pNum < 10*Math.pow(10, -16)) {
                        p = 'p < 2.2e-16';
                    } else {
                        p = 'p = ' + p;
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(probeNr - 1) + sampleRowHeight - 4)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', significanceWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', significanceColor)
                        .text(p);
                }
            } else if (stat['r']) {
                r = stat['r'];
                if (r !== 'failed') {
                    p = parseFloat(stat['rp']);
                    rString = formatCorrelation(r, p);
                    correlationColor = '#aaa';
                    correlationWeight = 'normal';
                    if (p < 0.05) {
                        correlationColor = '#666';
                        correlationWeight = 'bold';
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(probeNr - 1) + sampleRowHeight - 4)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', correlationWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', correlationColor)
                        .text(rString);
                }
            }
        }
    }
    
    if (queryResult['annotation'] !== 'no_annotation') {
        // add the annotation data
        sampleNr = 0;
        
        for (s in sortedSamplesReduced) {
            sample = sortedSamplesReduced[s];
            patient = sample.replace(/_\d\d$/, '');
            var annotationColor;
            if (sampleNr % 2 === 0) {
                annotationColor = annotationColorEven;
            } else {
                annotationColor = annotationColorUneven;
            }
            code = sample.replace(/^.+_(\d\d)$/, '$1');
            var sampleType = sampleTypes[code];
            var sampleTypeColor = sampleTypeColors[code];

            annotationCount = 1;

            // draw a rectangle for the batch number
            /*var batch = queryResult['batch'][sample];
            svg.append('rect')
                .attr('fill', batchColors[batch])
                .attr('x', x(sampleNr))
                .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount + annotationRowHeight/4)
                .attr('width', sampleColumnWidth)
                .attr('height', annotationRowHeight/2)
                .attr('id', batch)
                .on('mouseover', function() {
                    var batchId = $(this).attr('id');
                    svg.append('text')
                        .attr('x', -4)
                        .attr('y', -2*sampleRowHeight - 2)
                        .attr('text-anchor', 'end')
                        .attr('class', 'batchId')
                        .attr('font-size', '12px')
                        .attr('fill', 'rgb(100,100,100)')
                        .text(batchId);
                })
                .on('mouseout', function() {
                    $('.batchId').remove();
                });
            annotationCount++;*/
            
            // draw a rectangle for the sample type
            svg.append('rect')
                .attr('fill', sampleTypeColor)
                .attr('x', x(sampleNr))
                .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount)
                .attr('width', sampleColumnWidth)
                .attr('height', annotationRowHeight);

            // draw a rectangle for the brca pam50 subtype
            if (source === 'BRCA breast invasive carcinoma') {
                annotationCount++;
                var pam50subtype;
                if (sample in queryResult['pam50']) {
                    pam50subtype = queryResult['pam50'][sample];
                } else {
                    pam50subtype = 'no data';
                }
                var pam50color = pam50subtypeColors[pam50subtype];
                svg.append('rect')
                    .attr('fill', pam50color)
                    .attr('x', x(sampleNr))
                    .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount)
                    .attr('width', sampleColumnWidth)
                    .attr('height', annotationRowHeight);
            }
            
            if (annotationData[patient] !== 'no_annotation') {
                for (annotation in annotationData[patient]) {
                    annotationValue = annotationData[patient][annotation];
                    // different color for gender
                    var genderColor;
                    if (annotation === 'gender') {
                        if (annotationValue == 1) { // female
                            if (sampleNr % 2 === 0) {
                                genderColor = femaleColorEven;
                            } else {
                                genderColor = femaleColorUneven;
                            }
                        } else { // male
                            if (sampleNr % 2 === 0) {
                                genderColor = maleColorEven;
                            } else {
                                genderColor = maleColorUneven;
                            }
                        }
                    }
                    var eyeColor;
                    if (annotation === 'eye_color') {
                        if (annotationValue == 1) { // blue eyes
                            if (sampleNr % 2 === 0) {
                                eyeColor = blueEyesEven;
                            } else {
                                eyeColor = blueEyesUneven;
                            }
                        } else if (annotationValue == 2) { // brown eyes
                            if (sampleNr % 2 === 0) {
                                eyeColor = brownEyesEven;
                            } else {
                                eyeColor = brownEyesUneven;
                            }
                        } else { // green eyes
                            if (sampleNr % 2 === 0) {
                                eyeColor = greenEyesEven;
                            } else {
                                eyeColor = greenEyesUneven;
                            }
                        }
                    }
                    var maxAnnotationValue = maxAnnotationValues[annotation];
                    annotationCount++;
                    if (annotationValue === null) {
                        svg.append('rect')
                            .attr('fill', missingValueColor)
                            .attr('x', x(sampleNr))
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount)
                            .attr('width', sampleColumnWidth)
                            .attr('height', annotationRowHeight);
                    } else {
                        if (annotation === 'gender') {
                            rectHeight = annotationRowHeight;
                            yPos = height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount + (annotationRowHeight - rectHeight);
                            svg.append('rect')
                                .attr('fill', genderColor)
                                .attr('x', x(sampleNr))
                                .attr('y', yPos)
                                .attr('width', sampleColumnWidth)
                                .attr('height', rectHeight);
                        } else if (annotation === 'eye_color') {
                            rectHeight = annotationRowHeight;
                            yPos = height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount + (annotationRowHeight - rectHeight);
                            svg.append('rect')
                                .attr('fill', eyeColor)
                                .attr('x', x(sampleNr))
                                .attr('y', yPos)
                                .attr('width', sampleColumnWidth)
                                .attr('height', rectHeight);
                        } else {
                            rectHeight = (annotationRowHeight/maxAnnotationValue)*annotationValue;
                            yPos = height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount + (annotationRowHeight - rectHeight);
                            svg.append('rect')
                                .attr('fill', annotationColor)
                                .attr('x', x(sampleNr))
                                .attr('y', yPos)
                                .attr('width', sampleColumnWidth)
                                .attr('height', rectHeight);
                        }
                    }
                }
            } else {
                svg.append('rect')
                    .attr('fill', missingValueColor)
                    .attr('x', x(sampleNr))
                    .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*(maxNumberOfAnnotationFields - maxNumberOfSlideFields))
                    .attr('width', sampleColumnWidth)
                    .attr('height', (annotationRowHeight + 1)*(maxNumberOfAnnotationFields - 1 - maxNumberOfSlideFields) - 1);
            }

            sampleNr++;

        }
        
        if (sorter === 'expressionData') {
            // add the annotation correlation and p values to the plot
            // sample type
            annotationCount = 0; // without batch ID
            //var annotationCount = 1; // with batch ID
            stat = stats[sorter]['sample type'];
            if (stat['p'] || stat['p'] === 0) {
                p = stat['p'];
                if (p !== 'failed') {
                    significanceColor = '#aaa';
                    significanceWeight = 'normal';
                    pNum = parseFloat(p);
                    if (pNum < 0.05) {
                        significanceColor = '#666';
                        significanceWeight = 'bold';
                    }
                    if (pNum < 10*Math.pow(10, -16)) {
                        p = 'p < 2.2e-16';
                    } else {
                        p = 'p = ' + p;
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', significanceWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', significanceColor)
                        .text(p);
                }
            }
            // other annotation fields
            if (source === 'BRCA breast invasive carcinoma') {
                annotationCount++;
            }
            for (annotation in maxAnnotationValues) {
                annotationCount++;
                stat = stats[sorter][annotation];
                if (stat['p'] || stat['p'] === 0) {
                    p = stat['p'];
                    if (p !== 'failed') {
                        significanceColor = '#aaa';
                        significanceWeight = 'normal';
                        pNum = parseFloat(p);
                        if (pNum < 0.05) {
                            significanceColor = '#666';
                            significanceWeight = 'bold';
                        }
                        if (pNum < 10*Math.pow(10, -16)) {
                            p = 'p < 2.2e-16';
                        } else {
                            p = 'p = ' + p;
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', significanceWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', significanceColor)
                            .text(p);
                    }
                } else if (stat['r']) {
                    r = stat['r'];
                    if (r !== 'failed') {
                        p = parseFloat(stat['rp']);
                        rString = formatCorrelation(r, p);
                        correlationColor = '#aaa';
                        correlationWeight = 'normal';
                        if (p < 0.05) {
                            correlationColor = '#666';
                            correlationWeight = 'bold';
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', correlationWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', correlationColor)
                            .text(rString);
                    }
                }
            }
            // slide fields
            slideFieldCount = maxNumberOfAnnotationFields - maxNumberOfSlideFields; // reset the slide field counter
            for (field in slideFieldsArray) {
                fieldName = slideFieldsArray[field];
                stat = stats['expressionData'][fieldName];
                if (stat['r']) {
                    r = stat['r'];
                    if (r !== 'failed') {
                        p = parseFloat(stat['rp']);
                        rString = formatCorrelation(r, p);
                        correlationColor = '#aaa';
                        correlationWeight = 'normal';
                        if (p < 0.05) {
                            correlationColor = '#666';
                            correlationWeight = 'bold';
                        }
                        svg.append('text')
                            .attr('x', x(sampleNr) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount - 4)
                            .attr('class', fieldName)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', correlationWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', correlationColor)
                            .text(rString);
                    }
                }
                slideFieldCount++;
            }
        } else if (sorter === 'sample type') {
            stat = stats[sorter]['expressionData'];
            if (stat['n']) {
                answer = stat['n'];
                svg.append('text')
                    .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                    .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight)
                    .attr('font-size', statsTextSize)
                    .attr('font-family', statsFont)
                    .attr('fill', '#aaa')
                    .text(answer);
            } else if (stat['p'] || stat['p'] === 0) {
                p = stat['p'];
                if (p !== 'failed') {
                    significanceColor = '#aaa';
                    significanceWeight = 'normal';
                    pNum = parseFloat(p);
                    if (pNum < 0.05) {
                        significanceColor = '#666';
                        significanceWeight = 'bold';
                    }
                    if (pNum < 10*Math.pow(10, -16)) {
                        p = 'p < 2.2e-16';
                    } else {
                        p = 'p = ' + p;
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', significanceWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', significanceColor)
                        .text(p);
                }
            }
            // get the methylation difference between normal and tumor samples
            probeNr = 0;
            for (pos in probePositions) {
                probeNr++;
                stat = stats[sorter][probePositions[pos]];
                if (stat['p'] || stat['p'] === 0) {
                    p = stat['p'];
                    if (p !== 'failed') {
                        significanceColor = '#aaa';
                        significanceWeight = 'normal';
                        pNum = parseFloat(p);
                        if (pNum < 0.05) {
                            significanceColor = '#666';
                            significanceWeight = 'bold';
                        }
                        if (pNum < 10*Math.pow(10, -16)) {
                            p = 'p < 2.2e-16';
                        } else {
                            p = 'p = ' + p;
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(probeNr - 1) + sampleRowHeight - 4)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', significanceWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', significanceColor)
                            .text(p);
                    }
                }
            }
        } else {
            stat = stats[sorter]['expressionData'];
            if (stat['p'] || stat['p'] === 0) {
                p = stat['p'];
                if (p !== 'failed') {
                    significanceColor = '#aaa';
                    significanceWeight = 'normal';
                    pNum = parseFloat(p);
                    if (pNum < 0.05) {
                        significanceColor = '#666';
                        significanceWeight = 'bold';
                    }
                    if (pNum < 10*Math.pow(10, -16)) {
                        p = 'p < 2.2e-16';
                    } else {
                        p = 'p = ' + p;
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', significanceWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', significanceColor)
                        .text(p);
                }
            } else if (stat['r']) {
                r = stat['r'];
                if (r !== 'failed') {
                    p = parseFloat(stat['rp']);
                    rString = formatCorrelation(r, p);
                    correlationColor = '#aaa';
                    correlationWeight = 'normal';
                    if (p < 0.05) {
                        correlationColor = '#666';
                        correlationWeight = 'bold';
                    }
                    svg.append('text')
                        .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight)
                        .attr('font-size', statsTextSize)
                        .attr('font-weight', correlationWeight)
                        .attr('font-family', statsFont)
                        .attr('fill', correlationColor)
                        .text(rString);
                }
            }
        }
        
        // add the annotation names to the plot
        annotationCount = 0;
        
        /*svg.append('text')
            .attr('x', -4)
            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (sampleRowHeight + 1)*annotationCount - 4)
            .attr('class', 'clickable')
            .attr('font-size', '12px')
            .attr('fill', '#aaa')
            .attr('id', 'batch number')
            .attr('text-anchor', 'end')
            .text('batch number')
            .on('mouseup', function() { 
                
                var ann = $(this).text();
                ann = ann.replace(/\u2192 /, '');
                if (ann !== sorter) {
                    updatePlot(queryResult, gene, source, numberOfSamples, ann);
                }
                
            });
        annotationCount++;*/

        svg.append('text')
            .attr('x', -4)
            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (sampleRowHeight + 1)*annotationCount - 4)
            .attr('class', 'clickable')
            .attr('font-size', '12px')
            .attr('fill', '#aaa')
            .attr('id', 'sample type')
            .attr('text-anchor', 'end')
            .text('sample type')
            .on('mouseup', function() {
                
                var ann = $(this).text();
                ann = ann.replace(/\u2192 /, '');
                if (ann !== sorter) {
                    updatePlot(queryResult, gene, source, numberOfSamples, ann);
                }
                
            });
        if (source === 'BRCA breast invasive carcinoma') {
            annotationCount++;
            svg.append('text')
                .attr('x', -4)
                .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (sampleRowHeight + 1)*annotationCount)
                .attr('class', 'clickable')
                .attr('font-size', '12px')
                .attr('fill', '#aaa')
                .attr('id', 'PAM50 subtype')
                .attr('text-anchor', 'end')
                .text('PAM50 subtype')
                .on('mouseup', function() {
                    
                    var ann = $(this).text();
                    ann = ann.replace(/\u2192 /, '');
                    if (ann !== sorter) {
                        updatePlot(queryResult, gene, source, numberOfSamples, ann);
                    }
                    
                });
        }
        // add the correlation/p values for the annotation values
        for (annotation in maxAnnotationValues) {
            annotationCount++;
            annotation = annotation.replace(/_/g, ' ');
            svg.append('text')
                .attr('x', -4)
                .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                .attr('class', 'clickable')
                .attr('font-size', '12px')
                .attr('fill', '#aaa')
                .attr('id', annotation.replace(/ /g, '_'))
                .attr('text-anchor', 'end')
                .text(annotation)
                .on('mouseup', function() {
                    
                    var ann = $(this).text();
                    ann = ann.replace(/ /g, '_');
                    ann = ann.replace(/\u2192_/, '');
                    if (ann !== sorter) {
                        updatePlot(queryResult, gene, source, numberOfSamples, ann);
                    }
                    
                });
            ann = annotation.replace(/ /g, '_');
            if (ann !== sorter && sorter !== 'expressionData') {
                stat = stats[sorter][ann];
                if (stat['p'] || stat['p'] === 0) {
                    p = stat['p'];
                    if (p !== 'failed') {
                        significanceColor = '#aaa';
                        significanceWeight = 'normal';
                        pNum = parseFloat(p);
                        if (pNum < 0.05) {
                            significanceColor = '#666';
                            significanceWeight = 'bold';
                        }
                        if (pNum < 10*Math.pow(10, -16)) {
                            p = 'p < 2.2e-16';
                        } else {
                            p = 'p = ' + p;
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', significanceWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', significanceColor)
                            .text(p);
                    }
                } else if (stat['r']) {
                    r = stat['r'];
                    if (r !== 'failed') {
                        p = parseFloat(stat['rp']);
                        rString = formatCorrelation(r, p);
                        correlationColor = '#aaa';
                        correlationWeight = 'normal';
                        if (p < 0.05) {
                            correlationColor = '#666';
                            correlationWeight = 'bold';
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*annotationCount - 4)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', correlationWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', correlationColor)
                            .text(rString);
                    }
                }
            }
        }
    }
    
    // add the biospecimen slide data
    if (queryResult['slide'] !== 'no_data') {
        sampleNr = 0;
        var numberOfSlideFields = queryResult['slide']['numberOfSlideFields'];
        slideFieldsArray = [];
        for (s in sortedSamplesReduced) {
            sample = sortedSamplesReduced[s];
            if (slideData[sample] !== 'no_data') {
                for (slideField in slideData[sample]) {
                    if ($.inArray(slideField, slideFieldsArray) === -1) {
                        slideFieldsArray.push(slideField);
                    }
                }
                break;
            }
        }
        for (s in sortedSamplesReduced) {
            sample = sortedSamplesReduced[s];
            //sampleNr++;
            if (slideData[sample] !== 'no_data') {
                var slideFieldColor;
                if (sampleNr % 2 === 0) {
                    slideFieldColor = annotationColorEven;
                } else {
                    slideFieldColor = annotationColorUneven;
                }
                slideFieldCount = maxNumberOfAnnotationFields - maxNumberOfSlideFields; // needs to start above the already plotted annotation rows
                for (slideField in slideData[sample]) {
                    slideFieldCount++;
                    // plot the rectangle
                    slideFieldValue = slideData[sample][slideField];
                    if (typeof slideData[sample][slideField] != 'undefined') {
                        rectHeight = (annotationRowHeight/100)*slideFieldValue;
                        yPos = height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount + (annotationRowHeight - rectHeight);
                        svg.append('rect')
                            .attr('fill', slideFieldColor)
                            .attr('x', x(sampleNr))
                            .attr('y', yPos)
                            .attr('width', sampleColumnWidth)
                            .attr('height', rectHeight)
                            .attr('class', slideField);
                    }
                }
            } else {
                slideFieldCount = maxNumberOfAnnotationFields - maxNumberOfSlideFields; // needs to start above the already plotted annotation rows
                for (field in slideFieldsArray) {
                    slideFieldCount++;
                    svg.append('rect')
                        .attr('fill', missingValueColor)
                        .attr('x', x(sampleNr))
                        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount - 1)
                        .attr('width', sampleColumnWidth)
                        .attr('height', (annotationRowHeight + 1))
                        .attr('class', slideFieldsArray[field]);
                }
            }
            sampleNr++;
        }
        // add the slide field annotation names
        slideFieldCount = maxNumberOfAnnotationFields - maxNumberOfSlideFields; // needs to start above the already plotted annotation rows
        for (field in slideFieldsArray) {
            fieldName = slideFieldsArray[field];
            annotation = fieldName.replace(/_/g, ' ');
            svg.append('text')
                .attr('x', -4)
                .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount - 4)
                .attr('class', fieldName + ' clickable')
                .attr('font-size', '12px')
                .attr('fill', '#aaa')
                .attr('id', fieldName)
                .attr('text-anchor', 'end')
                .text(annotation)
                .on('mouseup', function() {
                    
                    var ann = $(this).text();
                    ann = ann.replace(/ /g, '_');
                    ann = ann.replace(/\u2192_/, '');
                    if (ann !== sorter) {
                        updatePlot(queryResult, gene, source, numberOfSamples, ann);
                    }
                    
                });
        }
        // add the correlation values/p values for the slide field annotations
        slideFieldCount = maxNumberOfAnnotationFields - maxNumberOfSlideFields; // reset the slide field counter
        for (field in slideFieldsArray) {
            fieldName = slideFieldsArray[field];
            if (fieldName !== sorter && sorter !== 'expressionData') {
                stat = stats[sorter][fieldName];
                if (stat['r']) {
                    r = stat['r'];
                    if (r !== 'failed') {
                        p = parseFloat(stat['rp']);
                        rString = formatCorrelation(r, p);
                        correlationColor = '#aaa';
                        correlationWeight = 'normal';
                        if (p < 0.05) {
                            correlationColor = '#666';
                            correlationWeight = 'bold';
                        }
                        svg.append('text')
                            .attr('x', x(sampleNr) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount - 4)
                            .attr('class', fieldName)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', correlationWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', correlationColor)
                            .text(rString);
                    }
                } else if (stat['p'] || stat['p'] === 0) {
                    p = stat['p'];
                    if (p !== 'failed') {
                        significanceColor = '#aaa';
                        significanceWeight = 'normal';
                        pNum = parseFloat(p);
                        if (pNum < 0.05) {
                            significanceColor = '#666';
                            significanceWeight = 'bold';
                        }
                        if (pNum < 10*Math.pow(10, -16)) {
                            p = 'p < 2.2e-16';
                        } else {
                            p = 'p = ' + p;
                        }
                        svg.append('text')
                            .attr('x', x(numberOfSamples) + 4*sampleColumnWidth)
                            .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*slideFieldCount - 4)
                            .attr('class', fieldName)
                            .attr('font-size', statsTextSize)
                            .attr('font-weight', significanceWeight)
                            .attr('font-family', statsFont)
                            .attr('fill', significanceColor)
                            .text(p);
                    }
                }
            }
            slideFieldCount++;
        }
    }
    
    // make the text of the selected sorter bold and add an arrow
    document.getElementById(sorter).setAttribute('font-weight', 'bold');
    document.getElementById(sorter).setAttribute('font-size', '13px');
    document.getElementById(sorter).setAttribute('fill', 'rgb(100,100,100)');
    var sorterText = sorter.replace(/_/g, ' ');
    sorterText = sorterText.replace(/Data/, '');
    var sorterTextNode = document.getElementById(sorter).firstChild;
    sorterTextNode.nodeValue = '\u25ba ' + sorterText;
    // add a short description to the plot to make it clear what the statistics on the right side mean
    svg.append('text')
        .attr('x', width + rightMargin - 12)
        .attr('y', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*maxNumberOfAnnotationFields - 14)
        .attr('font-size', statsTextSize)
        .attr('font-family', statsFont)
        .attr('text-anchor', 'end')
        .attr('fill', '#aaa')
        .text('comparison to: ' + sorterText);
    svg.append('line')
        .attr('x1', width + rightMargin - 12)
        .attr('x2', width + rightMargin - 12 - 6.6*sorterText.length)
        .attr('y1', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*maxNumberOfAnnotationFields - 10)
        .attr('y2', height - y(0) - 10 - (maxExpression/20)*sampleRowHeight*3 - 10 - (annotationRowHeight + 1)*maxNumberOfAnnotationFields - 10)
        .style('stroke', '#aaa')
        .attr('stroke-width', 1)
        .attr('shape-rendering', 'crispEdges');
    
    // update the plotInfo div with the gene name and genomic range of the plot
    var ensembl = queryResult['geneInfo']['ensembl'];
    var hgnc = queryResult['geneInfo']['hgnc'];
    var chromosome = queryResult['geneInfo']['chr'];
    var start = queryResult['geneInfo']['start'];
    start = start.toString();
    var startComma = '';
    while (start.length >= 3){
        startComma = start.substring(start.length - 3) + ',' + startComma;
        start = start.substring(0, start.length - 3);
    }
    startComma = start + ',' + startComma;
    startComma = startComma.replace(/,$/, '');
    startComma = startComma.replace(/^,/, '');
    var end = queryResult['geneInfo']['end'];
    end = end.toString();
    var endComma = '';
    while (end.length >= 3){
        endComma = end.substring(end.length - 3) + ',' + endComma;
        end = end.substring(0, end.length - 3);
    }
    endComma = end + ',' + endComma;
    endComma = endComma.replace(/,$/, '');
    endComma = endComma.replace(/^,/, '');
    var ucscPosition = 'chr' + chromosome + ':' + startComma + '-' + endComma;
    if (hgnc === '') {
        $('.plotInfo').html('<p><strong>' + ensembl + '</strong> <a href="http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=' + ucscPosition + '" target="_blank" title="This link will take you to the UCSC Genome Browser">' + ucscPosition + '</a></p>');
    } else {
        $('.plotInfo').html('<p><strong><a href="http://www.genecards.org/cgi-bin/carddisp.pl?gene=' + hgnc + '" target="_blank" title="This link will take you to the GeneCards.org page for ' + hgnc + '.">' + hgnc + '</a></strong> <span class="ensembl">' + ensembl + '</span> <a href="http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=' + ucscPosition + '" target="_blank" title="This link will take you to the UCSC Genome Browser">' + ucscPosition + '</a></p>');
    }
    $('.plotInfo').append('<div class="promoterSelectionButton noselect">highlight promoter probes</div>');
    $('.promoterSelectionButton').on('click', function(){
        
        // highlight the promoter probes
        $('.prom').each(function() {
            var col;
            var probe = $(this);
            if (probe.is('path')) {
                if (probe.attr('class').match(/line/)) {
                    col = probe.attr('stroke');
                    if (col === methylationLineColor) {
                        probe.attr('stroke', selectedMethLineColor);
                    } else {
                        probe.attr('stroke', methylationLineColor);
                    }
                } else {
                    col = probe.attr('fill');
                    if (col === methylationFillColor) {
                        probe.attr('fill', selectedMethFillColor);
                    } else {
                        probe.attr('fill', methylationFillColor);
                    }
                }
            } else if (probe.is('text')) {
                col = probe.attr('fill');
                if (col === noMethDataColor) {
                    probe.attr('fill', selectedMethLineColor);
                } else {
                    probe.attr('fill', noMethDataColor);
                }
            } else if (probe.is('line')) {
                col = probe.attr('stroke');
                if (col === probeLocationLineColor) {
                    probe.attr('stroke', selectedProbeColor);
                } else {
                    probe.attr('stroke', probeLocationLineColor);
                }
            }
        });
        
    });

    // create a download link to allow the user to download the current image
    // this function can be found in the file downloadSvg.js
    prepareSvgForDownload(gene, source, sorter);
    
}

function checkUserInput() {
    
    $('#userInputForm .inputButton').toggleClass('inactive');
    removeMessages();
    // get the selected gene
    var gene = $('#gene').val();
    gene = gene.replace(/[<>\\\/;'"()=\[\]\{\}]/g, '');
    // get the selected source
    var source = $('.sampleSelectionList').find('.selectedSample').text();
    if (gene === '') {
        $('#userInputForm .inputButton').toggleClass('inactive');
        $('#userInputForm .inputButton').click(true);
        $('#gene').focus();
        $('<div class="warningMessage">Don\'t forget to enter a gene name!</div>').hide().appendTo('#userInputForm').fadeIn(200);
    } else if (source === '') {
        $('#userInputForm .inputButton').toggleClass('inactive');
        $('#userInputForm .inputButton').click(true);
        $('<div class="warningMessage">Don\'t forget to select a source!</div>').hide().appendTo('#userInputForm').fadeIn(200);
    } else if (gene !== '' && source !== '') {
        plotPreparation();
    }
    
}

function plotPreparation() {
    
    removeMessages();
    // get the selected gene
    var gene = $('#gene').val();
    gene = gene.replace(/[<>\\\/;'"()=\[\]\{\}]/g, '');
    // get the selected source
    var sourceName = $('.sampleSelectionList').find('.selectedSample').find('.sourceName').text();
    var fullSourceName = $('.sampleSelectionList').find('.selectedSample').find('.fullSourceName').attr('title');
    var source = sourceName + ' ' + fullSourceName;
    // remove the download button
    $('.downloadButton').remove();
    // change the layout of the plot container
    $('.loadingAnimation').show();
    $('.plotContainer').css('background', '#fff');
    $('.plotContainer').css('border', 'none');
    $('.plotWindow').toggleClass('transparent');
    $('.plotInfo').toggleClass('transparent');
    // check if there is already a plot present
    // if there isn't: create a new one
    // if there is: clear the existing one
    if ($('svg').length) {
        $('.plotInfo').empty();
        $('.plotWindow').empty();
    }
    // determine the number of samples the user requested
    // this number is used to determine the height of the plot
    var numberOfSamples;
    var request = $.ajax({
        type: 'POST',
        url: 'php/numberOfSamples.php?source=' + source,
        dataType: 'json',
        success: function(response) {
            
            var numberOfSamples = response.nrow;
            $('<div class="infoMessage">' + numberOfSamples + ' samples selected</div>').hide().appendTo('#userInputForm').fadeIn(500);
            createNewPlot(gene, source, numberOfSamples);
            
        },
        error: function() {
            
            // no data was found
            $('<div class="errorMessage">Database error.<br>(could not retrieve the number of samples)</div>').hide().appendTo('#userInputForm').fadeIn(500);
            // hide the plot window
            $('.plotWindow').toggleClass('hidden');
            $('#userInputForm .inputButton').toggleClass('inactive');
            $('.loadingAnimation').hide();
            $('.plotContainer').css('background', '#f6f6f6');
            $('.plotContainer').css('border', '4px solid #efefef');
            
        }
    });
    
}

function createNewPlot(gene, source, numberOfSamples) {
    
    d3.json('php/geneNameQuery.php?gene=' + gene + '&source=' + source, function(error, data) {
        
        var queryResult = data;
        var successTest = queryResult['success']; // true or false depending on whether methylation data was available for the gene or not
        if (!successTest) {
            // no data was found, either because the gene provided doesn't exist, or because there was no methylation data available
            var errorMessage = queryResult['message'];
            $('<div class="errorMessage">' + errorMessage + '</div>').hide().appendTo('#userInputForm').fadeIn(200);
            // hide the plot window
            $('.plotWindow').toggleClass('hidden');
            $('.plotContainer').css('background', '#f6f6f6');
            $('.plotContainer').css('border-bottom', '4px solid #efefef;');
        } else {
            // data was found
            var sorter = 'expressionData';
            createPlot(queryResult, gene, source, numberOfSamples, sorter);
        }
        $('.loadingAnimation').hide();
        $('.plotWindow').toggleClass('transparent');
        $('.plotInfo').toggleClass('transparent');
        $('#userInputForm .inputButton').toggleClass('inactive');
        $('#extraSelectionForm .inputButton').toggleClass('inactive');
        
    });
    
}
