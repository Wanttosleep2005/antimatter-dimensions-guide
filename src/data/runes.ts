// Rune data — complete definitions from original build
export interface RuneData {
  letter: string;
  name: string;
  fullName: string;
  effects: Record<number, string>;
}

export const RUNES: RuneData[] = [
  {
    letter: 'P', name: '力量', fullName: '力量符文 (Power Rune)',
    effects: { 1: '反物质指数加成', 2: '更多维度提升次数', 3: '反物质总乘数提升', 4: '买十个维度时额外获得免费维度', 5: '反物质生产速率提升', 6: 'IP产量加成', 7: '额外维度乘数' },
  },
  {
    letter: 'I', name: '无限', fullName: '无限符文 (Infinity Rune)',
    effects: { 1: '无限维度指数加成', 2: '无限点数 (IP) 获取提升', 3: '无限力量大幅增强', 4: '无限次数上限提升', 5: 'IP乘数加成', 6: '打破无限升级强化', 7: '复制器效率提升' },
  },
  {
    letter: 'T', name: '时间', fullName: '时间符文 (Time Rune)',
    effects: { 1: '时间维度指数加成', 2: '永恒次数上限提升', 3: '游戏全局速度加速', 4: '永恒点数 (EP) 获取提升', 5: 'EP乘数加成', 6: '时间定理获取加速', 7: '永恒挑战速度提升' },
  },
  {
    letter: 'R', name: '复制', fullName: '复制符文 (Replication Rune)',
    effects: { 1: '复制速度大幅提升', 2: '膨胀时间加成', 3: '复制器指数加成', 4: '符文等级提升（影响所有符文）', 5: '复制器乘数加成', 6: '膨胀时间获取加速', 7: '额外复制星系' },
  },
  {
    letter: 'D', name: '膨胀', fullName: '膨胀符文 (Dilation Rune)',
    effects: { 1: '膨胀时间 (DT) 获取提升', 2: '自动生成时间定理 (TT)', 3: '超光速星系加成', 4: '膨胀中的维度指数加成', 5: 'DT乘数加成', 6: 'TT自动生成速率提升', 7: '膨胀挑战速度提升' },
  },
  {
    letter: 'E', name: '永恒', fullName: '永恒符文 (Eternity Rune)',
    effects: { 1: '永恒点数 (EP) 加成', 2: '永恒次数上限提升', 3: '永恒挑战完成速度', 4: '现实机器 (RM) 产量加成', 5: 'RM乘数加成', 6: '现实碎片 (RS) 产量加成', 7: '全部符文效果增强' },
  },
  {
    letter: 'Y', name: '虚空', fullName: '虚空符文 (Void Rune)',
    effects: { 1: '现实碎片 (RS) 产量加成', 2: '黑洞效率提升', 3: '记忆获取速率提升', 4: '献祭值产量加成', 5: 'RS乘数加成', 6: '黑洞内EP加成', 7: '全部天界层效率提升' },
  },
];

const runeMap = new Map(RUNES.map(r => [r.letter, r]));

export function getRune(letter: string): RuneData | undefined {
  return runeMap.get(letter.toUpperCase());
}

// Braille to effect number mapping (original vx constant)
// Braille dot pattern: dots 1-6 map to effect IDs
const BRAILLE_TO_EFFECT: Record<number, number> = { 3: 1, 2: 2, 5: 3, 6: 4, 1: 5, 4: 6 };

// Decode Braille character(s) to active effect IDs
export function decodeBraille(braille: string): number[] {
  if (!braille) return [];
  const effects = new Set<number>();
  for (const ch of braille) {
    const code = ch.charCodeAt(0);
    if (code >= 0x2800 && code <= 0x28FF) {
      const offset = code - 0x2800;
      for (let d = 0; d < 8; d++) {
        if (offset & (1 << d)) {
          const effectId = BRAILLE_TO_EFFECT[d + 1];
          if (effectId) effects.add(effectId);
        }
      }
    }
  }
  return [...effects].sort((a, b) => a - b);
}

// Parse rune spec: "R⠴(134)" -> {letter, braille, level}
const RUNE_SPEC_RE = /^([A-Z])([⠁-⣿]*)?\((\d+)\)$/;

export function parseRuneSpec(spec: string) {
  const match = spec.match(RUNE_SPEC_RE);
  if (!match) return null;
  const letter = match[1];
  const braille = match[2] || '';
  const level = parseInt(match[3]);
  const rune = getRune(letter);
  if (!rune) return null;
  const activeEffects = decodeBraille(braille);
  return { letter, braille, level, rune, activeEffects };
}

// Rune combo colors
export const RUNE_COLORS: Record<string, string> = {
  P: '#ef4444', I: '#3b82f6', T: '#22c55e', R: '#f59e0b', D: '#06b6d4', E: '#a855f7', Y: '#ec4899',
  C: '#94a3b8',
};
