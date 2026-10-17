import CollectionProfileDocument from "@/components/CollectionProfileDocument";
import CollectionProfilePanel from "@/components/CollectionProfilePanel";
import CollectionProfileSummary from "@/components/CollectionProfileSummary";
import type { OperatorListItem } from "@/lib/operators";
import type { OperatorProfile } from "@/lib/operatorProfiles";
export default function OperatorProfilePanel({ operator, profile, }: {
    operator: OperatorListItem;
    profile: OperatorProfile | null;
}) {
    return (<section aria-label={`${operator.name} 프로필`}>
      <CollectionProfilePanel summary={<CollectionProfileSummary kind="operator" name={operator.name} title={operator.title} grade={operator.grade} gradeColor={operator.gradeColor} imagePath={operator.imagePath} voiceActor={profile?.voiceActor ?? ""}/>}>
        <CollectionProfileDocument fullHeight employeeId={profile?.collectionId ? `ID. ${profile.collectionId}` : ""} profileTitle={profile?.profileTitle ?? ""} profileRows={profile?.profileRows ?? []} layout="operator" empty={!profile}/>
      </CollectionProfilePanel>
    </section>);
}
