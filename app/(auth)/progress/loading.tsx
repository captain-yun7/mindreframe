import { LoadingScreen } from "@/components/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      message="성장 기록을 불러오는 중이에요"
      hint="조금만 기다려주세요."
    />
  );
}
