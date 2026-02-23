"use strict";

parserFactory.register("api.langge.cf", () => new NovelDownloaderLanggeParser());

class NovelDownloaderLanggeParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        const bookUrl = dom.baseURI;
        const chapterUrlPrefix = bookUrl.replace("online_detail", "online_reader") + "&item_id=";
        const regex = /goToChapter\('(\d+)'/;
        const chapterList = Array.from(dom.querySelectorAll("#chapterList > div.chapter-item"));
        let index = 0;
        return chapterList.map(item => {
            index++;
            const onclickAttr = item.getAttribute("onclick") || "";
            const match = onclickAttr.match(regex);
            let chapterId = match ? match[1] : null;
            let chapterName = item.querySelector("span")?.textContent?.trim() || String(index);
            let a = dom.createElement("a");
            a.href = chapterId ? chapterUrlPrefix + chapterId : chapterUrlPrefix;
            a.textContent = chapterName;
            return util.hyperLinkToChapter(a);
        });
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.book-info > h1");
    }

    extractAuthor(dom) {
        let authorDom = dom.querySelector("div.book-info > p");
        if (authorDom != null) {
            rm("strong", true, authorDom);
            if (authorDom.textContent != null) {
                return authorDom.textContent.replace("\u4f5c\u8005: ", "").trim();
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let info = dom.querySelector("div.book-info");
        return info?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "img.book-cover");
    }

    async fetchChapter(url) {
        let contentUrl = url.replace("/online_reader?", "/content?");
        let key = await getCookie("secretKey2", contentUrl);
        if (key) {
            contentUrl += "&key=" + encodeURIComponent(key);
        }
        let response = await HttpClient.fetchJson(contentUrl, {
            headers: {
                Accept: "application/json, text/javascript, */*; q=0.01",
                "Cache-Control": "no-cache"
            },
            credentials: "include"
        });
        let data = response.json;
        let dom = new DOMParser().parseFromString("<html><body><div id='content'></div></body></html>", "text/html");
        let content = dom.querySelector("#content");
        if (content && data && data.content) {
            content.textContent = data.content;
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

async function getCookie(name, url) {
    let targetUrl = null;
    try {
        targetUrl = new URL(url).origin;
    } catch (error) {
        targetUrl = null;
    }
    if (typeof chrome !== "undefined" && chrome.cookies && targetUrl) {
        return new Promise(resolve => {
            chrome.cookies.get({ url: targetUrl, name: name }, cookie => {
                resolve(cookie ? cookie.value : null);
            });
        });
    }
    if (typeof browser !== "undefined" && browser.cookies && targetUrl) {
        try {
            let cookie = await browser.cookies.get({ url: targetUrl, name: name });
            return cookie ? cookie.value : null;
        } catch (error) {
            return null;
        }
    }
    return null;
}

function rm(selector, deep, dom) {
    if (!dom) {
        return;
    }
    let nodes = dom.querySelectorAll(selector);
    nodes.forEach(node => {
        if (deep) {
            node.remove();
        } else if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    });
}
