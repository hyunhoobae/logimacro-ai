
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API: TOP3 분석 + AI 코멘트 생성
    if (url.pathname === "/api/ai-comment") {
      const body = await request.json();
      const { topMovers } = body; // [{name, change, value}]

      const prompt = `
너는 20년 경력의 물류 전문 애널리스트다.
다음은 오늘 가장 많이 움직인 지표 TOP3다:
${JSON.stringify(topMovers, null, 2)}

각 지표에 대해 물류 관점에서 2문장 코멘트를 작성해라.
- 해운/항공/육상 중 어디에 영향이 있는지
- 실무자가 당장 취해야 할 액션을 포함
- 톤은 간결한 보고서형, 한국어로
- JSON 배열로 반환: [{"indicator":"SCFI","comment":"...","severity":"위험|주의|양호"}]
`;

      const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 800
      });

      return Response.json(aiRes, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // API: 뉴스 크롤링 (관리자 키워드 기반)
    if (url.pathname === "/api/crawl") {
      const keywords = await env.DB.prepare("SELECT keyword, category FROM keywords WHERE active=1").all();
      // 실제 구현에서는 Google News RSS 파싱
      // 여기서는 구조만 제공
      return Response.json({ count: keywords.results?.length || 0, keywords: keywords.results });
    }

    return new Response("LogiMacro Worker Running", { status: 200 });
  },

  // 매시간 크롤링
  async scheduled(event, env, ctx) {
    ctx.waitUntil(crawlAndSave(env));
  }
};

async function crawlAndSave(env) {
  const keywords = await env.DB.prepare("SELECT * FROM keywords WHERE active=1").all();
  for (const k of keywords.results || []) {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(k.keyword)}&hl=ko&gl=KR&ceid=KR:ko`;
    // fetch + parse + insert to news table
    // 생략 - 실제 배포시 xml2js 파싱 추가
  }
}
