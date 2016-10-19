var utterances = require("alexa-utterances");

var dom = {
    find: (selector) => [...document.querySelectorAll(selector)],
    findOne: (selector) =>document.querySelector(selector)
};

var buildUtterances = function(templates) {
    return templates
            .map(t => utterances(t).map(r => r.trim()).join("\n"))
            .join("\n");
}

var formSubmit = function(e) {
    e.preventDefault();
    var value = dom.findOne("#workspace textarea").value;
    if (value) {
        var utterancesStr = buildUtterances(value.split("\n"));
        dom.findOne("#utterance-output textarea").value = utterancesStr;
    }
}

dom.findOne("#workspace form").addEventListener("submit", formSubmit);
