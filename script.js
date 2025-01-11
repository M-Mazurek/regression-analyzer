const siteUrl = 'https://m-mazurek.github.io/regression-analyzer';
const reportDateLookback = 30;

const mainContainer = document.getElementById('main_container');
const reportDate = document.getElementById('report_date');
const reportSubmit = document.getElementById('report_submit');
const info = document.getElementById('info');

const regressionTypes = {
    Progression: [ "1 0", "2 0", "undefined 0" ],
    Regression: [ "0 1", "0 2", "undefined 1", "undefined 2" ],
    Constant: [ "0 0", "1 1", "2 2", "1 2", "2 1" ]
};

let testNameDict = [];

function subtractDays(date, days) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - days,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    );
}

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

function createRegressionTypePanel(name, outerPanel)
{
    let panel = document.createElement('div');
    panel.className = 'regression_list';
    let title = document.createElement('div');
    title.className = 'regression_type_title';
    title.textContent = name;

    outerPanel.appendChild(panel);
    panel.appendChild(title);

    return panel;
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

    let progressionPanel = createRegressionTypePanel('Progression', panel);
    let regressionPanel = createRegressionTypePanel('Regression', panel);
    let constantPanel = createRegressionTypePanel('Constant', panel);

    Object.keys(resDict).forEach(regressionPair => {
        let title = document.createElement('div');
        title.className = 'regression_type_title';

        let resCodes = regressionPair.split(' ');

        title.appendChild(getResultTitleSpan(resCodes[0]));
        title.innerHTML += " -> ";
        title.appendChild(getResultTitleSpan(resCodes[1]));

        let panelToFill = regressionTypes.Progression.includes(regressionPair) ?
            progressionPanel : regressionTypes.Regression.includes(regressionPair) ?
            regressionPanel : constantPanel;

        panelToFill.appendChild(title);

        resDict[regressionPair].forEach(testId => {
            let row = document.createElement('div');
            // uproszczenie na potrzeby prezentacji
            let name = testNameDict[testId];
            row.innerHTML = `- ${name == undefined ? testId : name} <a href="log">Previous Log</a> <a href="log">Current Log</a>`;
            panelToFill.appendChild(row);
        });

        panelToFill.appendChild(document.createElement('br'));
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
        summary.innerHTML = `${package}: Passrate: `;

        let passrateSpan = document.createElement('span');
        passrateSpan.textContent = `${passratePrc}% (${resultCodeCounts["0"]}/${testCount})`;
        passrateSpan.className = passratePrc >= 80 ? 
            'result_passed' : passratePrc >= 60 ?
            'result_test_error' : 'result_failed';
        summary.appendChild(passrateSpan);

        Object.keys(resultCodeCounts).forEach(code => {
            summary.appendChild(document.createElement("br"));
            summary.appendChild(getResultTitleSpan(code));
            summary.innerHTML += ` ${resultCodeCounts[code]}`;
        });

        panel.appendChild(summary);
    });
}

async function tryLoadResults() {
    info.textContent = "Fetching results...";
    reportSubmit.disabled = true;

    let currentJson, previousJson;
    let initialDate = new Date(reportDate.value);
    let queriedDate = new Date(reportDate.value);

    let i;
    for (i = 0; i <= reportDateLookback; i++) {
        queriedDate = subtractDays(initialDate, i);
        currentJson = await tryGetReport(queriedDate);

        if (currentJson != undefined)
            break;
    }

    let previousDate = new Date(queriedDate);
    
    let _i;
    for (_i = 1; _i <= reportDateLookback; _i++) {
        previousDate = subtractDays(queriedDate, _i);
        previousJson = await tryGetReport(previousDate);

        if (previousJson != undefined)
            break;
    }
    
    while (mainContainer.childNodes.length > 2) {
        mainContainer.removeChild(mainContainer.lastChild);
    }

    if (currentJson == undefined) {
        info.textContent = `No run was found on ${initialDate.toISOString().split('T')[0]} or ${reportDateLookback} days prior.`;
        reportSubmit.disabled = false;
        return;
    }
    
    if (previousJson == undefined) {
        info.textContent = `Run was found ${i} days prior to ${initialDate.toISOString().split('T')[0]} (${queriedDate.toISOString().split('T')[0]}), but no other one ${reportDateLookback} days prior. Cannot generate a comparison.`;
        reportSubmit.disabled = false;
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
    reportSubmit.disabled = false;
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