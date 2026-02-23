"use strict";

parserFactory.register("www.hanwujinian.com", () => new NovelDownloaderHanwujinianParser());

class NovelDownloaderHanwujinianParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let info = parseMainTitle(dom);
        let linkSet = new Set();
        let links = [];

        let list1 = [...dom.querySelectorAll("#content-section > pre a")];
        let list2 = [...dom.querySelectorAll("div.post-list ul.post-items > li")]
            .map(li => li.querySelector("a"))
            .filter(a => a && a.href);

        let current = dom.createElement("a");
        current.href = dom.baseURI;
        current.textContent = info.titleText;
        list1.push(current);

        for (const link of list1.concat(list2)) {
            if (!link || !link.href) {
                continue;
            }
            let url = link.href;
            if (linkSet.has(url)) {
                continue;
            }
            if (link.textContent && link.textContent.includes("(0 bytes)")) {
                continue;
            }
            let params = new URL(url).searchParams;
            if (params.has("act") && params.get("act") !== "threadview") {
                continue;
            }
            if (params.has("tid") === false) {
                continue;
            }
            linkSet.add(url);
            links.push(link);
        }

        links.sort((a, b) => {
            let atid = parseInt(new URL(a.href).searchParams.get("tid") || "0", 10);
            let btid = parseInt(new URL(b.href).searchParams.get("tid") || "0", 10);
            return atid - btid;
        });

        return links.map(link => {
            let chapterName = cleanChapterTitle(link.textContent || "", info.bookName, info.author);
            return {
                sourceUrl: link.href,
                title: chapterName
            };
        });
    }

    findContent(dom) {
        return dom.querySelector("#content-section > pre")
            || dom.querySelector("#content-section > div");
    }

    extractTitleImpl(dom) {
        let info = parseMainTitle(dom);
        return info.bookName || dom.querySelector("h1.main-title");
    }

    extractAuthor(dom) {
        let info = parseMainTitle(dom);
        if (!util.isNullOrEmpty(info.author)) {
            return info.author.replace("\u4f5c\u8005: ", "").trim();
        }
        let sender = dom.querySelector("span.sender");
        return sender?.textContent?.trim() ?? super.extractAuthor(dom);
    }

    extractLanguage() {
        return "zh";
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "font[color*='E6E6DD']");
        super.removeUnwantedElementsFromContentElement(element);
    }

    customRawDomToContentStep(_webPage, content) {
        if (!content) {
            return;
        }
        for (const center of Array.from(content.querySelectorAll("center"))) {
            let div = content.ownerDocument.createElement("div");
            while (center.firstChild) {
                div.appendChild(center.firstChild);
            }
            center.replaceWith(div);
        }
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

function parseMainTitle(dom) {
    let titleText = dom.querySelector("h1.main-title")?.textContent?.trim() || "";
    let bookName = titleText;
    let author = "";
    let match = titleText.match(/[\u3010\u300a]([^\u3011\u300b]+)[\u3011\u300b].*?\u4f5c\u8005[:\uff1a]([^\s-]+)/);
    if (match) {
        bookName = match[1].trim();
        author = match[2].trim();
    } else {
        author = dom.querySelector("span.sender")?.textContent?.trim() || "";
    }
    return { titleText, bookName, author };
}

function cleanChapterTitle(text, bookName, author) {
    let name = text.trim();
    if (!util.isNullOrEmpty(bookName)) {
        let bookEsc = escapeRegExp(bookName);
        name = name.replace(new RegExp(`[\u3010\u300a]${bookEsc}[\u3011\u300b]`, "g"), "");
    }
    if (!util.isNullOrEmpty(author)) {
        let authorEsc = escapeRegExp(author);
        name = name.replace(new RegExp(`\u4f5c\u8005[:\uff1a]${authorEsc}`, "g"), "");
    }
    return name.trim();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
