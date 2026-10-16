export default {
  // 매시간 크롤링 실행
  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.crawlAll(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    // 수동 크롤링 트리거
    if (url.pathname === "/api/crawl") {
      try {
        const result = await this.crawlAll(env);
        return Response.json(result, { headers: cors });
      } catch (e) {
        return Response.json({ error: true, message: `크롤링 실패: ${e.message}` }, { status: 500, headers: cors });
      }
    }

    // 대시보드가 보는 API - D1에서만 조회 (크롤러가 저장한 것만)
    if (url.pathname === "/api/dashboard") {
      try {
        if (!env.DB) throw new Error("D1 DB 바인딩 없음");
        const { results: news } = await env.DB.prepare("SELECT * FROM news ORDER BY published_at DESC LIMIT 20").all();
        const { results: keywords } = await env.DB.prepare("SELECT * FROM keywords WHERE active=1").all();
        const { results: freights } = await env.DB.prepare("SELECT * FROM freight_index ORDER BY created_at DESC LIMIT 10").all();
        if (freights.length === 0) throw new Error("크롤링 데이터 없음 - /api/crawl 을 먼저 실행하세요");
        return Response.json({ news, keywords, freights, updatedAt: new Date().toISOString() }, { headers: cors });
      } catch (e) {
        return Response.json({ error: true, message: e.message }, { status: 500, headers: cors });
      }
    }

    return Response.json({ message: "Endpoints: /api/crawl (크롤링 실행), /api/dashboard (대시보드 조회)" }, { headers: cors });
  },

  async crawlAll(env) {
    if (!env.DB) throw new Error("DB 없음");
    const logs = [];

    // 1. WTI 크롤링 - 【entity-Yahoo¦canonical_name=Yahoo】 차트 (API 키 없이 HTML처럼 크롤링)
    try {
      const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?range=1d&interval=1m", { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`Yahoo ${res.status}`);
      const j = await res.json();
      const price = j.chart.result[0].meta.regularMarketPrice;
      await env.DB.prepare("INSERT INTO freight_index (type, name, value, source) VALUES (?,?,?,?)").bind("oil", "WTI", price, "Yahoo CL=F Crawler").run();
      logs.push(`WTI: ${price}`);
    } catch (e) { logs.push(`WTI 실패: ${e.message}`); throw e; }

    // 2. 뉴스 크롤링 - Google News RSS (키 없음)
    try {
      const keywords = await env.DB.prepare("SELECT keyword FROM keywords WHERE active=1").all();
      const kwList = keywords.results.length? keywords.results : [{keyword:"컨테이너 운임"}, {keyword:"해운"}];
      for (const k of kwList.slice(0,3)) {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(k.keyword)}+logistics&hl=ko&gl=KR&ceid=KR:ko`;
        const rssRes = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const rssText = await rssRes.text();
        // 간단 파싱 - <item> <title> <link>
        const items = [...rssText.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>/g)];
        for (const m of items.slice(0,2)) {
          const title = m[1].replace("<![CDATA[","").replace("]]>","").trim();
          const link = m[2].trim();
          await env.DB.prepare("INSERT INTO news (title, source, category, url, published_at) VALUES (?,?,?,?,?)")
           .bind(title, "Google News RSS", k.keyword, link, new Date().toISOString()).run();
        }
      }
      logs.push(`뉴스 크롤링 완료`);
    } catch (e) { logs.push(`뉴스 실패: ${e.message}`); }

    // 3. SCFI 크롤링 - Container-News 공개 페이지
    try {
      const res = await fetch("https://container-news.com/en/scfi/", { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = await res.text();
      // 페이지에서 숫자 추출 시도
      const match = html.match(/SCFI[^\d]*(\d{3,4}\.?\d*)/i);
      const value = match? match[1] : null;
      if (!value) throw new Error("SCFI 값 파싱 실패 - 사이트 구조 변경");
      await env.DB.prepare("INSERT INTO freight_index (type, name, value, source) VALUES (?,?,?,?)").bind("freight", "SCFI", value, "container-news.com Crawler").run();
      logs.push(`SCFI: ${value}`);
    } catch (e) { logs.push(`SCFI 실패: ${e.message} (이 에러는 정상일 수 있음 - 사이트 차단)`); }

    return { success: true, logs, time: new Date().toISOString() };
  }
}
