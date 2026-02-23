"use strict";

parserFactory.register("www.kadokado.com.tw", () => new NovelDownloaderWwwKadokadoComTwParser());

class NovelDownloaderWwwKadokadoComTwParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapters = [];
        let sectionList = Array.from(dom.querySelectorAll("section#chapter > div > div"));
        for (const section of sectionList) {
            let newArc = section.querySelector("h3")?.textContent?.trim() || null;
            let chapterList = Array.from(section.querySelectorAll("ul li"));
            for (const chapter of chapterList) {
                let link = chapter.querySelector("a");
                if (!link) {
                    continue;
                }
                let title = chapter.querySelector("h4")?.textContent?.trim() || link.textContent?.trim() || link.href;
                chapters.push({ sourceUrl: link.href, title: title, newArc: newArc });
                newArc = null;
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("ul > div");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("main > section div h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("main > section > div > div > span > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector("section#introduction p");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "main > section img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.findContent(chapterDom) != null) {
            return chapterDom;
        }
        try {
            let iframeDom = await HttpClient.fetchIframeDom(url, {
                waitForSelector: "ul > div"
            });
            if (this.findContent(iframeDom) != null) {
                return iframeDom;
            }
        } catch {
            // ignore and fall back to chapterDom
        }
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
