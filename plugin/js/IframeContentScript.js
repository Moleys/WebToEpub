"use strict";

(function () {
    if (window.top === window) {
        return;
    }

    let activeConfig = null;
    let pollTimerId = null;
    let timeoutId = null;

    function clearTimers() {
        if (pollTimerId != null) {
            clearInterval(pollTimerId);
            pollTimerId = null;
        }
        if (timeoutId != null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function cleanup() {
        clearTimers();
        activeConfig = null;
        try {
            if (window.frameElement) {
                window.frameElement.remove();
            }
        } catch {
            // ignore
        }
    }

    function isHidden(element) {
        if (!element) {
            return false;
        }
        let style = element.ownerDocument?.defaultView?.getComputedStyle(element);
        if (style && (style.display === "none" || style.visibility === "hidden")) {
            return true;
        }
        return element.hidden === true;
    }

    function checkReady() {
        if (!activeConfig) {
            return false;
        }
        let options = activeConfig.options || {};
        if (options.scrollToBottom) {
            try {
                window.scrollTo(0, document.body?.scrollHeight || 0);
            } catch {
                // ignore
            }
        }

        if (options.waitForHiddenSelector) {
            let element = document.querySelector(options.waitForHiddenSelector);
            return isHidden(element);
        }

        if (options.waitForSelector) {
            let elements = document.querySelectorAll(options.waitForSelector);
            if (!elements || elements.length === 0) {
                return false;
            }
            if (options.minMatchCount != null && elements.length < options.minMatchCount) {
                return false;
            }
            let element = elements[0];
            if (options.minChildCount != null && element.childElementCount < options.minChildCount) {
                return false;
            }
            if (options.minTextLength != null && (element.textContent?.length || 0) < options.minTextLength) {
                return false;
            }
            return true;
        }

        return document.readyState === "complete" || document.readyState === "interactive";
    }

    function sendResult() {
        console.log("[IframeContentScript] sendResult for", activeConfig.requestId, "url:", document.URL);
        chrome.runtime.sendMessage({
            messageType: "WteIframeParseResults",
            requestId: activeConfig.requestId,
            url: document.URL,
            document: document.documentElement.outerHTML
        });
        cleanup();
    }

    function sendError(errorMessage) {
        console.error("[IframeContentScript] sendError:", errorMessage, "requestId:", activeConfig?.requestId);
        chrome.runtime.sendMessage({
            messageType: "WteIframeFetchError",
            requestId: activeConfig?.requestId || null,
            url: document.URL,
            error: errorMessage
        });
        cleanup();
    }

    function startPolling() {
        if (!activeConfig) {
            return;
        }
        let options = activeConfig.options || {};
        let pollInterval = options.pollIntervalMs ?? 250;
        let timeoutMs = options.timeoutMs ?? 30000;

        pollTimerId = setInterval(() => {
            try {
                if (checkReady()) {
                    clearTimers();
                    sendResult();
                }
            } catch (error) {
                clearTimers();
                sendError(error?.message || "Iframe read error");
            }
        }, pollInterval);

        timeoutId = setTimeout(() => {
            clearTimers();
            sendError("Iframe fetch timed out");
        }, timeoutMs);
    }

    function parseRequestId() {
        let name = window.name || "";
        console.log("[IframeContentScript] window.name:", name, "url:", document.URL);
        if (name.startsWith("wte-iframe:")) {
            return name.substring("wte-iframe:".length);
        }
        return null;
    }

    function onRuntimeMessage(message) {
        if (message?.messageType !== "WteIframeConfig") {
            return;
        }
        console.log("[IframeContentScript] Config received, requestId:", message.requestId, "options:", JSON.stringify(message.options));
        if (!message.requestId || (activeConfig && activeConfig.requestId !== message.requestId)) {
            return;
        }
        activeConfig = {
            requestId: message.requestId,
            options: message.options || {}
        };
        startPolling();
    }

    function requestConfig() {
        let requestId = parseRequestId();
        if (!requestId) {
            console.log("[IframeContentScript] No requestId in window.name, exiting");
            return;
        }
        console.log("[IframeContentScript] Sending WteIframeReady, requestId:", requestId);
        chrome.runtime.sendMessage({
            messageType: "WteIframeReady",
            requestId: requestId,
            url: document.URL
        });
        if (chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(onRuntimeMessage);
        }
        timeoutId = setTimeout(() => {
            if (!activeConfig) {
                sendError("Iframe config not received");
            }
        }, 30000);
    }

    requestConfig();
})();
