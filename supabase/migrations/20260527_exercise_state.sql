-- H5: 행동연습장 진행 상태 영속화 (F114)
--
-- 사용자가 다른 메뉴 갔다 와도 1~4단계 입력 상태가 유지되도록
-- DB에 단일 row로 저장. localStorage는 fallback + 즉시 hydration용.
--
-- 단일 진실 출처: DB (페이지 진입 시 server에서 fetch)

CREATE TABLE IF NOT EXISTS public.exercise_state (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  mode text,                              -- 'anxiety' | 'depress' | null
  anx_plan jsonb,                         -- AnxietyPlanItem[]
  dep_plan jsonb,                         -- DepressPlanItem[]
  anx_saved boolean NOT NULL DEFAULT false,
  dep_saved boolean NOT NULL DEFAULT false,
  anx_selected_idx integer,
  dep_selected_idx integer,
  anx_step4 jsonb,                        -- {did, before, after, learned, unexpected}
  dep_step4 jsonb,                        -- {did, afterMood, learned, unexpected}
  step4_open boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_state_self_all" ON public.exercise_state;
CREATE POLICY "exercise_state_self_all" ON public.exercise_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- touch_updated_at 함수가 없으면 정의 (다른 마이그에서 정의됐을 수 있음)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exercise_state_touch ON public.exercise_state;
CREATE TRIGGER exercise_state_touch
  BEFORE UPDATE ON public.exercise_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
