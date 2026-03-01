/*
  Makes HTML calls using Fetch API
*/
"use strict";

class FetchErrorHandler {
    constructor() {
    }

    makeFailMessage(url, error) {
        return UIText.Error.htmlFetchFailed(url, error);
    }

    makeFailCanRetryMessage(url, error) {
        return this.makeFailMessage(url, error) + " " +
            UIText.Warning.httpFetchCanRetry;
    }

    getCancelButtonText() {
        return UIText.Common.cancel;
    }

    static cancelButtonText() {
        return UIText.Common.cancel;
    }

    onFetchError(url, error) {
        return Promise.reject(new Error(this.makeFailMessage(url, error.message)));
    }

    onResponseError(url, wrapOptions, response, errorMessage) {
        let failError;
        if (errorMessage) {
            failError = new Error(errorMessage);
        } else {
            failError = new Error(this.makeFailMessage(response.url, response.status));
        }
        let retry = FetchErrorHandler.getAutomaticRetryBehaviourForStatus(response);
        if (retry.retryDelay.length === 0) {
            return Promise.reject(failError);
        }

        if (wrapOptions.retry === undefined) {
            wrapOptions.retry = retry;
            return this.retryFetch(url, wrapOptions);
        }

        if (0 < wrapOptions.retry.retryDelay.length) {
            return this.retryFetch(url, wrapOptions);
        }

        if (wrapOptions.retry.promptUser) {
            return this.promptUserForRetry(url, wrapOptions, response, failError);
        } else {
            return Promise.reject(failError);
        }
    }

    promptUserForRetry(url, wrapOptions, response, failError) {
        let msg;
        if (wrapOptions.retry.HTTP === 403) { 
            msg = new Error(UIText.Warning.warning403ErrorResponse(new URL(response.url).hostname) + this.makeFailCanRetryMessage(url, response.status));
        } else {
            msg = new Error(new Error(this.makeFailCanRetryMessage(url, response.status)));
        }
        let cancelLabel = this.getCancelButtonText();
        return new Promise((resolve, reject) => {
            if (wrapOptions.retry.HTTP === 403) {
                msg.openurl = response.url;
                msg.blockurl = url;
            }
            msg.retryAction = () => resolve(HttpClient.wrapFetchImpl(url, wrapOptions));
            msg.cancelAction = () => reject(failError);
            msg.cancelLabel = cancelLabel;
            ErrorLog.showErrorMessage(msg);
        });
    }

    async retryFetch(url, wrapOptions) {
        let delayBeforeRetry = wrapOptions.retry.retryDelay.pop() * 1000;
        await util.sleep(delayBeforeRetry);
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static getAutomaticRetryBehaviourForStatus(response) {
        // seconds to wait before each retry (note: order is reversed)
        let retryDelay = [120, 60, 30, 15];
        switch (response.status) {
            case 403:
                return {retryDelay: [1], promptUser: true, HTTP: 403};
            case 429:
                FetchErrorHandler.show429Error(response);
                return {retryDelay: retryDelay, promptUser: true};
            case 445:
            //Random Unique exception thrown on Webnovel/Qidian. Not part of w3 spec.
                return {retryDelay: retryDelay, promptUser: false};
            case 509:
            // server asked for rate limiting
                return {retryDelay: retryDelay, promptUser: true};
            case 500:
            // is fault at server, retry might clear
                return {retryDelay: retryDelay, promptUser: false};
            case 502: 
            case 503: 
            case 504:
            case 520:
            case 522:
            // intermittant fault
                return {retryDelay: retryDelay, promptUser: true};
            case 524:
            // claudflare random error
                return {retryDelay: [1], promptUser: true};
            case 999:
            // custom WebToEpub error (some api's fail and a few seconds later it is a success)
                return {retryDelay: response.retryDelay, promptUser: false};
            default:
            // it's dead Jim
                return {retryDelay: [], promptUser: false};
        }
    }

    static show429Error(response) {
        let host = new URL(response.url).hostname;
        if (!FetchErrorHandler.rateLimitedHosts.has(host)) {
            FetchErrorHandler.rateLimitedHosts.add(host);
            alert(UIText.Warning.warning429ErrorResponse(host));
        }
    }
}
FetchErrorHandler.rateLimitedHosts = new Set();

class FetchImageErrorHandler extends FetchErrorHandler { // eslint-disable-line no-unused-vars
    constructor(parentPageUrl) {
        super();
        this.parentPageUrl = parentPageUrl;
    }

    makeFailMessage(url, error) {
        return UIText.Error.imageFetchFailed(url, this.parentPageUrl, error);
    }

