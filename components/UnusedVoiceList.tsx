import GroupedVoiceList from "@/components/GroupedVoiceList";
import type { VoiceGroup } from "@/lib/voiceGroups";
export default function UnusedVoiceList({ groups }: {
    groups: VoiceGroup[];
}) {
    return (<GroupedVoiceList groups={groups} title="미사용 대사" description="원본 클라이언트에서 재생 연결이 확인되지 않은 음성입니다." kind="unused"/>);
}
