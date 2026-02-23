/*
  Javascript that is injected into active tab.
  Returns the DOM of the window's contents
*/
"use strict";

var parseResults = {
    messageType: "ParseResults",
    document: document.all[0].outerHTML,
    url: document.URL
};
chrome.runtime.sendMessage(parseResults);

(function () {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) {
        return;
    }

    const iframeRequests = new Map();

    function removeIframe(requestId) {
        let iframe = iframeRequests.get(requestId);
        if (iframe) {
            iframeRequests.delete(requestId);
            try {
                iframe.remove();
            } catch {
                // ignore
            }
        }
    }

    function createHiddenIframe(message) {
        console.log("[ContentScript] createHiddenIframe called", message?.requestId, message?.url);
        if (window.top !== window) {
            console.log("[ContentScript] Skipping: not top window");
            return;
        }
        if (!message?.requestId || !message?.url) {
            console.log("[ContentScript] Skipping: missing requestId or url");
            return;
        }
        removeIframe(message.requestId);

        let iframe = document.createElement("iframe");
        iframe.src = message.url;
        iframe.name = `wte-iframe:${message.requestId}`;
        iframe.width = "1";
        iframe.height = "1";
        iframe.style.cssText = "width:1px;height:1px;border:0;position:fixed;left:-9999px;top:-9999px;";
        iframe.setAttribute("aria-hidden", "true");
        iframeRequests.set(message.requestId, iframe);

        iframe.addEventListener("error", () => {
            chrome.runtime.sendMessage({
                messageType: "WteIframeFetchError",
                requestId: message.requestId,
                url: message.url,
                error: "Iframe load error"
            });
            removeIframe(message.requestId);
        });

        (document.body || document.documentElement).appendChild(iframe);
        console.log("[ContentScript] Iframe appended to DOM, src:", iframe.src);
    }

    function onMessage(message, sender, sendResponse) {
        if (message?.messageType === "WteIframeFetch") {
            createHiddenIframe(message);
            sendResponse({ ok: true });
        } else if (message?.messageType === "WteIframeCleanup") {
            if (window.top === window) {
                removeIframe(message.requestId);
            }
            sendResponse({ ok: true });
        }
    }

    chrome.runtime.onMessage.addListener(onMessage);
})();
