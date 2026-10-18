import GroupedVoiceList from "@/components/GroupedVoiceList";
import type { CharacterBattleVoiceGroup } from "@/lib/characterBattleVoices";
export default function BattleVoiceList({ groups, }: {
    groups: CharacterBattleVoiceGroup[];
}) {
    return <GroupedVoiceList groups={groups} title="전투 대사" kind="battle"/>;
}
