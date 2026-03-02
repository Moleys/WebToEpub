"use strict";

class ParserSupportLoader {
    constructor(index) {
        this.index = index || null;
        this.loaded = new Set();
        this.loading = new Map();
        this.compiledSupportIndex = null;
        this.hostToCandidatesCache = new Map();
        this.indexLoadPromise = null;
        this.preloadPromise = null;
        this.domScriptSnapshotTaken = false;
        this.warnedIndexLoadFailure = false;
        this.preloaded = false;
    }

    static emptyIndex() {
        return {
            version: 2,
            preloadedFiles: [],
            supported: [],
            fileMeta: {},
            manualNameToFile: {},
            manualSelectionNames: [""],
        };
    }

    static async loadIndexFromJson() {
        let jsonPath = "js/ParserSupported.json";
        let jsonUrl = (typeof chrome !== "undefined") && chrome.runtime && chrome.runtime.getURL
            ? chrome.runtime.getURL(jsonPath)
            : jsonPath;
        let response = await fetch(jsonUrl);
        if (!response.ok) {
            throw new Error("Failed to load parser support index: " + response.status);
        }
        return await response.json();
    }

    warnIndexLoadFailure(error) {
        if (this.warnedIndexLoadFailure) {
            return;
        }
        this.warnedIndexLoadFailure = true;
        console.warn("Parser support index unavailable, falling back to empty index.", error);
    }

    async ensureIndexLoaded() {
        if (this.index != null) {
            return;
        }
        if (this.indexLoadPromise == null) {
            this.indexLoadPromise = ParserSupportLoader.loadIndexFromJson()
                .then(index => {
                    this.index = index || ParserSupportLoader.emptyIndex();
                    this.compiledSupportIndex = null;
                    this.hostToCandidatesCache.clear();
                }).catch((error) => {
                    this.index = ParserSupportLoader.emptyIndex();
                    this.compiledSupportIndex = null;
                    this.hostToCandidatesCache.clear();
                    this.warnIndexLoadFailure(error);
                });
        }
        await this.indexLoadPromise;
    }

    syncLoadedScriptsFromDom() {
        if (this.domScriptSnapshotTaken) {
            return;
        }
        let scripts = document.querySelectorAll("script[src]");
        for (let script of scripts) {
            let src = script.getAttribute("src");
            if (util.isNullOrEmpty(src)) {
                continue;
            }
            this.loaded.add(src);
            try {
                let normalized = (new URL(src, document.baseURI)).pathname.replace(/^\/+/, "");
                this.loaded.add(normalized);
            } catch (error) {
                // ignore malformed URLs in script tags
            }
        }
        this.domScriptSnapshotTaken = true;
    }

    getFileMeta(path) {
        let index = this.index || ParserSupportLoader.emptyIndex();
        return index.fileMeta[path] || {
            hosts: [],
            manualNames: [],
            hasUrlRule: false,
            hasDomRule: false,
            dependsOn: [],
        };
    }

    isLoaded(path) {
        return this.loaded.has(path);
    }

    markIfAlreadyLoaded(path) {
        if (this.loaded.has(path)) {
            return true;
        }
        this.syncLoadedScriptsFromDom();
        return this.loaded.has(path);
    }

    shouldSkipLoadBecauseRegistered(path) {
        let meta = this.getFileMeta(path);
        if (meta.hosts.length === 0 && meta.manualNames.length === 0 && !meta.hasUrlRule && !meta.hasDomRule) {
            return false;
        }
        let allHostsKnown = meta.hosts.length > 0 && meta.hosts.every(h => parserFactory.hasParserForHost(h));
        let allManualKnown = meta.manualNames.every(n => parserFactory.hasManualSelection(n));
        let noRules = !meta.hasUrlRule && !meta.hasDomRule;
        return allHostsKnown && allManualKnown && noRules;
    }

    static extractExactHostPattern(pattern) {
        if (typeof pattern !== "string") {
            return null;
        }
        let match = pattern.match(/^\^([a-z0-9-]+(?:\\\.[a-z0-9-]+)*)\$$/i);
        if (match == null) {
            return null;
        }
        return ParserFactory.stripLeadingWww(match[1].replace(/\\\./g, ".").toLowerCase());
    }

    getCompiledSupportIndex() {
        if (this.compiledSupportIndex != null) {
            return this.compiledSupportIndex;
        }
        let exactHostToFiles = new Map();
        let regexEntries = [];
        let index = this.index || ParserSupportLoader.emptyIndex();
        let supported = index.supported || [];
        for (let entry of supported) {
            if ((entry == null) || util.isNullOrEmpty(entry.host) || util.isNullOrEmpty(entry.js)) {
                continue;
            }
            let exactHost = ParserSupportLoader.extractExactHostPattern(entry.host);
            if (exactHost != null) {
                let files = exactHostToFiles.get(exactHost);
                if (files == null) {
                    files = [];
                    exactHostToFiles.set(exactHost, files);
                }
                files.push(entry.js);
                continue;
            }
            try {
                regexEntries.push({
                    hostRegex: new RegExp(entry.host),
                    js: entry.js,
                    version: entry.version || 1,
                });
            } catch (error) {
                // ignore invalid regex entries
            }
        }
        this.compiledSupportIndex = { exactHostToFiles, regexEntries };
        return this.compiledSupportIndex;
    }

