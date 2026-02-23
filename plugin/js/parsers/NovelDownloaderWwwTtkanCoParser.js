"use strict";

parserFactory.register("www.ttkan.co", () => new NovelDownloaderWwwTtkanCoParser());

class NovelDownloaderWwwTtkanCoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const host = new URL(dom.baseURI).host;
        const language = host.split(".")[0] === "tw" ? "tw" : "cn";
        const parts = new URL(dom.baseURI).pathname.split("/");
        const novelId = parts[3] || parts[2];
        if (!novelId) {
            return [];
        }
        const tocUrl = `https://${host}/api/nq/amp_novel_chapters?language=${language}&novel_id=${novelId}&__amp_source_origin=https%3A%2F%2Fwww.ttkan.co`;
        const res = await fetch(tocUrl, {
            headers: {
                Accept: "application/json",
                "AMP-Same-Origin": "true"
            },
            method: "GET"
        });
        if (!res.ok) {
            return [];
        }
        const data = await res.json();
        if (!data || !Array.isArray(data.items)) {
            return [];
        }
        return data.items.map(item => ({
            sourceUrl: `https://${host}/novel/user/page_direct?novel_id=${novelId}&page=${item.chapter_id}`,
            title: item.chapter_name,
            newArc: null
        }));
    }

    findContent(dom) {
        return dom.querySelector(".content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel_info h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector('meta[name="og:novel:author"]');
        if (authorLabel && authorLabel.getAttribute("content")) {
            return authorLabel.getAttribute("content").replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".description");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".novel_info amp-img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("a", true, element);
            const ttkanAd = /[wWщшω]{0,3} ?[¸◆⊕●.•＿¤☢⊙▲✿★▪]? ?(?:[tTтⓣ] ?){2}[kKκКⓚ] ?[aAǎáдāΛⓐ] ?[nNⓝ] ?[¸◆⊕●.•＿¤☢⊙▲✿★▪]? ?[cCС￠℃] ?[oO〇○Ο] ?/gi;
            rms([ttkanAd], element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
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

function rms(filters, dom) {
    for (const ad of filters) {
        if (typeof ad === "string") {
            dom.innerHTML = dom.innerHTML.split(ad).join("");
        } else if (ad instanceof RegExp) {
            dom.innerHTML = dom.innerHTML.replace(ad, "");
        }
    }
    return dom;
}
