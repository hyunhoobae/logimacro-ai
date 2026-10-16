export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // /api/oil - 실시간 WTI (【entity-Yahoo Finance¦canonical_name=Yahoo Finance】)
    if (url.pathname === "/api/oil") {
      try {
        const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=2d", {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error("Yahoo response invalid: no result");
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose;
        if (price == null || prev == null) throw new Error("Price data missing");
        const change = ((price - prev) / prev) * 100;
        return Response.json({
          source: "【entity-Yahoo Finance¦canonical_name=Yahoo Finance】 CL=F",
          symbol: "WTI",
          price: Number(price.toFixed(2)),
          changePct: Number(change.toFixed(2)),
          updatedAt: new Date().toISOString()
        }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: true, message: `유가 조회 실패: ${e.message}`, endpoint: "/api/oil" }, { status: 502, headers: corsHeaders });
      }
    }

    // /api/fx - USD/KRW
    if (url.pathname === "/api/fx") {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (!res.ok) throw new Error(`FX API HTTP ${res.status}`);
        const j = await res.json();
        if (j.result!== "success" ||!j.rates?.KRW) throw new Error("FX response invalid");
        return Response.json({
          source: "open.er-api.com",
          base: "USD",
          KRW: j.rates.KRW,
          updatedAt: j.time_last_update_utc
        }, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: true, message: `환율 조회 실패: ${e.message}`, endpoint: "/api/fx" }, { status: 502, headers: corsHeaders });
      }
    }

    // /api/freight - SCFI (공식 무료 API 없음 - 에러 출력)
    if (url.pathname === "/api/freight") {
      return Response.json({ error: true, message: "운임지수 조회 실패: SCFI 공식 무료 API가 없습니다. Shipping API 키 또는 크롤러를 연결해야 합니다.", endpoint: "/api/freight" }, { status: 502, headers: corsHeaders });
    }

    // /api/keywords - D1
    if (url.pathname === "/api/keywords") {
      try {
        if (!env.DB) throw new Error("D1 DB 바인딩 없음");
        const { results } = await env.DB.prepare("SELECT * FROM keywords ORDER BY created_at DESC").all();
        return Response.json(results, { headers: corsHeaders });
      } catch (e) {
        return Response.json({ error: true, message: `D1 조회 실패: ${e.message}` }, { status: 500, headers: corsHeaders });
      }
    }

    return Response.json({ error: true, message: `Unknown endpoint: ${url.pathname}` }, { status: 404, headers: corsHeaders });
  }
}
