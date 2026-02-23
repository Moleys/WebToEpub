"use strict";

parserFactory.register("m.gongzicp.com", () => new NovelDownloaderMGongzicpComParser());

class NovelDownloaderMGongzicpComParser extends Parser {
    constructor() {
        super();
        this.bookInfo = null;
        this.chapterIdByUrl = new Map();
    }

    async getChapterUrls(dom) {
        const bookIdText = dom.querySelector("span.c-light-gray")?.textContent || "";
        const bookId = bookIdText.replace("CP", "").trim();
        if (!bookId) {
            return [];
        }
        const novelInfoUrl = new URL("https://www.gongzicp.com/webapi/novel/novelInfo");
        novelInfoUrl.searchParams.set("id", bookId);
        const novelInfo = await fetchJson(novelInfoUrl.toString(), {
            credentials: "include",
            headers: {
                Accept: "application/json, text/plain, */*",
                Client: "pc",
                Lang: "cn",
                "Content-Type": "application/json;charset=utf-8"
            },
            method: "GET",
            mode: "cors"
        });
        if (novelInfo?.data) {
            this.bookInfo = {
                title: novelInfo.data.novel_name,
                author: novelInfo.data.author_nickname,
                intro: novelInfo.data.novel_info,
                cover: novelInfo.data.novel_cover,
                tags: novelInfo.data.tag_list
            };
        }
        const chapterListUrl = new URL("https://www.gongzicp.com/webapi/novel/chapterGetList");
        chapterListUrl.searchParams.set("nid", bookId);
        const chapterList = await fetchJson(chapterListUrl.toString(), {
            credentials: "include",
            headers: {
                Accept: "application/json, text/plain, */*",
                Client: "pc",
                Lang: "cn",
                "Content-Type": "application/json;charset=utf-8"
            },
            method: "GET",
            mode: "cors"
        });
        if (!chapterList?.data?.list) {
            return [];
        }
        let chapters = [];
        let currentArc = null;
        for (const item of chapterList.data.list) {
            if (item.type === "volume") {
                currentArc = item.name;
                continue;
            }
            if (item.type !== "item") {
                continue;
            }
            const chapterUrl = `${document.location.origin}/read-${item.id}.html`;
            let newArc = null;
            if (currentArc) {
                newArc = currentArc;
                currentArc = null;
            }
            const chapterName = item.name;
            chapters.push({ sourceUrl: chapterUrl, title: chapterName, newArc });
            this.chapterIdByUrl.set(chapterUrl, item.id);
        }
        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom) || dom.querySelector(".article-content") || dom.body;
    }

    extractTitleImpl(dom) {
        return this.bookInfo?.title || dom.querySelector("h1") || null;
    }

    extractAuthor(dom) {
        if (this.bookInfo?.author) {
            return this.bookInfo.author.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        let authorLabel = dom.querySelector(".author-name, .author a");
        if (authorLabel != null && authorLabel.textContent != null) {
            return authorLabel.textContent.replace(/\u4f5c\s*\u8005[\uff1a:]/, "").trim();
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        if (this.bookInfo?.intro) {
            const introDom = document.createElement("div");
            introDom.innerHTML = this.bookInfo.intro;
            return introDom.textContent?.trim() || this.bookInfo.intro;
        }
        return super.extractDescription(dom);
    }

    findCoverImageUrl(dom) {
        return this.bookInfo?.cover || util.getFirstImgSrc(dom, "img");
    }

    async fetchChapter(url) {
        const chapterId = this.chapterIdByUrl.get(url) || url.match(/read-(\d+)\.html/)?.[1];
        if (!chapterId) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const chapterInfoUrl = new URL("https://www.gongzicp.com/webapi/novel/chapterGetInfo");
        chapterInfoUrl.searchParams.set("cid", chapterId.toString());
        chapterInfoUrl.searchParams.set("server", "0");
        const token = sessionStorage.getItem("token") || "";
        const chapterInfo = await fetchJson(chapterInfoUrl.toString(), {
            credentials: "include",
            headers: {
                Accept: "application/json, text/plain, */*",
                Client: "pc",
                "Content-Type": "application/json",
                "Authorization": "Basic 6ZmI5aSn5a6dOmNwMTIzNDU2",
                "Token": token
            },
            method: "GET"
        });
        const content = chapterInfo?.data?.chapterInfo?.content || "";
        if (!content) {
            return (await HttpClient.wrapFetch(url)).responseXML;
        }
        const decrypted = cpDecrypt(content);
        const newDoc = Parser.makeEmptyDocForContent(url);
        const contentRaw = newDoc.dom.createElement("div");
        const paragraphs = decrypted.split("\n");
        for (const p of paragraphs) {
            const para = newDoc.dom.createElement("p");
            para.textContent = p.trim();
            contentRaw.appendChild(para);
        }
        newDoc.content.appendChild(contentRaw);
        return newDoc.dom;
    }

    findChapterTitle(dom, webPage) {
        let title = super.findChapterTitle(dom, webPage);
        if (title == null && webPage && webPage.title) {
            return webPage.title;
        }
        return title;
    }
}

function cpDecrypt(input) {
    class CP {
        constructor(iv, key) {
            iv += parseInt("165455", 14).toString(32);
            this.iv = CryptoJS.enc.Utf8.parse("$h$b3!" + iv);
            key = atob(key) + parseInt("4d5a6c8", 14).toString(36);
            this.key = CryptoJS.enc.Utf8.parse(key + "A");
        }
        decrypt(input) {
            const byte = CryptoJS.AES.decrypt(input, this.key, {
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
                iv: this.iv
            });
            return CryptoJS.enc.Utf8.stringify(byte).toString();
        }
    }
    const cp = new CP("iGzsYn", "dTBMUnJidSRFbg==");
    return cp.decrypt(input);
}

async function fetchJson(url, init) {
    const response = await fetch(url, init);
    if (!response.ok) {
        return null;
    }
    return response.json();
}
