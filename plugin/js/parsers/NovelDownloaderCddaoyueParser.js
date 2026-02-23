"use strict";

/* global CryptoJS */

parserFactory.register("www.cddaoyue.cn", () => new NovelDownloaderCddaoyueParser());

class NovelDownloaderCddaoyueParser extends Parser {
    constructor() {
        super();
        this.minimumThrottle = 500;
    }

    async getChapterUrls(dom) {
        let chapterTitles = Array.from(dom.querySelectorAll("#chapter_list > div.chapter > div.chapter-title"));
        let articles = dom.querySelectorAll("#chapter_list > div.chapter > div.articles");
        let chapters = [];
        let currentArc = null;
        for (let i = 0; i < articles.length; i++) {
            let sectionName = chapterTitles[i]?.textContent?.trim() || null;
            let newArc = (sectionName && sectionName !== currentArc) ? sectionName : null;
            if (sectionName) {
                currentArc = sectionName;
            }
            let links = articles[i].querySelectorAll("span.chapter_item a");
            for (const link of Array.from(links)) {
                chapters.push(util.hyperLinkToChapter(link, newArc));
                newArc = null;
            }
        }
        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".book-title > span");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("div.username");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace("\u4f5c\u8005: ", "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let intro = dom.querySelector(".book-brief");
        return intro?.textContent?.trim() ?? super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".book-img");
    }

    extractLanguage() {
        return "zh";
    }

    async fetchChapter(url) {
        let chapterId = extractChapterId(url);
        let chapterDom = (await HttpClient.wrapFetch(url)).responseXML;
        let authorSayHtml = buildAuthorSayHtml(chapterDom);
        let html = await decryptChapter(chapterId, url);

        let dom = new DOMParser().parseFromString("<html><body><div id='content'></div></body></html>", "text/html");
        let content = dom.querySelector("#content");
        if (content) {
            content.innerHTML = html || "";
            rm(".chapter span", true, content);
            if (!util.isNullOrEmpty(authorSayHtml)) {
                let wrapper = dom.createElement("div");
                wrapper.innerHTML = authorSayHtml;
                content.appendChild(wrapper);
            }
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

const CDDAOYUE_ROOT_PATH = "https://www.cddaoyue.cn/";

function extractChapterId(url) {
    let match = url.match(/\/(\d+)(?:\.html)?(?:\?.*)?$/);
    return match ? match[1] : url.split("/").pop();
}

function buildAuthorSayHtml(doc) {
    let nodes = doc.querySelectorAll("#J_BookCnt .chapter.author_say");
    if (!nodes || nodes.length === 0) {
        return "";
    }
    let container = doc.createElement("div");
    container.appendChild(doc.createElement("hr"));
    for (const node of Array.from(nodes)) {
        rm("i", true, node);
        container.appendChild(node);
    }
    return container.innerHTML;
}

async function decryptChapter(chapterId, chapterUrl) {
    let accessKeyUrl = CDDAOYUE_ROOT_PATH + "chapter/ajax_get_session_code";
    let contentUrl = CDDAOYUE_ROOT_PATH + "chapter/get_book_chapter_detail_info";
    let origin = new URL(CDDAOYUE_ROOT_PATH).origin;

    let accessKeyObj = await postJson(accessKeyUrl, { chapter_id: chapterId }, chapterUrl, origin);
    let accessKey = accessKeyObj?.chapter_access_key;
    if (util.isNullOrEmpty(accessKey)) {
        throw new Error(`Missing chapter access key for ${chapterUrl}`);
    }

    let chapterContentObj = await postJson(
        contentUrl,
        { chapter_id: chapterId, chapter_access_key: accessKey },
        chapterUrl,
        origin
    );
    if (!chapterContentObj || chapterContentObj.code !== 100000) {
        throw new Error(`Failed to fetch chapter content for ${chapterUrl}`);
    }

    return decrypt({
        content: chapterContentObj.chapter_content,
        keys: chapterContentObj.encryt_keys,
        accessKey: accessKey
    });
}

async function postJson(url, data, referer, origin) {
    let body = new URLSearchParams();
    for (const key of Object.keys(data)) {
        body.append(key, data[key]);
    }
    let response = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: referer,
            Origin: origin,
            "X-Requested-With": "XMLHttpRequest"
        },
        body: body.toString(),
        credentials: "include"
    });
    return await response.json();
}

function decrypt(item) {
    let message = item.content;
    let keys = item.keys;
    let len = keys.length;
    let accessKey = item.accessKey;
    let accessKeyList = accessKey.split("");
    let output = [];
    output.push(keys[accessKeyList[accessKeyList.length - 1].charCodeAt(0) % len]);
    output.push(keys[accessKeyList[0].charCodeAt(0) % len]);

    for (let i = 0; i < output.length; i++) {
        message = atob(message);
        let data = output[i];
        let iv = btoa(message.substr(0, 16));
        let keys255 = btoa(message.substr(16));
        let pass = CryptoJS.format.OpenSSL.parse(keys255);
        message = CryptoJS.AES.decrypt(pass, CryptoJS.enc.Base64.parse(data), {
            iv: CryptoJS.enc.Base64.parse(iv),
            format: CryptoJS.format.OpenSSL
        });
        if (i < output.length - 1) {
            message = message.toString(CryptoJS.enc.Base64);
            message = atob(message);
        }
    }

    return message.toString(CryptoJS.enc.Utf8);
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
