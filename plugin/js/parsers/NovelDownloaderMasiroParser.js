"use strict";

parserFactory.register("masiro.me", () => new NovelDownloaderMasiroParser());

class NovelDownloaderMasiroParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll(".chapter-ul ul.episode-ul > a")];
        return links.map(link => this.linkToChapter(link));
    }

    linkToChapter(link) {
        let name = link.querySelector('span[style^="overflow: hidden;"]')?.textContent?.trim() ?? "";
        let chapter = util.hyperLinkToChapter(link);
        chapter.title = name;
        let vipInfo = this.getVipInfo(link);
        if (vipInfo.isVIP && !vipInfo.isPaid) {
            chapter.isIncludeable = false;
        }
        return chapter;
    }

    getVipInfo(link) {
        let isVIP = false;
        let isPaid = false;
        let small = link.querySelector("small");
        if (small != null) {
            let text = small.textContent?.trim() ?? "";
            if (text !== "") {
                isVIP = true;
                if (text === "\u5df2\u8d2d") {
                    isPaid = true;
                }
            }
        }
        return { isVIP, isPaid };
    }

    findContent(dom) {
        return dom.querySelector("div.box-body.nvl-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".novel-title");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".author > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".brief");
        if (introDom != null) {
            return (introDom.textContent || "").replace("\u7b80\u4ecb\uff1a", "").trim();
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.mailbox-attachment-icon > a > img.img");
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            element.querySelectorAll("img").forEach(img => {
                let heightAttr = Number.parseFloat(img.getAttribute("height") ?? "100");
                let styleHeight = img.style.height ? Number.parseFloat(img.style.height) : 100;
                let isAttrSmall = Number.isFinite(heightAttr) && heightAttr <= 1;
                let isStyleSmall = Number.isFinite(styleHeight) && styleHeight <= 1;
                if (isAttrSmall || isStyleSmall) {
                    img.remove();
                }
            });
        }
        super.removeUnwantedElementsFromContentElement(element);
    }
}
