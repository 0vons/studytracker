"use strict";
(function(){
  const BASE = "";

  async function request(method, url, body, skipAuth){
    const headers = { "Content-Type":"application/json" };
    if(!skipAuth){
      const tok = localStorage.getItem("accessToken");
      if(tok) headers["Authorization"] = `Bearer ${tok}`;
    }
    const opts = { method, headers };
    if(body !== undefined) opts.body = JSON.stringify(body);

    let res = await fetch(BASE + url, opts);

    if(res.status === 401 && !skipAuth){
      const rt = localStorage.getItem("refreshToken");
      if(rt){
        const rr = await fetch(BASE + "/auth/refresh", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ refreshToken: rt })
        });
        if(rr.ok){
          const data = await rr.json();
          localStorage.setItem("accessToken",  data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          headers["Authorization"] = `Bearer ${data.accessToken}`;
          res = await fetch(BASE + url, { method, headers, body: opts.body });
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          location.reload();
          return;
        }
      }
    }

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text }; }
    if(!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  window.API = {
    get:  (url)       => request("GET",    url),
    post: (url, body, skipAuth) => request("POST",   url, body, skipAuth),
    put:  (url, body) => request("PUT",    url, body),
    del:  (url)       => request("DELETE", url),
  };
})();
