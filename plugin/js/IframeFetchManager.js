"use strict";

var IframeFetchManager = (function () {
    const pendingRequests = new Map();
    let requestCounter = 0;
    let listenerAdded = false;

    function ensureListener() {
        if (listenerAdded) {
            return;
        }
        listenerAdded = true;
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(onMessage);
        }
    }

    function onMessage(message, sender) {
        if (message?.messageType === "WteIframeParseResults") {
            finalizeSuccess(message);
        } else if (message?.messageType === "WteIframeFetchError") {
            finalizeError(message);
        } else if (message?.messageType === "WteIframeReady") {
            sendConfigToFrame(message, sender);
        }
    }

    function finalizeSuccess(message) {
        console.log("[IframeFetchManager] SUCCESS received for", message.requestId, "url:", message.url);
        let requestId = message.requestId;
        if (!requestId || !pendingRequests.has(requestId)) {
            return;
        }
        let entry = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        if (entry.timeoutId) {
            clearTimeout(entry.timeoutId);
        }
        cleanupIframe(entry.tabId, requestId);
        try {
            let dom = new DOMParser().parseFromString(message.document || "", "text/html");
            if (message.url) {
                util.setBaseTag(message.url, dom);
            }
            entry.resolve(dom);
        } catch (error) {
            entry.reject(error);
        }
    }

    function finalizeError(message) {
        console.error("[IframeFetchManager] ERROR received for", message.requestId, ":", message.error);
        let requestId = message.requestId;
        if (!requestId || !pendingRequests.has(requestId)) {
            return;
        }
        let entry = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        if (entry.timeoutId) {
            clearTimeout(entry.timeoutId);
        }
        cleanupIframe(entry.tabId, requestId);
        entry.reject(new Error(message.error || "Iframe fetch failed"));
    }

    function cleanupIframe(tabId, requestId) {
        try {
            chrome.tabs.sendMessage(tabId, {
                messageType: "WteIframeCleanup",
                requestId: requestId
            }, { frameId: 0 });
        } catch {
            // ignore
        }
    }

    function makeRequestId() {
        requestCounter++;
        return `wte-iframe-${Date.now()}-${requestCounter}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function requestIframeDom(tabId, url, options) {
        ensureListener();
        return new Promise((resolve, reject) => {
            if (!tabId && tabId !== 0) {
                reject(new Error("Active tab id not set for iframe fetch"));
                return;
            }
            let requestId = makeRequestId();
            let timeoutMs = options?.timeoutMs ?? 30000;
            let timeoutId = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    console.error("[IframeFetchManager] TIMEOUT for", requestId, "url:", url);
                    pendingRequests.delete(requestId);
                    cleanupIframe(tabId, requestId);
                    reject(new Error("Iframe fetch timed out"));
                }
            }, timeoutMs + 1000);

            pendingRequests.set(requestId, {
                resolve: resolve,
                reject: reject,
                timeoutId: timeoutId,
                tabId: tabId,
                options: options || {}
            });

            try {
                console.log("[IframeFetchManager] Sending WteIframeFetch to tab", tabId, "requestId:", requestId, "url:", url);
                chrome.tabs.sendMessage(tabId, {
                    messageType: "WteIframeFetch",
                    requestId: requestId,
                    url: url,
                    options: options || {}
                }, { frameId: 0 }, () => {
                    if (chrome.runtime?.lastError) {
                        let entry = pendingRequests.get(requestId);
                        if (entry) {
                            pendingRequests.delete(requestId);
                            clearTimeout(entry.timeoutId);
                            reject(new Error(chrome.runtime.lastError.message));
                        }
                    }
                });
            } catch (error) {
                if (pendingRequests.has(requestId)) {
                    pendingRequests.delete(requestId);
                    clearTimeout(timeoutId);
                }
                reject(error);
            }
        });
    }

    function sendConfigToFrame(message, sender) {
        let requestId = message?.requestId;
        if (!requestId || !pendingRequests.has(requestId)) {
            return;
        }
        let entry = pendingRequests.get(requestId);
        let frameId = sender?.frameId;
        if (frameId == null) {
            return;
        }
        try {
            chrome.tabs.sendMessage(entry.tabId, {
                messageType: "WteIframeConfig",
                requestId: requestId,
                options: entry.options || {}
            }, { frameId: frameId });
        } catch {
            // ignore
        }
    }

    return {
        requestIframeDom: requestIframeDom
    };
})();
