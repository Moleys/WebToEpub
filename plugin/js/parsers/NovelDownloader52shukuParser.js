"use strict";

parserFactory.register("www.52shuku.vip", () => new NovelDownloader52shukuParser());

class NovelDownloader52shukuParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 50;
        this.maxSimultanousFetchSize = 1;
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("ul.list");
        if (menu == null) {
            return [];
        }
        let links = menu.querySelectorAll("li.mulu > a");
        return [...links].map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("#nr1");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.article-title");
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("article.article-content > p:nth-of-type(2)");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            this.applyContentPatch(element);
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

    applyContentPatch(content) {
        let divElement = content.querySelector("div");
        if (divElement) {
            let nextElement = divElement.nextElementSibling;
            while (nextElement) {
                const elementToRemove = nextElement;
                nextElement = nextElement.nextElementSibling;
                elementToRemove.remove();
            }
        }
        rm("div", true, content);
        let links = content.querySelectorAll("a");
        links.forEach(link => {
            link.replaceWith(document.createTextNode(link.textContent || ""));
        });
        return content;
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


