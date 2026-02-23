"use strict";

parserFactory.register("www.18kanshu.com", () => new NovelDownloaderWww18kanshuComParser());

class NovelDownloaderWww18kanshuComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let tocLink = dom.querySelector("div.menu_more_black > a");
        if (tocLink == null) {
            return [];
        }
        let tocDom = (await HttpClient.wrapFetch(tocLink.href)).responseXML;
        let items = [...tocDom.querySelectorAll("div.list_main.book_list")];
        let chapters = [];
        for (const item of items) {
            let onclick = item.getAttribute("onclick") || "";
            let start = onclick.indexOf("'") + 1;
            let end = onclick.lastIndexOf("'");
            if (start <= 0 || end <= start) {
                continue;
            }
            let href = onclick.substring(start, end);
            if (util.isNullOrEmpty(href)) {
                continue;
            }
            let link = tocDom.createElement("a");
            link.href = href;
            link.textContent = item.textContent?.trim() || "";
            chapters.push(util.hyperLinkToChapter(link));
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector(".readcontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".in_textone");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.in_texttwo:nth-child(2)");
        if (authorLabel != null && authorLabel.textContent != null) {
            let match = /\u4f5c\u8005\uff1a(.+)$/.exec(authorLabel.textContent.trim());
            if (match && match.length === 2) {
                return match[1].trim();
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".janjie");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book_top > div.img > img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
        }
        super.removeUnwantedElementsFromContentElement(element);
    }

    applyContentPatch(content) {
        Array.from(content.childNodes)
            .filter(node => node instanceof Text)
            .forEach(text => {
                if ((text.textContent || "").includes("\u3000\u3000")) {
                    content.insertBefore(content.ownerDocument.createElement("br"), text);
                }
            });
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

