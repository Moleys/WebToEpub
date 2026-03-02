"use strict";

const actionApi = chrome.action || chrome.browserAction;
const supportedHostRegexes = [];
const supportedExactHosts = new Set();
const tabSupportState = new Map();
let warnedSupportIndexFailure = false;

function stripLeadingWww(hostName) {
    return hostName.startsWith("www.") ? hostName.substring(4) : hostName;
}

function isWebArchiveHost(hostName) {
    return hostName.startsWith("web.archive.org") || hostName.startsWith("web-beta.archive.org");
}

function hostNameForParserSelection(url) {
    if (typeof url !== "string" || url.length === 0) {
        return null;
    }
    try {
        let host = (new URL(url)).hostname.toLowerCase();
        if (isWebArchiveHost(host)) {
            let split = url.split("://");
            if (split[2] == null) {
                return null;
            }
            host = split[2].split("/")[0].toLowerCase();
            if (host.length === 0) {
                return null;
            }
        }
        return stripLeadingWww(host);
    } catch (error) {
        return null;
    }
}

function extractExactHostPattern(pattern) {
    if (typeof pattern !== "string") {
        return null;
    }
    let match = pattern.match(/^\^([a-z0-9-]+(?:\\\.[a-z0-9-]+)*)\$$/i);
    if (match == null) {
        return null;
    }
    return stripLeadingWww(match[1].replace(/\\\./g, ".").toLowerCase());
}

async function loadSupportedRegexes() {
    try {
        let jsonUrl = chrome.runtime.getURL("js/ParserSupported.json");
        let response = await fetch(jsonUrl);
        if (!response.ok) {
            if (!warnedSupportIndexFailure) {
                warnedSupportIndexFailure = true;
                console.warn("Parser support index unavailable for badge updates. HTTP status: " + response.status);
            }
            return;
        }
        let index = await response.json();
        for (let entry of (index.supported || [])) {
            if ((entry == null) || (typeof entry.host !== "string")) {
                continue;
            }
            let exactHost = extractExactHostPattern(entry.host);
            if (exactHost != null) {
                supportedExactHosts.add(exactHost);
                continue;
            }
            try {
                supportedHostRegexes.push(new RegExp(entry.host));
            } catch (error) {
                // ignore invalid regex
            }
        }
    } catch (error) {
        if (!warnedSupportIndexFailure) {
            warnedSupportIndexFailure = true;
            console.warn("Parser support index unavailable for badge updates.", error);
        }
    }
}

function isSupportedUrl(url) {
    let hostName = hostNameForParserSelection(url);
    if (hostName == null) {
        return false;
    }
    if (supportedExactHosts.has(hostName)) {
        return true;
    }
    for (let regex of supportedHostRegexes) {
        if (regex.test(hostName)) {
            return true;
        }
    }
    return false;
}

function setBadge(tabId, isSupported) {
    if (!actionApi || tabId == null) {
        return;
    }
    if (isSupported) {
        actionApi.setBadgeText({ tabId: tabId, text: "\u2022" });
        actionApi.setBadgeBackgroundColor({ tabId: tabId, color: "#d01010" });
        if (typeof actionApi.setBadgeTextColor === "function") {
            actionApi.setBadgeTextColor({ tabId: tabId, color: "#ffffff" });
        }
    } else {
        actionApi.setBadgeText({ tabId: tabId, text: "" });
    }
}

function updateTabBadge(tabId, url) {
    if (tabId == null) {
        return;
    }
    let isSupported = isSupportedUrl(url);
    if (tabSupportState.get(tabId) === isSupported) {
        return;
    }
    tabSupportState.set(tabId, isSupported);
    setBadge(tabId, isSupported);
}

function refreshAllTabs() {
    chrome.tabs.query({}, (tabs) => {
        for (let tab of tabs) {
            updateTabBadge(tab.id, tab.url);
        }
    });
}

const supportedReadyPromise = loadSupportedRegexes().then(() => {
    refreshAllTabs();
});

function updateTabBadgeWhenReady(tabId, url) {
    supportedReadyPromise.then(() => {
        updateTabBadge(tabId, url);
    });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) {
            return;
        }
        updateTabBadgeWhenReady(activeInfo.tabId, tab && tab.url);
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url !== undefined) {
        updateTabBadgeWhenReady(tabId, changeInfo.url);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    tabSupportState.delete(tabId);
});

chrome.runtime.onStartup.addListener(() => {
    supportedReadyPromise.then(() => {
        refreshAllTabs();
    });
});

chrome.runtime.onInstalled.addListener(() => {
    supportedReadyPromise.then(() => {
        refreshAllTabs();
    });
});
