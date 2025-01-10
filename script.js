const siteUrl = 'Origin: https://github.com/M-Mazurek/regression-analyzer';
const reportDateLookback = 30;

const mainContainer = document.getElementById('main_container');
const reportDate = document.getElementById('report_date');
const reportSubmit = document.getElementById('report_submit');
const info = document.getElementById('info');

let testNameDict = [];

function getResultNameFromCode(code)
{
    switch (code) {
        case "0": return "PASSED";
        case "1": return "FAILED";
        case "2": return "TEST_ERROR";
        default: case undefined: return "NOT_FOUND";
    }
}

function getResultTitleSpan(code) {
    let resStr = getResultNameFromCode(code);
    let resSpan = document.createElement('span'); 
    resSpan.className = `result_${resStr.toLowerCase()}`;
    resSpan.textContent = resStr;
    return resSpan;
}

function addRegressionStatusForPackage(currentResults, previousResults, panel) {
    let resDict = [];
    Object.keys(currentResults).forEach(testId => {
        let dictKey = `${previousResults[testId]} ${currentResults[testId]}`;
        
        if (resDict[dictKey] == undefined)
            resDict[dictKey] = [];

        resDict[dictKey].push(testId);
    });

    resDict.sort();

    Object.keys(resDict).forEach(regressionType => {
        let innerPanel = document.createElement('div');
        innerPanel.className = 'regression_list';
        let title = document.createElement('div');
        title.className = 'regression_type_title';

        let resCodes = regressionType.split(' ');

        panel.appendChild(innerPanel);
        innerPanel.appendChild(title);

        title.appendChild(getResultTitleSpan(resCodes[0]));
        title.innerHTML += " -> ";
        title.appendChild(getResultTitleSpan(resCodes[1]));

        resDict[regressionType].forEach(testId => {
            let row = document.createElement('div');
            // uproszczenie na potrzeby prezentacji
            let name = testNameDict[testId];
            row.innerHTML = `- ${name == undefined ? testId : name} <a href="log">Previous Log</a> <a href="log">Current Log</a>`;
            innerPanel.appendChild(row);
        });
    });
}

function addPackagePanels(currentJson, previousJson) {
    Object.keys(currentJson).forEach(package => {
        let panel = document.createElement('div');
        panel.className = 'content_panel';
        let title = document.createElement('h4');
        title.className = 'package_title';
        title.textContent = package.toString();

        mainContainer.appendChild(panel);
        panel.appendChild(title);

        addRegressionStatusForPackage(currentJson[package], previousJson[package], panel)
    });
}

async function tryGetReport(date) {
    return await fetch(siteUrl + `/test_results/Results_${date.toISOString().split('T')[0]}.json`)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
}

function addSummary(results) {
    let panel = document.createElement('div');
    panel.className = 'content_panel';
    let title = document.createElement('h4');
    title.className = 'package_title';
    title.textContent = "Run summary:";
    mainContainer.appendChild(panel);
    panel.appendChild(title);

    Object.keys(results).forEach(package => {
        let testCount = 0;
        let resultCodeCounts = [];
        Object.keys(results[package]).forEach(testId => {
            let code = results[package][testId];
            if (resultCodeCounts[code] == undefined)
                resultCodeCounts[code] = 0;

            resultCodeCounts[code]++;
            testCount++;
        });

        let summary = document.createElement('div');
        summary.className = 'summary';
        let passratePrc = Math.floor(resultCodeCounts["0"] / testCount * 100);
        summary.innerHTML = `${package}: Passrate: ${passratePrc}% (${resultCodeCounts["0"]}/${testCount})`;

        Object.keys(resultCodeCounts).forEach(code => {
            summary.appendChild(document.createElement("br"));
            summary.appendChild(getResultTitleSpan(code));
            summary.innerHTML += ` ${resultCodeCounts[code]}`;
        });

        panel.appendChild(summary);
    });
}

async function tryLoadResults() {
    let currentJson, previousJson;
    let initialDate = new Date(reportDate.value);
    let queriedDate = new Date(reportDate.value);

    let i;
    for (i = 0; i <= reportDateLookback; i++) {
        queriedDate.setDate(initialDate.getDate() - i);
        currentJson = await tryGetReport(queriedDate);

        if (currentJson != undefined)
            break;
    }

    let previousDate = new Date(queriedDate);
    
    let _i;
    for (_i = 0; _i <= reportDateLookback; _i++) {
        previousDate.setDate(previousDate.getDate() - 1);
        previousJson = await tryGetReport(previousDate);

        if (previousJson != undefined)
            break;
    }
    
    while (mainContainer.childNodes.length > 2) {
        mainContainer.removeChild(mainContainer.lastChild);
    }

    if (currentJson == undefined) {
        info.textContent = `No run was found on ${initialDate.toISOString().split('T')[0]} or ${reportDateLookback} days prior.`;
        return;
    }
    
    if (previousJson == undefined) {
        info.textContent = `Run was found ${i} days prior to ${initialDate.toISOString().split('T')[0]} (${queriedDate.toISOString().split('T')[0]}), but no other one ${reportDateLookback} days prior. Cannot generate a comparison.`;
        return;
    }

    if (initialDate.getTime() != queriedDate.getTime()) {
        info.textContent = `Run was found ${i} days prior to ${initialDate.toISOString().split('T')[0]} (${queriedDate.toISOString().split('T')[0]}).`
    }
    else {
        info.textContent = `Run from ${queriedDate.toISOString().split('T')[0]} found.`;
    }

    info.textContent += ` Comparing to ${previousDate.toISOString().split('T')[0]}:`;
    addSummary(currentJson);
    addPackagePanels(currentJson, previousJson);
}

function getTestNames() {
    return fetch(siteUrl + `/test_names.json`)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(json => {
            Object.keys(json).forEach(key => {
                testNameDict[key] = json[key];
            });
        });
}

reportSubmit.addEventListener('click', tryLoadResults);
getTestNames();