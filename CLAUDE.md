# fake-thoughts — Next.js

## 기술스택
- Next.js / React / TypeScript
- 스타일: Tailwind
- 배포: Vercel
- 기타:

## 아키텍처
- `app/` — App Router 페이지
- `components/` — 공용 컴포넌트
- `lib/` — 유틸리티
- `public/` — 정적 파일

## 주요 규칙
- Server Component 기본, 필요 시 `use client`
- API Routes는 `app/api/` 아래
- 환경변수: `NEXT_PUBLIC_` prefix는 클라이언트 노출

## 프로젝트 문서
- `_docs/overview.md` — 프로젝트 개요
- `_docs/specs/` — 기획서, 요구사항
- `_docs/runbook/` — env, 배포, 아키텍처
- `_docs/worklogs/` — 작업 일지

## 자주 쓰는 커맨드
```bash
npm run dev
npm run build
npm run lint
```
