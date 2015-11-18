'use strict';

// Saves options to chrome.storage.sync.
function saveOptions() {
    var token = document.getElementById('token').value,
        user = document.getElementById('user').value,
        repo = document.getElementById('repo').value,
        regex = document.getElementById('regex').value;

    chrome.storage.sync.set({
        token: token,
        user: user,
        repo: repo,
        regex: regex
    }, function() {
        window.close();
    });
}

// Restores state using the preferences
// stored in chrome.storage.
function restoreOptions() {
    chrome.storage.sync.get({
        token: '',
        user: '',
        repo: '',
        regex: '^(master|[0-9]+\\.[0-9]+.*)$'
    }, function(items) {
        document.getElementById('token').value = items.token;
        document.getElementById('user').value = items.user;
        document.getElementById('repo').value = items.repo;
        document.getElementById('regex').value = items.regex;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
