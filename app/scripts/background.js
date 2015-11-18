'use strict';

var mainURL = chrome.extension.getURL('main.html');

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.create({
        url: mainURL
    });
});

chrome.omnibox.onInputChanged.addListener(function (input, suggest) {
    // Set the default suggestion
    chrome.omnibox.setDefaultSuggestion({
        description:'Show the list'
    });
});

chrome.omnibox.onInputEntered.addListener(function (input) {
    chrome.tabs.update({
        url: mainURL
    });
});
