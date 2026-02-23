"use strict";

parserFactory.register("syosetu.org", () => new NovelDownloaderSyosetuOrgParser());

class NovelDownloaderSyosetuOrgParser extends Parser {
    constructor() {
        super();
        this.cachedChapterLinks = null;
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll('tr[class^="bgcolor"] > td > a')];
        if (links.length === 0) {
            let title = this.extractSingleChapterTitle(dom);
            return [{
                sourceUrl: dom.baseURI,
                title: title
            }];
        }
        this.cachedChapterLinks = links;
        return links.map(link => util.hyperLinkToChapter(link));
    }

    extractSingleChapterTitle(dom) {
        let node = dom.querySelector('div.ss > span[itemprop="name"], div.ss:nth-child(1) > p:nth-child(1) > span:nth-child(1) > a:nth-child(1)');
        return node?.textContent?.trim() ?? dom.title;
    }

    findContent(dom) {
        if (this.isSingleChapter(dom)) {
            return dom.querySelector("div#maind > div.ss:nth-child(2)");
        }
        return dom.querySelector("div#maind > div.ss:nth-child(1)");
    }

    isSingleChapter(dom) {
        if (this.cachedChapterLinks == null) {
            let links = [...dom.querySelectorAll('tr[class^="bgcolor"] > td > a')];
            this.cachedChapterLinks = links;
        }
        return this.cachedChapterLinks.length === 1 && this.cachedChapterLinks[0].href === dom.baseURI;
    }

    extractTitleImpl(dom) {
        return dom.querySelector('div.ss > span[itemprop="name"], div.ss:nth-child(1) > p:nth-child(1) > span:nth-child(1) > a:nth-child(1)');
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector('div.ss span[itemprop="author"] > a, div.ss:nth-child(1) > p:nth-child(1) > a:nth-child(2)');
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.isSingleChapter(dom)) {
            return super.extractDescription(dom);
        }
        let introDom = dom.querySelector("div.ss:nth-child(2)");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    extractLanguage() {
        return "ja";
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("p:nth-child(1)", false, element);
            rm("div.novelnavi", true, element);
            rm('div[style*="text-align:right;"]', true, element);
            rm("div#maegaki_open", true, element);
            rm("div#atogaki_open", true, element);
            element.querySelectorAll('a[name="img"]').forEach(a => {
                let img = element.ownerDocument.createElement("img");
                img.src = a.href;
                img.alt = a.textContent || "";
                a.replaceWith(img);
            });
        }
        super.removeUnwantedElementsFromContentElement(element);
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
