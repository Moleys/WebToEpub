"use strict";

parserFactory.register("book.sfacg.com", () => new NovelDownloaderBookSfacgComParser());

class NovelDownloaderBookSfacgComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let bookName = dom.querySelector("h1.story-title")?.textContent?.trim() || "";
        let isLogin = !dom
            .querySelector(".user-bar > .top-link > .normal-link")
            ?.textContent?.includes("\u60a8\u597d\uff0cSF\u6e38\u5ba2");

        let chapters = [];
        let sections = Array.from(dom.querySelectorAll(".story-catalog"));
        if (sections.length > 0) {
            for (const section of sections) {
                let sectionName = section.querySelector(".catalog-title")?.textContent || null;
                if (sectionName != null) {
                    sectionName = sectionName.replace(`\u3010${bookName}\u3011`, "").trim();
                    if (sectionName === "") {
                        sectionName = null;
                    }
                }
                let newArc = sectionName;
                let links = section.querySelectorAll(".catalog-list a[href]");
                for (const link of Array.from(links)) {
                    let title = link.getAttribute("title")?.trim() || link.textContent?.trim() || link.href;
                    let isVip = link.querySelector(".icn_vip") != null;
                    chapters.push({
                        sourceUrl: link.href,
                        title: title,
                        newArc: newArc,
                        isIncludeable: !isVip || isLogin
                    });
                    newArc = null;
                }
            }
            return chapters;
        }

        let links = dom.querySelectorAll(".catalog-list a[href]");
        return Array.from(links).map(link => ({
            sourceUrl: link.href,
            title: link.getAttribute("title")?.trim() || link.textContent?.trim() || link.href,
            newArc: null
        }));
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector(".article-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author-name");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".introduce");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#hasTicket div.pic img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.findContent(chapterDom) != null) {
            return chapterDom;
        }
        let vipImage = chapterDom.querySelector(".article-content > #vipImage");
        if (vipImage) {
            let doc = Parser.makeEmptyDocForContent(url);
            let img = doc.dom.createElement("img");
            let src = vipImage.getAttribute("src") || vipImage.getAttribute("data-src");
            if (src) {
                img.setAttribute("data-src", src);
                img.alt = src;
            }
            doc.content.appendChild(img);
            return doc.dom;
        }
        return chapterDom;
    }

    findChapterTitle(dom, webPage) {
        let title = dom.querySelector("h1.article-title");
        if (title != null) {
            return title;
        }
        return super.findChapterTitle(dom, webPage) ?? (webPage ? webPage.title : null);
    }
}
