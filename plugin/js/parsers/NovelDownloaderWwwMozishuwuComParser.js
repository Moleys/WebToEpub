"use strict";

parserFactory.register("www.mozishuwu.com", () => new NovelDownloaderWwwMozishuwuComParser());

class NovelDownloaderWwwMozishuwuComParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let chapterListLink = dom.querySelector(MOZISHUWU_CONFIG.selectors.CHAPTER_LIST_LINK);
        if (!chapterListLink) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(chapterListLink.href)).responseXML;
        let links = [...tocDom.querySelectorAll(MOZISHUWU_CONFIG.selectors.CHAPTER_LINKS)];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(MOZISHUWU_CONFIG.selectors.BOOK_TITLE);
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(MOZISHUWU_CONFIG.selectors.BOOK_AUTHOR);
        if (authorLabel && authorLabel.textContent) {
            const text = authorLabel.textContent;
            const match = text.match(/\u4f5c\s*\u8005[\uff1a:]([^\uff09)]+)/);
            if (match) {
                return match[1].trim();
            }
            return text.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(MOZISHUWU_CONFIG.selectors.BOOK_INTRO);
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector(MOZISHUWU_CONFIG.selectors.BOOK_COVER);
        return img ? img.getAttribute("src") || img.src : null;
    }

    async fetchChapter(url) {
        let chapterId = extractChapterIdFromUrl(url);
        if (!chapterId) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        let data = await fetchWeimengChapter(chapterId, url);
        let dom = new DOMParser().parseFromString("<html><body><div id='content'></div></body></html>", "text/html");
        let content = dom.querySelector("#content");
        if (content && data && Array.isArray(data.content)) {
            for (const paragraph of data.content) {
                if (paragraph && String(paragraph).trim() !== "") {
                    let p = dom.createElement("p");
                    p.textContent = String(paragraph).trim();
                    content.appendChild(p);
                    content.appendChild(dom.createElement("br"));
                }
            }
        }
        return dom;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

const MOZISHUWU_CONFIG = {
    selectors: {
        BOOK_TITLE: "h2.works-intro-title > strong",
        BOOK_AUTHOR: "h2.works-intro-title",
        BOOK_INTRO: "p.works-intro-short",
        BOOK_TAGS: "#tags-show > a",
        BOOK_COVER: "div.works-cover > img",
        CHAPTER_LIST_LINK: "div.works-chapter-wr > ul > li.active > a",
        CHAPTER_LINKS: "ol > li > p a"
    },
    api: {
        ENDPOINT_PATTERN: "/wmcms/ajax/index.php",
        CHAPTER_ACTION: "novel.getchapter",
        SUCCESS_CODE: 200
    },
    urlPatterns: {
        CHAPTER_ID_REGEX: /\/read\/(\d+)\.html$/
    }
};

function extractChapterIdFromUrl(url) {
    let match = url.match(MOZISHUWU_CONFIG.urlPatterns.CHAPTER_ID_REGEX);
    return match ? match[1] : null;
}

async function fetchWeimengChapter(chapterId, chapterUrl) {
    let params = new URLSearchParams({
        action: MOZISHUWU_CONFIG.api.CHAPTER_ACTION,
        cid: chapterId,
        format: "1"
    });
    let origin = chapterUrl ? new URL(chapterUrl).origin : document.location.origin;
    let apiUrl = `${origin}${MOZISHUWU_CONFIG.api.ENDPOINT_PATTERN}?${params.toString()}`;
    let response = await fetch(apiUrl, {
        method: "GET",
        headers: {
            Accept: "application/json, text/plain, */*",
            Referer: chapterUrl || origin,
            "User-Agent": navigator.userAgent
        },
        credentials: "include"
    });
    if (!response.ok) {
        return null;
    }
    let data = await response.json();
    if (!data || data.code !== MOZISHUWU_CONFIG.api.SUCCESS_CODE) {
        return null;
    }
    if (!data.data || !data.data.chapter) {
        return null;
    }
    return data.data.chapter;
}
