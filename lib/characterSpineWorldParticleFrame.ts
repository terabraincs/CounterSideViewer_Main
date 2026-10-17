import type { CharacterSpineEffectPrefabCatalog } from './characterSpineEffectPrefab';
import { characterEffectSpriteFrame } from './characterSpineEffectPose';
import type { CharacterEffectMeshAssets, CharacterEffectFrame } from './characterSpineEffectMesh';
import type { CharacterSpineWorldParticlePlayback } from './characterSpineWorldParticlePlayback';
/** Source-only combined END draw commands using the verified viewer camera basis. */
export function characterSpineWorldParticleFrame(catalog: CharacterSpineEffectPrefabCatalog & CharacterEffectMeshAssets, playback: CharacterSpineWorldParticlePlayback, time: number, worldToCamera: number[]): CharacterEffectFrame {
    if (!catalog.particleControlOnly && catalog.worldParticleContracts?.[playback.prefab.source.rootPath]?.branch !== 'fresh-base-world-v1')
        throw new Error('World particle scene requires an audited original prefab contract');
    const pose = playback.snapshot();
    const source = { ...catalog, nodes: playback.prefab.source.nodes };
    const frame = characterEffectSpriteFrame(source, pose, time);
    const renderers = catalog.otherComponents.filter(row => row.type === 'ParticleSystemRenderer');
    const rendererIds = new Set([...renderers.map(row => row.id), ...catalog.nodes.flatMap(row => row.renderers?.map(renderer => renderer.id) ?? [])]);
    const nodesByPath = new Map(catalog.nodes.map(row => [row.path, row]));
    const rendererOrder = source.nodes.flatMap(row => nodesByPath.get(row.path)!.componentIds).filter(id => rendererIds.has(id));
    for (const state of playback.particleStates(worldToCamera)) {
        const mesh = state.mesh, node = pose.nodes[state.path];
        if (!mesh?.positions.length || !node.activeInHierarchy)
            continue;
        const component = renderers.find(row => row.nodePath === state.path);
        if (!component)
            throw new Error('Missing original particle renderer');
        if (!component.fields.m_Enabled)
            continue;
        for (let parent: string | null = state.path; parent; parent = pose.nodes[parent].parentPath)
            if (catalog.otherComponents.some(row => row.type === 'SortingGroup' && row.nodePath === parent && row.fields.m_Enabled))
                throw new Error('Particle SortingGroup integration requires original verification');
        const refs = component.references.filter(row => row.field === 'm_Materials[0]');
        if (refs.length !== 1 || !refs[0].resolved || !Array.isArray(component.fields.m_Materials) || component.fields.m_Materials.length !== 1)
            throw new Error('Unverified particle material binding');
        const materialId = `${refs[0].cab.toLowerCase()}:${refs[0].pathId}`;
        const material = catalog.materials[materialId], texture = material?.textureBindings?._MainTex?.texture;
        if (!texture || material.shader !== 'NKC/NKC_PTC_PMA')
            throw new Error('Missing original particle texture/shader');
        const positions = mesh.positions.map(p => [p.x, p.y, p.z]);
        const minimumZ = Math.min(...positions.map(p => p[2])), maximumZ = Math.max(...positions.map(p => p[2]));
        const centerZ = Math.fround(Math.fround(minimumZ + maximumZ) * .5);
        const streamColor = (p: typeof mesh.colors[number]) => [p.r, p.g, p.b, p.a].map(value => Math.fround(value / 255));
        frame.draws.push({ path: state.path, geometry: '', material: materialId,
            particleGeometry: { name: state.path, positions, colors: mesh.colors.map(streamColor),
                uv: mesh.uv0.map(p => [p.x, p.y]), uv1: mesh.uv0.map(p => [p.z, p.w]), indices: mesh.triangles, texture },
            objectToWorld: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], color: [1, 1, 1, 1], flip: [1, 1],
            sortingLayerId: Number(component.fields.m_SortingLayerID), sortingOrder: Number(component.fields.m_SortingOrder),
            sortingFudge: Number(component.fields.m_SortingFudge), boundsCenter: [0, 0, centerZ],
            sourceRendererOrder: rendererOrder.indexOf(component.id),
        });
    }
    return { ...frame, sortWorldToCamera: worldToCamera };
}
