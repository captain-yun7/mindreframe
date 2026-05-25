import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * PostgREST `.or()` filter에 사용자 입력을 끼울 때 syntax 깨짐 방지용 sanitize.
 * `,` `(` `)` `*` 같은 문자는 PostgREST가 구분자로 해석하므로 제거.
 * `%`는 ilike wildcard라 의도 외 매칭을 막기 위해 제거. 공백·한글·영문/숫자는 그대로 유지.
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()*%]/g, "").trim()
}
