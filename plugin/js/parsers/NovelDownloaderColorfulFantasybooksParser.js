"use strict";

parserFactory.register("colorful-fantasybooks.com", () => new NovelDownloaderColorfulFantasybooksParser());

class NovelDownloaderColorfulFantasybooksParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let links = [...dom.querySelectorAll("#list > .book-chapter-list .cf li > a")];
        return links.map(link => util.hyperLinkToChapter(link));
    }

    findContent(dom) {
        return dom.querySelector("div#txt") || Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-text > h1");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".book-text > span");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\u8005[:\uff1a]/, "").replace("\u8457", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let introDom = dom.querySelector(".intro");
        if (introDom != null) {
            return introDom.textContent;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "#fengmian img");
    }

    async fetchChapter(url) {
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        if (this.isDizishuChapter(url)) {
            let newDoc = await this.fetchDizishuContent(url, chapterDom);
            return newDoc ?? chapterDom;
        }
        return chapterDom;
    }

    isDizishuChapter(url) {
        return url.includes("dizishu");
    }

    async fetchDizishuContent(url, chapterDom) {
        let script1 = this.extractScriptLines(chapterDom, "chapterid=", (line) => {
            return !(line.includes("cpstr=") || line.includes("get_content()") || line.includes("xid="));
        });
        let script2 = this.extractScriptLines(chapterDom, "ssid", (line) => {
            return line.includes("var ssid") || line.includes("var hou");
        });
        if (script1 == null || script2 == null) {
            return null;
        }

        let origin = new URL(url).origin;
        let requestInfo = new Function(`${script2};${script1};\nconst xid=Math.floor(bookid/1000);\nconst chapterUrl=\`${origin}/files/article/html\${ssid}/\${xid}/\${bookid}/\${chapterid}\${hou}\`;\nreturn { url: chapterUrl, referrer: \"${origin}\" };`)();
        if (requestInfo == null || requestInfo.url == null) {
            return null;
        }

        let text = await this.fetchTextWithHeaders(requestInfo.url, requestInfo.referrer);
        if (text == null) {
            return null;
        }
        let cctxt = null;
        try {
            cctxt = new Function(`${text};return cctxt;`)();
        } catch (error) {
            ErrorLog.log(error);
            return null;
        }
        if (util.isNullOrEmpty(cctxt)) {
            return null;
        }

        let newDoc = Parser.makeEmptyDocForContent(url);
        newDoc.content.innerHTML = cctxt;
        return newDoc.dom;
    }

    extractScriptLines(dom, marker, filter) {
        let script = [...dom.querySelectorAll("script")]
            .filter(s => s.innerHTML.includes(marker))
            .map(s => s.innerHTML)[0];
        if (util.isNullOrEmpty(script)) {
            return null;
        }
        return script
            .split("\n")
            .filter(line => filter(line))
            .join("\n");
    }

    async fetchTextWithHeaders(url, referrer) {
        let wrapOptions = {
            responseHandler: new FetchTextResponseHandler(),
            fetchOptions: {
                method: "GET",
                mode: "cors",
                credentials: "include",
                referrer: referrer,
                headers: {
                    accept: "text/plain, */*; q=0.01",
                    "x-requested-with": "XMLHttpRequest"
                }
            }
        };
        return HttpClient.wrapFetchImpl(url, wrapOptions);
    }

    removeUnwantedElementsFromContentElement(element) {
        if (element != null) {
            rm("a", true, element);
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
