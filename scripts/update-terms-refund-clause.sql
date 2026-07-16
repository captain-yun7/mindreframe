-- 약관 제7조 환불규정 문구 수정 (2026-07-16 고객 요청)
-- "전액 환불 가능합니다" → "환불 불가합니다"
-- Supabase SQL Editor에서 실행. terms_html row가 없으면(코드 fallback 사용 중) 실행 불필요.

-- 1) 현재 상태 확인: has_old = true 면 아래 UPDATE 실행 대상
select
  key,
  value like '%결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 전액 환불 가능합니다.%' as has_old,
  value like '%환불 불가합니다%' as already_updated
from site_settings
where key = 'terms_html';

-- 2) 문구 교체
update site_settings
set value = replace(
  value,
  '결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 전액 환불 가능합니다.',
  '결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 환불 불가합니다.'
)
where key = 'terms_html'
  and value like '%결제 후 7일 이내, 콘텐츠 미사용 상태일 경우 전액 환불 가능합니다.%';

-- 3) 확인: already_updated = true 여야 함
select value like '%환불 불가합니다%' as already_updated
from site_settings
where key = 'terms_html';
