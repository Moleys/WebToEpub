"use strict";

parserFactory.register("www.bilinovel.com", () => new NovelDownloaderWwwBilinovelComParser());

class NovelDownloaderWwwBilinovelComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocDom = dom;
        if (!dom.baseURI.includes("/catalog")) {
            let tocUrl = dom.baseURI.replace(/\.html$/, "/catalog");
            tocDom = (await HttpClient.wrapFetch(tocUrl)).responseXML;
        }
        let chapters = this.extractChaptersFromCatalog(tocDom);
        if (chapters.length > 0) {
            return chapters;
        }
        let links = [...tocDom.querySelectorAll(".chapter-li-a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    extractChaptersFromCatalog(tocDom) {
        let lis = tocDom.querySelectorAll(".volume-chapters > li");
        if (lis.length === 0) {
            return [];
        }
        let chapters = [];
        let currentArc = null;
        let firstInVolume = false;
        let hasVolumeBar = tocDom.querySelector(".chapter-bar") != null;
        if (!hasVolumeBar) {
            currentArc = "";
            firstInVolume = true;
        }

        for (const li of Array.from(lis)) {
            if (li.classList.contains("chapter-bar")) {
                currentArc = li.textContent?.trim() || "";
                firstInVolume = true;
                continue;
            }
            if (li.classList.contains("volume-cover")) {
                continue;
            }
            if (!li.classList.contains("jsChapter")) {
                continue;
            }
            let link = li.querySelector("a");
            if (!link) {
                continue;
            }
            let href = link.getAttribute("href");
            if (util.isNullOrEmpty(href) || href.includes("javascript")) {
                continue;
            }
            let title = link.textContent?.trim() || link.title || href;
            chapters.push({
                sourceUrl: link.href,
                title: title,
                newArc: firstInVolume ? currentArc : null
            });
            firstInVolume = false;
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#acontent") || dom.querySelector(".bcontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.book-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-rand-a > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("#bookSummary content") || dom.querySelector("#bookSummary");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-layout img")
            || util.getFirstImgSrc(dom, ".book-cover");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        await this.appendNextPages(chapterDom);
        return chapterDom;
    }

    async appendNextPages(chapterDom) {
        let content = this.findContent(chapterDom);
        if (content == null) {
            return;
        }
        this.applyContentPatch(content, chapterDom);
        let nextUrl = this.getNextPageUrl(chapterDom);
        while (nextUrl != null && nextUrl !== "" && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                this.applyContentPatch(nextContent, nextDom);
                content.appendChild(chapterDom.createElement("hr"));
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }
    }

    getNextPageUrl(dom) {
        const params = getReadParams(dom);
        if (params && params.url_next) {
            return new URL(dom.baseURI).origin + params.url_next;
        }
        return dom.querySelector(".mlfy_page > a:nth-child(5)")?.href ?? "";
    }

    shouldContinueNextPage(nextUrl) {
        if (nextUrl === "") {
            return false;
        }
        return new URL(nextUrl).pathname.includes("_");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element, element.ownerDocument, false);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content, dom, doShuffle = true) {
        rm("div", true, content);
        rm("ins", true, content);
        rm("figure", true, content);
        rm("fig", true, content);
        rm("br", true, content);
        rm("script", true, content);
        rm(".tp", true, content);
        rm(".bd", true, content);
        rm(".cgo", true, content);
        removeElementsByPattern(content, /[a-z]\d{4}/);
        fixImages(content);
        if (doShuffle) {
            let params = getShuffleParams(dom);
            if (params != null) {
                shuffleContent(content, params);
            }
        }
        return content;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

function getReadParams(dom) {
    let script = [...dom.querySelectorAll("script")].find(s => s.textContent && s.textContent.includes("ReadParams"));
    if (!script || !script.textContent) {
        return null;
    }
    try {
        return new Function(`${script.textContent}; return ReadParams;`)();
    } catch (e) {
        return null;
    }
}

function getShuffleParams(dom) {
    if (!dom) {
        return null;
    }
    let script = [...dom.querySelectorAll("script")]
        .find(s => s.getAttribute("src")?.includes("chapterlog.js?v"));
    if (!script) {
        return null;
    }
    let chapterId = null;
    let match = dom.documentElement?.outerHTML?.match(/chapterid:'(\d+)'/);
    if (match && match[1]) {
        chapterId = parseInt(match[1], 10);
    }
    if (!chapterId) {
        return null;
    }
    let jsSrc = script.getAttribute("src") || "";
    let currentVersion = "v1006c1.3";
    let matchedVersion = jsSrc.substring(jsSrc.lastIndexOf("v"));
    if (currentVersion !== matchedVersion && !bilinovelWarnFlag) {
        console.log(`[warning] chapterlog version mismatch: current=${currentVersion}, actual=${matchedVersion}`);
        bilinovelWarnFlag = true;
    }
    return {
        fixedLength: 20,
        seed: chapterId * 126 + 232,
        a: 9302,
        c: 49397,
        mod: 233280
    };
}

function shuffleContent(content, params) {
    let paragraphs = Array.from(content.querySelectorAll("p"))
        .filter(p => (p.textContent || "").trim().length > 0);
    if (paragraphs.length === 0) {
        return;
    }
    let fixedLength = params.fixedLength;
    let fixed = [];
    let shuffled = [];
    for (let i = 0; i < paragraphs.length; i++) {
        (i < fixedLength ? fixed : shuffled).push(i);
    }
    if (paragraphs.length > fixedLength) {
        shuffleArray(shuffled, params);
    }
    let indices = fixed.concat(shuffled);
    let mapped = new Array(paragraphs.length);
    for (let i = 0; i < paragraphs.length; i++) {
        mapped[indices[i]] = paragraphs[i];
    }
    let replacedIndex = 0;
    let children = Array.from(content.children);
    for (const child of children) {
        if (child.tagName === "P" && (child.textContent || "").trim().length > 0) {
            let replacement = mapped[replacedIndex++].cloneNode(true);
            child.replaceWith(replacement);
        }
    }
}

function shuffleArray(arr, params) {
    let a = params.a;
    let c = params.c;
    let mod = params.mod;
    let seed = params.seed;
    for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * a + c) % mod;
        let j = Math.floor((seed / mod) * (i + 1));
        let tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

function removeElementsByPattern(content, regex) {
    content.querySelectorAll("p").forEach(p => {
        let text = p.textContent || "";
        if (regex.test(text)) {
            p.remove();
        }
    });
}

function fixImages(content) {
    let images = content.querySelectorAll("img");
    for (const image of Array.from(images)) {
        let src = image.getAttribute("data-src") || image.getAttribute("src");
        if (src != null) {
            if (src.includes("<")) {
                image.remove();
                continue;
            }
            if (src.startsWith("//")) {
                src = "https:" + src;
            }
            image.setAttribute("src", src);
        }
        image.setAttribute("alt", image.getAttribute("alt") || "");
    }
}

function rm(selector, all, dom) {
    if (all) {
        dom.querySelectorAll(selector).forEach(e => e.remove());
    } else {
        let element = dom.querySelector(selector);
        if (element != null) {
            element.remove();
        }
    }
}

let bilinovelWarnFlag = false;
