/** Viewer labels only: the original Spine names remain the playback identifiers. */
const animationLabels: Record<string, string> = {
    ASTAND: '전투 대기',
    IDLE: '대기 동작',
    STAND: '대기',
    LOOP: '반복',
    INTRO: '등장',
    OUTRO: '퇴장',
    START: '출격',
    ATTACK: '기본 공격',
    SKILL: '특수기',
    HYPER_SKILL: '궁극기',
    HYPER: '궁극기',
    PASSIVE: '패시브',
    DAMAGE_AIR_UP: '띄워짐',
    DAMAGE_AIR_DOWN: '낙하',
    DAMAGE_LANDING: '착지',
    DAMAGE_STAND: '일어나기',
    DAMAGE_DOWN: '넘어짐',
    DAMAGE_STUN: '기절',
    DAMAGE_DIE: '퇴각',
    DAMAGE_A: '피격 A',
    DAMAGE_B: '피격 B',
    RUN: '이동',
    WALK: '걷기',
    LANDING: '착지',
    BACKDASH: '뒤로 회피',
    DODGE: '회피',
    ESCAPE: '이탈',
    TURN_LEFT: '왼쪽으로 돌기',
    TURN_RIGHT: '오른쪽으로 돌기',
    PHASECHANGE: '페이즈 전환',
    BASE: '기본 동작',
    EMPTY: '빈 동작',
    NOANI: '애니메이션 없음',
    DRAG: '들어 올리기',
    TOUCH: '터치 반응',
    WORKING: '사무',
    MINING: '채굴',
    WIN: '승리',
    RESERCH: '연구',
    OFC_CLAP: '박수',
    OFC_DANCE: '춤',
    OFC_FOOD: '식사',
    OFC_LOOK: '둘러보기',
    OFC_SHAKE: '흔들어 섞기',
    OFC_STIR: '저어 섞기',
    OFC_SIT: '앉기',
    OFC_SIT_START: '앉기',
    OFC_SIT_LOOP: '앉아 있기',
    OFC_SIT_END: '일어서기',
    OFC_SLEEP: '잠자기',
    OFC_SLEEP_START: '잠들기',
    OFC_SLEEP_LOOP: '잠자기',
    OFC_SLEEP_END: '깨어나기',
    OFC_TALK: '대화',
};
const variantLabels: Record<string, string> = {
    START: '시작',
    LOOP: '반복',
    END: '마무리',
    ATK: '공격',
    ATTACK: '공격',
    DEF: '방어',
    ASTAND: '전투 대기',
    STAND: '대기',
    DIE: '퇴각',
    RELOAD: '재장전',
    SKILL: '특수기',
    PASSIVE: '패시브',
    BASE: '기본',
    TURN: '방향 전환',
    BACKUP: '예비',
    OLD: '이전',
    SHORT: '짧게',
    LAST: '마지막',
};
// Longest first keeps DAMAGE_AIR_DOWN and HYPER_SKILL intact.
const animationRoots = Object.keys(animationLabels).sort((a, b) => b.length - a.length);
function variantLabel(token: string, root: string): string {
    const match = /^([A-Z]+)(\d*)$/.exec(token);
    if (!match)
        return token;
    const [, word, number] = match;
    // The client chooses its air-attack/skill states by the target's air-unit flag.
    const label = word === 'AIR'
        ? (['ATTACK', 'SKILL', 'HYPER_SKILL'].includes(root) ? '대공' : '공중')
        : word === 'LAND'
            ? '지상'
            : variantLabels[word] ?? word;
    // Unverified modifiers such as HYPER, PHASE, SUB and LIMIT retain their names.
    return `${label}${number ? ` ${number}` : ''}`;
}
export function getSpineAnimationLabel(name: string, category?: string): string {
    let normalized = name.toUpperCase();
    let prefix = '';
    if (normalized.startsWith('RA_')) {
        prefix = '재무장 · ';
        normalized = normalized.slice(3);
    }
    else if (normalized.startsWith('RB_') || normalized.startsWith('X_')) {
        const separator = normalized.indexOf('_');
        prefix = `${normalized.slice(0, separator)} · `;
        normalized = normalized.slice(separator + 1);
    }
    for (const root of animationRoots) {
        if (!normalized.startsWith(root))
            continue;
        const remainder = normalized.slice(root.length);
        if (remainder && !/^(?:\d|_)/.test(remainder))
            continue;
        // Some source clips spell the number after an underscore (HYPER_SKILL_1).
        const suffix = /^_?(\d+)(.*)$/.exec(remainder);
        const number = suffix?.[1] ?? '';
        const variants = suffix?.[2] ?? remainder;
        if (variants && !variants.startsWith('_'))
            continue;
        const baseLabel = category === 'sd' && root === 'ASTAND'
            ? '기본 대기'
            : root === 'ATTACK' && category === 'sd' && !number
                ? '공격'
                : animationLabels[root];
        const parts = [`${baseLabel}${number ? ` ${number}` : ''}`];
        if (variants) {
            parts.push(...variants.slice(1).split('_').filter(Boolean).map((token) => variantLabel(token, root)));
        }
        return prefix + parts.join(' · ');
    }
    return '기타 동작';
}
export function getSpineSkinLabel(name: string): string {
    if (name === 'MOB_BOSS_EVENT_YAKSHA_SIMURGH')
        return '시무르그';
    return name.toLowerCase() === 'default' ? '기본' : '기타 스킨';
}