    filesForHost(hostName) {
        if (util.isNullOrEmpty(hostName)) {
            return [];
        }
        let normalizedHost = ParserFactory.stripLeadingWww(hostName.toLowerCase());
        let cached = this.hostToCandidatesCache.get(normalizedHost);
        if (cached != null) {
            return cached;
        }
        let supportIndex = this.getCompiledSupportIndex();
        let files = [];
        let seen = new Set();
        let exactFiles = supportIndex.exactHostToFiles.get(normalizedHost) || [];
        for (let file of exactFiles) {
            if (seen.has(file)) {
                continue;
            }
            seen.add(file);
            files.push(file);
        }
        for (let entry of supportIndex.regexEntries) {
            if (!entry.hostRegex.test(normalizedHost) || seen.has(entry.js)) {
                continue;
            }
            seen.add(entry.js);
            files.push(entry.js);
        }
        this.hostToCandidatesCache.set(normalizedHost, files);
        return files;
    }

    async withDuplicateSafeRegistration(action) {
        let originalRegister = parserFactory.register.bind(parserFactory);
        let originalRegisterDeadSite = parserFactory.registerDeadSite.bind(parserFactory);
        let originalRegisterManualSelect = parserFactory.registerManualSelect.bind(parserFactory);
        parserFactory.register = (hostName, constructor) => {
            if (parserFactory.hasParserForHost(hostName)) {
                return;
            }
            originalRegister(hostName, constructor);
        };
        parserFactory.registerDeadSite = (hostName, constructor) => {
            if (parserFactory.hasParserForHost(hostName)) {
                return;
            }
            originalRegisterDeadSite(hostName, constructor);
        };
        parserFactory.registerManualSelect = (name, constructor) => {
            if (parserFactory.hasManualSelection(name)) {
                return;
            }
            originalRegisterManualSelect(name, constructor);
        };
        try {
            await action();
        } finally {
            parserFactory.register = originalRegister;
            parserFactory.registerDeadSite = originalRegisterDeadSite;
            parserFactory.registerManualSelect = originalRegisterManualSelect;
        }
    }

    async loadFile(path) {
        if (this.isLoaded(path) || this.markIfAlreadyLoaded(path)) {
            this.loaded.add(path);
            return;
        }
        let inFlight = this.loading.get(path);
        if (inFlight != null) {
            await inFlight;
            return;
        }
        if (this.shouldSkipLoadBecauseRegistered(path)) {
            this.loaded.add(path);
            return;
        }
        let scriptContainer = document.getElementById("scriptContainer");
        if (scriptContainer == null) {
            throw new Error("Failed to load parser script: missing script container");
        }
        let promise = this.withDuplicateSafeRegistration(() => new Promise((resolve, reject) => {
            let script = document.createElement("script");
            script.src = path;
            script.async = false;
            script.onload = () => {
                this.loaded.add(path);
                resolve();
            };
            script.onerror = () => reject(new Error("Failed to load parser script: " + path));
            scriptContainer.appendChild(script);
        }));
        this.loading.set(path, promise);
        try {
            await promise;
        } finally {
            this.loading.delete(path);
        }
    }

    async loadWithDependencies(path, visiting = new Set()) {
        if (this.markIfAlreadyLoaded(path)) {
            return;
        }
        if (visiting.has(path)) {
            return;
        }
        visiting.add(path);
        try {
            let dependsOn = this.getFileMeta(path).dependsOn || [];
            for (let dep of dependsOn) {
                await this.loadWithDependencies(dep, visiting);
            }
            await this.loadFile(path);
        } finally {
            visiting.delete(path);
        }
    }

    async ensurePreloaded() {
        await this.ensureIndexLoaded();
        if (this.preloaded) {
            return;
        }
        if (this.preloadPromise == null) {
            this.preloadPromise = (async () => {
                this.syncLoadedScriptsFromDom();
                for (let path of this.index.preloadedFiles || []) {
                    await this.loadWithDependencies(path);
                }
                this.preloaded = true;
            })().catch((error) => {
                this.preloadPromise = null;
                throw error;
            });
        }
        await this.preloadPromise;
    }

    async loadCandidates(paths, url, dom) {
        for (let path of paths) {
            await this.loadWithDependencies(path);
            if (parserFactory.hasParserForUrl(url)) {
                return;
            }
            if ((dom != null) && parserFactory.hasParserRuleForDom(url, dom)) {
                return;
            }
        }
    }

    async ensureForUrl(url, dom) {
        await this.ensurePreloaded();
        if (parserFactory.hasParserForUrl(url)) {
            return;
        }
        let hostName = ParserFactory.hostNameForParserSelection(url);
        let candidates = this.filesForHost(hostName);
        await this.loadCandidates(candidates, url, dom);
    }

    async ensureForManual(parserName) {
        await this.ensurePreloaded();
        if (parserFactory.hasManualSelection(parserName)) {
            return;
        }
        let path = this.index.manualNameToFile[parserName];
        if (!util.isNullOrEmpty(path)) {
            await this.loadWithDependencies(path);
        }
    }

    populateManualSelect(selectTag) {
        let options = selectTag.options;
        if (options.length !== 0) {
            return;
        }
        let index = this.index || ParserSupportLoader.emptyIndex();
        let names = index.manualSelectionNames;
        if ((names == null) || (names.length === 0)) {
            names = Object.keys(index.manualNameToFile || {});
            if (!names.includes("")) {
                names.unshift("");
            }
        }
        for (let name of names) {
            options.add(new Option(name));
        }
    }
}

let parserSupportLoader = new ParserSupportLoader(globalThis.parserSupportedIndex || null);