    getCancelButtonText() {
        return UIText.Common.skip;
    }
}

class HttpClient {
    constructor() {
    }

    static makeOptions() {
        return { credentials: "include" };
    }

    static setActiveTabId(tabId) {
        HttpClient.activeTabId = tabId;
    }

    static async fetchIframeDom(url, options) {
        if (HttpClient.activeTabId == null) {
            throw new Error("Active tab id not set for iframe fetch");
        }
        if (typeof IframeFetchManager === "undefined") {
            throw new Error("IframeFetchManager not available");
        }
        return IframeFetchManager.requestIframeDom(HttpClient.activeTabId, url, options);
    }

    static wrapFetch(url, wrapOptions) {
        if (wrapOptions == null) {
            wrapOptions = {
                errorHandler: new FetchErrorHandler()
            };
        }
        if (wrapOptions.errorHandler == null) {
            wrapOptions.errorHandler = new FetchErrorHandler();
        }
        wrapOptions.responseHandler = new FetchResponseHandler();
        if (wrapOptions.makeTextDecoder != null) {
            wrapOptions.responseHandler.makeTextDecoder = wrapOptions.makeTextDecoder;
        }
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchHtml(url) {
        let wrapOptions = {
            responseHandler: new FetchHtmlResponseHandler()
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchJson(url, fetchOptions) {
        let requestOptions = (fetchOptions == null) ? undefined : { ...fetchOptions };
        let parser = requestOptions?.parser;
        if (requestOptions?.parser !== undefined) {
            delete requestOptions.parser;
        }
        let wrapOptions = {
            responseHandler: new FetchJsonResponseHandler(),
            fetchOptions: requestOptions,
            parser: parser
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static fetchText(url) {
        let wrapOptions = {
            responseHandler: new FetchTextResponseHandler(),
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    static async wrapFetchImpl(url, wrapOptions) {
        if (BlockedHostNames.has(new URL(url).hostname)) {
            let skipurlerror = new Error("!Blocked! URL skipped because the user blocked the site");
            return wrapOptions.errorHandler.onFetchError(url, skipurlerror);
        }
        await HttpClient.setPartitionCookies(url);
        if (wrapOptions.fetchOptions == null) {
            wrapOptions.fetchOptions = HttpClient.makeOptions();
        }
        if (wrapOptions.errorHandler == null) {
            wrapOptions.errorHandler = new FetchErrorHandler();
        }
        try
        {
            let response = await fetch(url, wrapOptions.fetchOptions);
            let ret = await HttpClient.checkResponseAndGetData(url, wrapOptions, response);
            if (wrapOptions.parser?.isCustomError(ret)) {
                let CustomErrorResponse = wrapOptions.parser.setCustomErrorResponse(url, wrapOptions, ret);
                return wrapOptions.errorHandler.onResponseError(CustomErrorResponse.url, CustomErrorResponse.wrapOptions, CustomErrorResponse.response, CustomErrorResponse.errorMessage);
            }
            return ret;
        }
        catch (error)
        {
            return wrapOptions.errorHandler.onFetchError(url, error);
        }
    }

    static checkResponseAndGetData(url, wrapOptions, response) {
        if (!response.ok) {
            return wrapOptions.errorHandler.onResponseError(url, wrapOptions, response);
        } else {
            let handler = wrapOptions.responseHandler;
            handler.setResponse(response);
            return handler.extractContentFromResponse(response);
        }
    }

    static async setDeclarativeNetRequestRules(RulesArray) {
        let url = chrome.runtime.getURL("").split("/").filter(a => a != "");
        let id = url[url.length - 1];
        for (let i = 0; i < RulesArray.length; i++) {
            //limit rule to only webtoepub domain to prevent potiential security problems
            RulesArray[i].condition.initiatorDomains = [id];
        }
        let oldRules = await chrome.declarativeNetRequest.getSessionRules();
        //In firefox i had declarativeNetRequest.getSessionRules() fail with undefined
        if (oldRules == null) {
            oldRules = [];
        }
        let oldRuleIds = oldRules.map(rule => rule.id);
        await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: oldRuleIds,
            addRules: RulesArray
        });
    }

    static async setPartitionCookies(url) {
        // get partitionKey in the form of https://<site name>.<tld>
        let parsedUrl = new URL(url);
        //keep old code for reference in case it changes again
        //let topLevelSite = parsedUrl.protocol + "//" + parsedUrl.hostname;

        try {
            //  get all cookie from the site which use the partitionKey (e.g. cloudflare)
            //keep old code for reference in case it changes again
            //let cookies = await chrome.cookies.getAll({partitionKey: {topLevelSite: topLevelSite}});
            
            //set domain to the highest level from the website as all subdomains are included #1447 #1445
            let urlparts = parsedUrl.hostname.split(".");
            let cookies = "";
            if (!util.isFirefox()) {
                cookies = await chrome.cookies.getAll({domain: urlparts[urlparts.length-2]+"."+urlparts[urlparts.length-1],partitionKey: {}});
            } else {
                cookies = await browser.cookies.getAll({domain: urlparts[urlparts.length-2]+"."+urlparts[urlparts.length-1],partitionKey: {}});
            }
            cookies = cookies.filter(item => item.partitionKey != undefined);
            //create new cookies for the site without the partitionKey
            //cookies without the partitionKey get sent with fetch
            cookies.forEach(element => chrome.cookies.set({
                domain: element.domain,
                url: "https://"+element.domain.substring(1),
                name: element.name, 
                value: element.value
            }));
        } catch {
            // Probably running browser that doesn't support partitionKey, e.g. Kiwi
            console.log("failed to set cookie");
        } 
    }
}

let BlockedHostNames = new Set();

class FetchResponseHandler {
    isHtml() {
        return this.contentType.startsWith("text/html");
    }

    setResponse(response) {
        this.response = response;
        this.contentType = response.headers.get("content-type");
    }

    extractContentFromResponse(response) {
        if (this.isHtml()) {
            return this.responseToHtml(response);
        } else {
            return this.responseToBinary(response);
        }
    }

    responseToHtml(response) {
        return response.arrayBuffer().then(function(rawBytes) {
            let data = this.makeTextDecoder(response, rawBytes).decode(rawBytes);
            let html = new DOMParser().parseFromString(data, "text/html");
            util.setBaseTag(this.response.url, html);
            this.responseXML = html;
            return this;
        }.bind(this));
    }

    responseToBinary(response) {
        return response.arrayBuffer().then(function(data) {
            this.arrayBuffer = data;
            return this;
        }.bind(this));
    }

    responseToText(response) {
        return response.arrayBuffer().then(function(rawBytes) {
            return this.makeTextDecoder(response, rawBytes).decode(rawBytes);
        }.bind(this));
    }

    responseToJson(response) {
        return response.text().then(function(data) {
            this.json =  JSON.parse(data);
            return this;
        }.bind(this));
    }

    makeTextDecoder(response, rawBytes) {
        let headerCharset = this.charsetFromHeaders(response.headers);
        if (headerCharset != null) {
            try {
                return new TextDecoder(headerCharset);
            } catch (error) {
                // fallback to detection below
            }
        }
        let bytes = null;
        if (rawBytes instanceof ArrayBuffer) {
            bytes = new Uint8Array(rawBytes);
        } else if (rawBytes instanceof Uint8Array) {
            bytes = rawBytes;
        }
        if (bytes != null) {
            let detected = detectChineseEncoding(bytes);
            if (detected != null) {
                try {
                    return new TextDecoder(normalizeEncodingName(detected));
                } catch (error) {
                    // ignore detection failure and fall back
                }
            }
        }
        return new TextDecoder(FetchResponseHandler.DEFAULT_CHARSET);
    }

    charsetFromHeaders(headers) {
        let contentType = headers.get("Content-Type");
        if (!util.isNullOrEmpty(contentType)) {
            let pieces = contentType.toLowerCase().split("charset=");
            if (2 <= pieces.length) {
                return pieces[1].split(";")[0].replace(/"/g, "").trim();
            }
        }
        return null;
    }
}
HttpClient.activeTabId = null;
FetchResponseHandler.DEFAULT_CHARSET = "utf-8";

function normalizeEncodingName(name) {
    if (name == null) {
        return FetchResponseHandler.DEFAULT_CHARSET;
    }
    let enc = String(name).toLowerCase();
    if (enc === "utf-16le" || enc === "utf-16be" || enc === "utf-8") {
        return enc;
    }
    if (enc === "gbk" || enc === "gb18030") {
        return "gbk";
    }
    if (enc === "big5") {
        return "big5";
    }
    if (enc === "iso-2022-cn") {
        return "iso-2022-cn";
    }
    if (enc === "hz-gb-2312") {
        return "hz-gb-2312";
    }
    if (enc === "euc-tw") {
        return "euc-tw";
    }
    return enc;
}

// Encoding detection adapted from zh-chardet.js (UTF-8/UTF-16/GBK/Big5/EUC-TW)
function detectChineseEncoding(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        return null;
    }
    const len = bytes.length;
    if (len >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return "UTF-8";
    }
    if (len >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return "UTF-16BE";
    }
    if (len >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return "UTF-16LE";
    }

    const sampleSize = Math.min(len, 2048);
    const sample = bytes.subarray(0, sampleSize);

    if (findSequence(sample, [0x1B, 0x24, 0x29, 0x41]) ||
        findSequence(sample, [0x1B, 0x24, 0x29, 0x47]) ||
        findSequence(sample, [0x1B, 0x24, 0x2A, 0x48])) {
        return "ISO-2022-CN";
    }

    if (findSequence(sample, [0x7E, 0x7B])) {
        if (findSequence(sample, [0x7E, 0x7D])) {
            return "HZ-GB-2312";
        }
    }

    if (isValidUtf8(sample)) {
        return "UTF-8";
    }

    const candidates = ["GBK", "Big5", "EUC-TW"];
    let bestEnc = "Unknown";
    let bestScore = -1;

    for (let i = 0; i < candidates.length; i++) {
        const enc = candidates[i];
        const str = tryDecode(sample, enc);
        let score = -1000;

        if (str) {
            score = countHan(str);
            const replacementCount = (str.match(/\uFFFD/g) || []).length;
            score -= replacementCount * 5;

            if (enc === "EUC-TW") {
                let ss2Count = 0;
                for (let j = 0; j < sample.length - 3; j++) {
                    if (sample[j] === 0x8E &&
                        sample[j + 1] >= 0xA1 && sample[j + 1] <= 0xB0 &&
                        sample[j + 2] >= 0xA1 && sample[j + 2] <= 0xFE &&
                        sample[j + 3] >= 0xA1 && sample[j + 3] <= 0xFE) {
                        ss2Count++;
                        j += 3;
                    }
                }
                score += ss2Count * 5;
            }
        } else if (enc === "EUC-TW") {
            score = 0;
            let ss2Count = 0;
            let validCount = 0;
            let invalidCount = 0;
            for (let j = 0; j < sample.length;) {
                const b = sample[j];
                if (b < 0x80) {
                    j++;
                    continue;
                }
                if (b === 0x8E && j + 3 < sample.length) {
                    if (sample[j + 1] >= 0xA1 && sample[j + 1] <= 0xB0 &&
                        sample[j + 2] >= 0xA1 && sample[j + 2] <= 0xFE &&
                        sample[j + 3] >= 0xA1 && sample[j + 3] <= 0xFE) {
                        ss2Count++;
                        validCount++;
                        j += 4;
                        continue;
                    }
                }
                if (b >= 0xA1 && b <= 0xFE && j + 1 < sample.length) {
                    const b2 = sample[j + 1];
                    if (b2 >= 0xA1 && b2 <= 0xFE) {
                        validCount++;
                        j += 2;
                        continue;
                    }
                }
                invalidCount++;
                j++;
            }
            if (ss2Count === 0) {
                score = -1000;
            } else {
                score = validCount + (ss2Count * 5) - (invalidCount * 5);
            }
        }

        if (score > bestScore) {
            bestScore = score;
            bestEnc = enc;
        }
    }

    if (bestScore > 0) {
        return bestEnc;
    }

    return bestEnc === "Unknown" ? "GBK" : bestEnc;
}

function findSequence(bytes, seq) {
    for (let i = 0; i < bytes.length - seq.length + 1; i++) {
        let match = true;
        for (let j = 0; j < seq.length; j++) {
            if (bytes[i + j] !== seq[j]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }
    return false;
}

function tryDecode(chunk, enc) {
    try {
        const decoder = new TextDecoder(enc, { fatal: false });
        return decoder.decode(chunk);
    } catch (e) {
        return null;
    }
}

function isValidUtf8(bytes) {
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return true;
    } catch (e) {
        for (let i = 1; i <= 3; i++) {
            if (bytes.length - i <= 0) break;
            try {
                new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, bytes.length - i));
                return true;
            } catch (e2) {
                // ignore
            }
        }
    }
    return false;
}

function countHan(str) {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0x4E00 && code <= 0x9FFF) {
            count++;
        }
    }
    return count;
}

class FetchJsonResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToJson(response);
    }
}

class FetchTextResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToText(response);
    }
}

class FetchHtmlResponseHandler extends FetchResponseHandler {
    constructor() {
        super();
    }

    extractContentFromResponse(response) {
        return super.responseToHtml(response);
    }
}
