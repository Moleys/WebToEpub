"use strict";

parserFactory.register("www.xfxs1.com", () => new NovelDownloaderWwwXfxs1ComParser());

class NovelDownloaderWwwXfxs1ComParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let chapterListLink = dom.querySelector("a.chapterlist");
        if (!chapterListLink) {
            return [];
        }
        let chapterListDom = (await HttpClient.wrapFetch(chapterListLink.href)).responseXML;
        let indexSelect = chapterListDom.getElementById("indexselect");
        let indexUrls = [];
        if (indexSelect) {
            indexUrls = [...indexSelect.querySelectorAll("option")]
                .map(option => option.getAttribute("value"))
                .filter(value => !util.isNullOrEmpty(value))
                .map(value => new URL(value, chapterListDom.baseURI).href);
        }
        if (indexUrls.length === 0) {
            indexUrls = [chapterListDom.baseURI];
        }

        let seen = new Set();
        let chapters = [];
        for (const indexUrl of indexUrls) {
            let tocDom = (await HttpClient.wrapFetch(indexUrl)).responseXML;
            let links = [...tocDom.querySelectorAll("div.booklist > ul > li > a")];
            for (const link of links) {
                let chapter = util.hyperLinkToChapter(link);
                let key = util.normalizeUrlForCompare(chapter.sourceUrl);
                if (!seen.has(key)) {
                    seen.add(key);
                    chapters.push(chapter);
                }
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#chaptercontent");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h2 > span > a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector("div.intro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover > img");
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
        let lastParagraphIndex = [];
        let totalParagraphs = 0;

        this.applyContentPatch(content);
        totalParagraphs += content.children.length;
        lastParagraphIndex.push(totalParagraphs - 1);

        let nextUrl = this.getNextPageUrl(chapterDom);
        while (!util.isNullOrEmpty(nextUrl) && this.shouldContinueNextPage(nextUrl)) {
            let nextDom = (await HttpClient.wrapFetch(nextUrl)).responseXML;
            let nextContent = this.findContent(nextDom);
            if (nextContent != null) {
                this.applyContentPatch(nextContent);
                for (const child of Array.from(nextContent.childNodes)) {
                    content.appendChild(chapterDom.importNode(child, true));
                }
                totalParagraphs += nextContent.children.length;
                lastParagraphIndex.push(totalParagraphs - 1);
            }
            nextUrl = this.getNextPageUrl(nextDom);
        }

        this.mergeParagraphs(content, lastParagraphIndex);
    }

    getNextPageUrl(dom) {
        let nextPageLink = dom.querySelector("a#next_url");
        if (nextPageLink && (nextPageLink.textContent || "").includes("??")) {
            return nextPageLink.href;
        }
        return "";
    }

    shouldContinueNextPage(nextUrl) {
        return nextUrl !== "" && nextUrl.includes(".html");
    }

    applyContentPatch(content) {
        rm2(["????,?????????"], content);

        if (content.lastChild) {
            let lastNode = content.lastChild;
            if ((lastNode.textContent || "").includes("\n")) {
                lastNode.remove();
            }
        }

        while (content.lastChild) {
            let lastNode = content.lastChild;
            if (lastNode.nodeType === Node.ELEMENT_NODE && lastNode.tagName === "BR") {
                lastNode.remove();
            } else {
                break;
            }
        }
        return content;
    }

    mergeParagraphs(content, lastParagraphIndex) {
        for (let i = 0; i < lastParagraphIndex.length - 1; i++) {
            let index = lastParagraphIndex[i] - i;
            let lastParagraph = content.children[index];
            if (!lastParagraph || !lastParagraph.nextElementSibling) {
                continue;
            }
            let nextParagraph = lastParagraph.nextElementSibling;
            while (lastParagraph && lastParagraph.innerHTML.endsWith("<br>")) {
                let prevParagraph = lastParagraph.previousElementSibling;
                lastParagraph.remove();
                lastParagraph = prevParagraph;
            }
            if (lastParagraph && nextParagraph) {
                lastParagraph.innerHTML += nextParagraph.innerHTML;
                nextParagraph.remove();
            }
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

function rm2(filters, dom) {
    function doRemove(nodes) {
        Array.from(nodes.childNodes).forEach(node => {
            let text = node.nodeName === "#text"
                ? (node.textContent || "")
                : (node.innerText || "");
            if (text.length < 200 || node.nodeName === "#text") {
                for (const filter of filters) {
                    if (filter instanceof RegExp) {
                        if (filter.test(text)) {
                            node.remove();
                        }
                    } else if (typeof filter === "string") {
                        if (text.includes(filter)) {
                            node.remove();
                        }
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                doRemove(node);
            }
        });
    }
    doRemove(dom);
}

