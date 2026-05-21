-- ─────────────────────────────────────────────────────────────
-- 관리자 권한 — users.role 에 'admin' 추가.
-- 기존: 'user' | 'coach' → 신규: 'user' | 'coach' | 'admin'
-- ─────────────────────────────────────────────────────────────

-- 기존 CHECK 제약이 있다면 제거 후 재추가 (CHECK 제약명은 자동 생성될 수 있어 컬럼 기준 ALTER로)
DO $$
BEGIN
  -- 이 컬럼은 NOT NULL DEFAULT 'user' 로 이미 존재. role 값 자체는 자유 text.
  -- 만약 향후 CHECK 제약 추가 시: ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','coach','admin'));
  -- 현재는 text 자유 입력이므로 별도 변경 불필요. 본 마이그레이션은 의도 명시용.
  RAISE NOTICE 'users.role 에 admin 값 사용 가능 (CHECK 제약 없음).';
END $$;
