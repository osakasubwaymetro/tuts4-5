// idbcache.js v1.0.0
// 大きいマスタデータ（number シートなど）を localStorage ではなく IndexedDB に保存するための小さなヘルパー。
// localStorage は5MB程度しか使えず、他のキャッシュや未送信データと容量を取り合ってしまうため。
// IndexedDB が使えない環境（一部のプライベートモード等）では、保存せずネットワーク取得だけで動く。
(function () {
  const DB_NAME = "tuts4_cache";
  const STORE = "kv";
  const LEGACY_PREFIX = "tuts4_master_";
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        if (!window.indexedDB) { reject(new Error("no indexedDB")); return; }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("blocked"));
      } catch (e) { reject(e); }
    });
    return dbPromise;
  }

  function withStore(mode, fn) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const st = tx.objectStore(STORE);
      const r = fn(st);
      tx.oncomplete = () => resolve(r && "result" in r ? r.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  const api = {
    get(key) { return withStore("readonly", st => st.get(key)).catch(() => undefined); },
    set(key, val) { return withStore("readwrite", st => st.put(val, key)).catch(() => {}); },
    del(key) { return withStore("readwrite", st => st.delete(key)).catch(() => {}); },
    clear() { return withStore("readwrite", st => st.clear()).catch(() => {}); },

    // fetchCachedMasterData と同じ使い方。キャッシュがあれば先に handler(cached)、
    // その後ネットワークから最新を取って handler(latest) して保存する（どちらも非同期）。
    fetchMaster(cacheKey, url, handler, fetcher) {
      const key = LEGACY_PREFIX + cacheKey;
      // 以前 localStorage に保存していた分は容量を食うだけなので消す
      try { localStorage.removeItem(key); } catch (e) {}
      api.get(key).then(cached => {
        if (Array.isArray(cached) && cached.length) { try { handler(cached); } catch (e) { console.error(e); } }
      }).then(() => fetcher(url, cacheKey)).then(data => {
        if (!data || !Array.isArray(data) || !data.length) return; // 取得失敗ならキャッシュを使い続ける
        handler(data);
        api.set(key, data);
      }).catch(e => console.error("マスタ取得エラー:", cacheKey, e));
    }
  };

  window.tuts4IdbCache = api;
})();
