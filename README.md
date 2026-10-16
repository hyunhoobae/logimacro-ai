
# LogiMacro AI - 물류 거시지표 & 운임지수 & AI 브리핑

## 구조
- frontend/ : 대시보드 (단일 HTML, Cloudflare Pages 배포용)
- worker/ : Cloudflare Workers AI 연동 백엔드
- wrangler.toml : Cloudflare 설정
- schema.sql : D1 DB 스키마

## 배포 (Cloudflare - 월 0원)
1. Cloudflare 계정 생성
2. D1 생성: npx wrangler d1 create logimacro_db
3. wrangler.toml의 database_id 교체
4. 배포: npx wrangler deploy
5. Pages: frontend/index.html을 Cloudflare Pages에 연결

## API 키 (무료)
- ExchangeRate: https://exchangerate.host (키 불필요)
- EIA: https://www.eia.gov/opendata/register.php (무료)
- FRED: https://fred.stlouisfed.org/docs/api/api_key.html (무료)
- News: Google News RSS는 키 불필요

## Workers AI
- 모델: @cf/meta/llama-3.1-8b-instruct (무료 할당량 내)
- 비용: 무료 플랜으로 일 1000회 추론 충분
