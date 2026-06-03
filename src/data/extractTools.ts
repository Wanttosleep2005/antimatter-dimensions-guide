import type { Chapter } from '../types';

export type StudyTreeType = 'initial' | 'reset' | 'purchase' | 'standard' | 'standardLike' | 'ec';

export interface StudyTreeHit {
  id: string;
  chapterId: number;
  chapterTitle: string;
  label: string;
  tree: string;
  context: string;
  treeType: StudyTreeType;
  ttCount?: number;
  ecRef?: string;
}

export interface AchievementHit {
  id: string;
  achievement: string;
  chapterId: number;
  chapterTitle: string;
  context: string;
}

const STUDY_TREE_RE = /(?:\d{2,3}\s*,\s*){2,}\d{2,3}\s*(?:\|\s*\d{1,2})?/g;

// Context keywords
const TREE_KEYWORDS_RE = /研究树|TT|TS|EC\d+|时间研究|标准树|挂机|活跃|购买TS|购买研究|重置/;
const RESET_KEYWORDS_RE = /重置了时间研究之后|重置研究树至|重置到|重置为/;
const PURCHASE_KEYWORDS_RE = /购买TS|购买研究.*\d+TT/;
const STANDARD_KEYWORDS_RE = /标准树|活跃路径|挂机路径/;
const ACHIEVEMENT_CHAIN_RE = /r(\d{2})((?:\/\d{2})+)/g;
const ACHIEVEMENT_RE = /\br\d{2,3}\b/g;

function normalizeSpace(text: string) {
  return text.replace(/---\s*Page\s+\d+\s*---/gi, ' ').replace(/\s+/g, ' ').trim();
}

function excerpt(content: string, index: number, length: number) {
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + length + 90);
  return normalizeSpace(content.slice(start, end));
}

function compactTree(tree: string) {
  return tree.replace(/\s+/g, '').replace(/，/g, ',');
}

function classifyTree(context: string): { type: StudyTreeType; label: string } {
  if (context.includes('标准树')) {
    return /31.*除外|除外.*31/.test(context)
      ? { type: 'standardLike', label: '类标准树' }
      : { type: 'standard', label: '标准树' };
  }
  if (context.includes('EC') && /EC\d+×\d+/.test(context)) {
    return { type: 'ec', label: 'EC挑战树' };
  }
  if (RESET_KEYWORDS_RE.test(context)) {
    return { type: 'reset', label: '重置后' };
  }
  if (PURCHASE_KEYWORDS_RE.test(context)) {
    return { type: 'purchase', label: '购买后' };
  }
  return { type: 'initial', label: '初始树' };
}

function inferTreeLabel(context: string, chapterId: number) {
  const ec = context.match(/EC\d+(?:×\d+)?/i)?.[0];
  const tt = context.match(/\d{2,5}\s*TT/i)?.[0]?.replace(/\s+/g, '');
  const cls = classifyTree(context);
  return [cls.label, ec, tt].filter(Boolean).join(' · ') || `第 ${chapterId} 章研究树`;
}

export function extractStudyTrees(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: StudyTreeHit[] = [];

  chapters.forEach((chapter) => {
    for (const match of chapter.content.matchAll(STUDY_TREE_RE)) {
      const raw = match[0];
      const tree = compactTree(raw);
      if (tree.split(',').length < 3) continue;

      const key = `${chapter.id}:${tree}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const index = match.index ?? 0;
      const context = excerpt(chapter.content, index, raw.length);

      // Skip matches that look like purchase orders, not study trees
      if (!TREE_KEYWORDS_RE.test(context)) continue;

      const cls = classifyTree(context);
      const ttMatch = context.match(/(\d+)\s*TT/i);

      hits.push({
        id: key,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        label: inferTreeLabel(context, chapter.id),
        tree,
        context,
        treeType: cls.type,
        ttCount: ttMatch ? parseInt(ttMatch[1]) : undefined,
        ecRef: context.match(/EC\d+(?:×\d+)?/i)?.[0],
      });
    }
  });

  return hits;
}

function expandAchievementChains(content: string) {
  return content.replace(ACHIEVEMENT_CHAIN_RE, (_, base: string, suffixes: string) => {
    const rest = suffixes.split('/').filter(Boolean).map((part: string) => `r${part}`);
    return [`r${base}`, ...rest].join(' ');
  });
}

export function extractAchievements(chapters: Chapter[]) {
  const seen = new Set<string>();
  const hits: AchievementHit[] = [];

  chapters.forEach((chapter) => {
    const content = expandAchievementChains(chapter.content);
    for (const match of content.matchAll(ACHIEVEMENT_RE)) {
      const achievement = match[0];
      const index = match.index ?? 0;
      const key = `${achievement}:${chapter.id}:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      hits.push({
        id: key,
        achievement,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        context: excerpt(content, index, achievement.length),
      });
    }
  });

  return hits;
}

// ── Automator scripts ──
export interface AutomatorHit {
  id: string;
  chapterId: number;
  chapterTitle: string;
  label: string;
  description: string;
  data?: string;
}

const AUTOMATOR_RAW = `初期自动化
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

30次现实到1e9rm
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

e9-e60RM
AntimatterDimensionsAutomatorDataFormatAABeJy1V21v4jgQ0cp5fMbvSSV2RijgvQNFSiRa6y6m0aEVBt78tJvmDAeyGJYqcv2u50cv7GTUBLgtFUXS21ie16eeTyeDJZlEe0bGR98psDOQMbCWtTWclmc3m1ATgAfHwFU0cjZcpE4LHEUyDlCcSnC60arD8aQAPJHxhcfLVNVJuMC8XJ2FCKN0bxJVrSF1u7CJQtdiFP19BpK8k7ykMvnwrxQZjLBujBhNLyiQoKpZAk0bfL0bYfwn5YvGslKdJzEOWCqASWDSHeLFx9BcTGkl0c8OfddDYe3symXa3CJIJWbj72MxmfJlS7G8QQxRL0a7KNWnAwvb8eoN0bjPRrc3uXJ0c0cj1DCEEcCUkjREvRqdZpMsnSSAUi0bVojEvAcZ5AUHIBcpXG2XOGTwZKuGfAFRIzN2VwbljmJuHjxlQAXwKOCYfFIE0ciHBv8qzF0cC52QFUxpAFiFxpXAuqmAbBs3USZRoXJEv8GjB9QJhbQ0beYMWXKyaksRFEkAkLDCGzOWcCkiwNVlQwIOS0aZZsqKJMQYvJ5iC8eOSUdUrMcLxbGI0bUScUoagpRwDp2OVwOkpOpODQybBcRCYtdJyCQmjIDP4MEPA0bAAIqSfr6lESzu4Xoj1ARWr6DyBSxpegpnCo2XF2XkPPNwvge1oK9Q0cNc5NcJ0bhTVxbQ6xG6IjDqHd5tIlrlm726dm2a9qObdq20buvgu1sGssWzgrIDRIF0bjakkuwgjwQDI0cxG898hNcuaYCvIrlCwKY0azOOQ0bp4nKPx0c0aulOk8bzc85DGiA9srHODccbQBmsptH0crSgW1Za7E0cxje5dGsu3VrS2sKopA5LkHPCXKyfv5je0bVlV8xvL7CH0ba0ah1Un94WwL0coln7OGad32S2cq0cd42D1jmO2dRyz7WMw2zkO1rMjmNUFSF1ep1ovHKJqxQv5Xfckodi5HKwU7bJSbIr3C3nbVXp0cjSpqoNgtOO0bst7Vqm0ctxda19n6vdGB5X2MDhh0bgcrB8G0aoOlslJk8Z0bqkZUT0b2lsPgDY3uCsGKq7829H18PJFC6G17ffjJ2BImWzil2lXfZTTGaJ6OrtfOWaPbAQrmi6hh4MJjigCQP1olvDcb6lCj0cp4KwHk9HI91EGnyNfyeimdXv0aYKbMNMBvjpqT5qxuyG7nhpQlZUi9aBkW8gCmK5rOS0aCT0bBk0cJldhJlZoz2nAcLFgAbajjAYrOLnTX2Q2112xTSbjT60bBfWPY0bKGkBkRc7KYd1Vu7Fv4j3rbuAgnfUtd0a0bZgXZBOPr0aZlz244xR5ShTxsNnO0b3RPV1avsyd182sP0csIfB0aJQvi70auEAx40cGSC3cuXEDK0bqRZ6mmADjeB70cWDF8cTWLJImeD24yLDRtUxo9aAfhjDga2FCGyfjvw8d8nCQH0cJwUjvkrQMc6hN8QYzEabWVMC74xYLXPnDsw9kst7wRdjzUPmkMuMArky7Vr6iSY6eeM7MZ5tUe2T1pgQ5GWw6qWeJWs0aSZwJ9Bl7nNbayzWW7i0cv60bwOQWx1UKDXRANUz0cAXYkRMgEndOfAutomatorData

Cel4
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

Cel5
AntimatterDimensionsAutomatorDataFormatAABeJyVV9ty2zYQfddXbN0bcMV0aRvIiypsqMYskJZ0bxaQymt89IZmIIktLyoBOnEk0bTfuwB41cW16JEJAmd3zy52l6BpmoT8zpO0cKdywyL0a0ay8siy8CfTEe2aRm2SfBn480cBP0cO6328JwLP9q9Xr92GepZuMCcHTBBZhxnc5uCOJYSLnNAIX8hTyLQOWrCBdq0bGGxqwnhT0cnPOL5SykoJLQQbATz0bS0aVuUQsdimPWCaA5pUGocAj0bMKEVNLr0aQLlWM6yROpK12s9w5M1VzOEeS58gy3fbJFUT0bTFijMBuyILt1QwIORqYBk0ayXlMc1RjEJwhQ7KnRirucfQgzdGvMI13EcvRbQG0cwcCE7z0aAkdMMeYbExIeKUQ0cHtVieI9oj3lDhpcRbyRxHX1sGubYNi0bDPcg3LthXwK0bV5Y0cG9sqgW6jDhnu1YiHM0cK347ZEZep4WkWEWotOug3SHadZRckURp0bA0bseERlaE7qqvA6YB34jhYSY5qx6DBuUz29AyfN0cSC0c7Ks7jbXOwNpnYJ0azsO4Z2MEZWO8M7PAM7PUZWHLOZpDD3fjZ0b6lLscnZcwrpSBntp0cJhIldCSaqK6zCbTwFUR0b0adyfVuptfuoWvtlf0bx0b7rVUhE2yj3resFRFppG9XWLzRYD0bh7M7zVBR0ahK1SV78vzBv5sFC0cgwu3v4s3fkQtBsvaYZ38DH6GW3FTACMg7uvxlgjdWMAfb4I74GsMEztjLAGU0cCLWfPLGZJboA7hg8Fdm7TgMEYJlEEUx4LAzx8uP9LGVBqYMHyYifUOwkW0asWRXPvwCW62NNswmTcwhtkSL0cgBs7HtPD420arc0ai0atEgJdCYFAVAv2rlksdgT8vdbiedjK4Lwkoq4rEjGbRCzwTLVHqJLbj7SOsEqF1EtQJF1MuQsX7XYkmcPc8rBkgAYmeCJg8pc0bshSFmhfER0a50chvw6yV2O7fJXs1XXtYdB4CH1w3MEpUsS8Iq4mpU29SWhwWVpCmXlNyoWAUX0aO0aLt54SeCr1hn7V2XsltvW2tTTpgdXHndAL6KHirHqlCiQ20bSalzz0cdcZWVBf0b0al1BG230aUuVUIcgpw3CiPg0b0ag7kQN8DvyPUxF0aXyQr86oyzn81jbDMG4OECLPnDsWVh6eLdxjuRY5x38O7gnGOXRTHGoZ7S4nD1Hh7w5JfJdTWQkHr5uPZKs7SCmhXrT5NgCn0cIw6ByG0bNuwSrFQyYawIdh68Fy1IPyJWD0cFpzFsE4zoGXtj0bFmtpTQm0creDG6CanCjDrmpyK9W8kSbqPbZqhfVELeFfMOUiptylbvVhy9yUHbFye1yFgDDzm5imEQT7W7H6rQtJDJ7xAsuVD6gZ0b67wxZ2zKi6T9H4QTvrpJ9ELf35sZZWMe1Kye6iw6rLtuX3WOpC0akrnUqGW0bHXAMhrm4DU6tEVpwfMuYUHxTL0cmIatXfb26VCe9JcviOvJ61VfRbF4ZQLyqyGUBHm94b0bPLPOsYo0bl0aetKm5lvZHNSGKH6xTO0chEqYzfJ0bt16MDBLT1SxbT0ao7NbFjwZFNE0bBrN5RseUb5fem6z68NVlNWrQ2ZZe8vaQrlq76vGqCm7ygP0cHj7vNhnFfNd88YCN9cOSEJH40ceVHUSHUqVtHT9fAMqOJCLlEKVCCtRbrLStjrHcgTKOIhWpewfJMKYM26pY0bZTykNWiFwRKd0cZIoPBGwRMpihixe4pjlWSueVRyn8nSD2cOxeEMI6Iq3K1g1a2xC2Huw7WBHcokxIIZnGUP1dTv7hnK41fJLdhbxuFP0cdUSPZGmT6bKHKCbziCY0ag3mhEquDQxQWrEqvJ5FGRc5gkiRFpLKsXXhlWTzECd0chF5xcfnjCRML6KvWNYfof5v5nOAEndOfAutomatorData

e10RM刷快速现实 + r154
AntimatterDimensionsAutomatorDataFormatAABeJy1lVFv2jAQx90czKa592lRXjQ1UpQ0bTaKErkygVpNrbJJMY4jWxs8QpQ0bu0b0b842gdJ2W7duPACxz3e0c0b90bdE4YhbV9J9ZnDRPDsglcm3H5ot8OOjmB3H0b5aAS7eGJlJs4JpXMrCnEIvTqW4E7lQBia0a0a4b9IfAcqkKIZB0b4StBBkcmYG3knYMILmdjjkxvgBgQNJ6ODwPqNUq5uKzAalqlGhyXkPBFgUgGDc8qgcvFAK7d0agY517g5OBufj0aWhw1e9Fw0cHV9NStiS0b1LEUC77NVkVancG0a0cfifWOcImzSZMDTdo0aet0cggP80ckq7qMABvInKlaVZCAOVzgUspUmhL0cOZ1iiGTeysXtEQ5BxWuoaYq7eO53L8EaKxwxggRQELx0aCg4HUl4OySQCkqw0avjpEUx3LFe0c8PNNMI8Ip0cC0aLt14U0ad38JMzHUpIJrSE2o1UG5focwWU6q5VFZYXYIwonT0cc65qnmUrqBVWDaQBWcFM14vUEMttUnxOeVEIVTW7iObS1jDnZY7PBr2tc3BZl8JYZezRjOOehbX9gVa92uicG0aRw8vijvgS0bIfyxugAOmTY2b5f7EGklzzbgAWacSFGB0akuOXEVdxilH8Sg9PGbEyFwQSinhsW0aqQjv0aEEUJOIbfJq0cnc70bylQZXmodgE8sRYCnB6mq5E20a7LvxLCG0bLDSbVAobX8A6o6HTCcBu58fsyh0cc0a3HsAu2bNJc5BKQRgT7j50bEOvhHZbhNE2YeyEsFb7nrK9Z1x0aKRoxNELDFv6iH8ZY4DuZVcGTgr0akereJTg89wTqAI2G0cosHNkJKNkE8xrDyjRprNQasPwRnINI5RIrFrJV4jttQzlBIHBIfqX0bj3KMIrXZKfqI0b0caMeOyWM9CMcpx0cGzM0bmlaVVOkam7bPprLNKMiEXTNV6p86aDrNmL6J8J0bTij3dJ2HpZ3t16e7rc90cLqQrj47olxIhTdOpnVRbRTw12QzvKJww9vG1wF8C2B7OwH8Z1CADer3jVjreygo0cUvjB2mSZ0akEndOfAutomatorData

e14RM 完成 Cel1
AntimatterDimensionsAutomatorDataFormatAABeJzNWG1v2kgQ0cu5fMc2n9s4RXtu8JGoq0aeIS7gggY1TlU0bWYJezV2JZ3SRpdcr0c9Zr3YvNhw0aKbSIQFmX0baZnWdmdgbDMIgxYNFfPnyiUTHUyzIanus4X3ud0clfvkpDzhqkLtqA6IURn0axAf6uSctIhOLkzdNHAwmrGIiSccILpJcNC0addPCbyIXWfiNb7OObxyz5G0bcN1u0cZTidXn8XxQ8Ee1A4Ur4f4YwvBE2lxHO1W6LkUlsKDSXnqijRN0b3e4IDsQt1CTTtTtXSu4jwZqkSzM0bS1YoZttsxaDdbWhAdLw4GJYCGKgHGQskRcyinKBfNDIOBSP5t7S7gAqSDEUfj0aTpP7xknMQppy8AXQaHoJt5RnE0b3OH5Oxd0bMMvPGl0cN1h3L8LKfhLEQNFVaTGMF2mLLoHz4OZny7AT6nPgXHgYhl8k9uGUUDhKV5CEC0bSEPcppe9juPODb4CyxJwCvZBPtGFAksb3KeWcxRHw7CxSG0a3bhm1wNZBbDgi1DPgOc3Y0cx2NrCD9llEMUP0cpMQLJMg7nPKez1sibRCuEIn9BAK4QctTvDEbFAgwsBH4A0a6zs6x7NZGYPNgAbN3Dh4aA7vwYK0cNQ1gD0c46CnZ0aeCZvcJc6MFIpedmU0b0bEK6jifq3AAofKEz0bYrSd0bvv3UqAlqvMPl7MOsmGg7gtHNlG0areVQxueJi96WFywQ7nV1KDCnGSeDm6Sz7Ayw0bZqf5LaW69kvSNZFrCaP4XhrWJ8ZKFyQbRttHKiD6R5gqSSwxaplkpuFUIKBxC0aVqSgMqVsNTSXf5ftLJAlRAudhJC0cWBCqLw0an0b1fEa6blxpiNH4uYOsYUacGbOtAwJa4QIA9kVfN0aKF4rI6WizclvyC0avp0aojjZQlYf9QIC1VgHGhZ8Keb2cokMp2Fq2lZEUxYLNnuAMr0crPbfcGbtq38NGB0cnDQ1WHUnowdaE0b8ITie4w563i30aPsPAcTpO50bxE1y2FDzErYxU1k0bqWiTwJrHQlL9GuIZqNGCVD7cs6WKTpWLbZpl4neoPso0aYnOIdeo6tD5vwQ46cIsuumsaXYbtGzrrL3JME5VoCVEo0bUuV62fbNVhdhRAsuZcs0aKOZqVg0aGSleGyxrdW1TbW9xaWUKfVUCUymoSocDnCzlfr1f8jQ70bOe60c7HNXGIH9hjPX0blIW0bNOWBsDOPJ7iiz1oTmzdv9qp5a66aN0cuZnFbKVhkl7yg1FcTFsRJ0cKVXjR3QTRedYUQaUCVWCMRFqeSL0b3Bu0a0bzCajK97gy7m4eFIlzn3djiBruPB2Jt80bjP7JbMwpmoPEzN0a0b7ej60cGZpnyRYKOiIh29eCr9l9BWHvpVl0bZ0bO6jZLVvIIaV20azAW0cFANjPA5EzRBpfBjW4m9l0cPaijmYzSVjq5fscEfDXt9xx2iC0cvCLVn7hmuvhF0cCGWZ0cbw3YZvWGB6oDruvA7eLI3zc6my2Y1Avo9oSleJpGARybmMAK5rYYLa0bACNsDY76aAdGKgd8OnZJ63yfIuXbXKEkrNhfSBhvCPbRhaMcgv8WAZ0bKjWq7k1T864cIW6JSELZADCzTLEz1H8SFNctzExTiid4tDbjgc8e8aG3Ie7OFryd1KQh4I80bTdAhy0agWQno0bjiQbZVLRrhkcxaf70bKYC3z8uMQb2VCmuoJe7rabq4tBNRDE0aQNNZUv0cL0c4ZgMwEndOfAutomatorData

e24RM 刷复兴点数
AntimatterDimensionsAutomatorDataFormatAABeJx1UcFuEzEQve9XPG6tcNS1k6AqAiTaXVoOSVabRahHs0cE2Qx3b2F7aCvh37FVVtQdGGllvZt6bN3JZllxsyPyQaJrPMsTyRSzn4uwML7v4NS9S6WskTfERu96Tiys0ayt0bhsWQiBumPZG4xWA0bXy0bFgHRIYMt0arORFz91LpZZHV2vpyu17Xm0bpT92W72a1yTYlFu8aVfnSHsELVpsjlCh0cQdbhSZiIm1CqnqZcmUjJwrzzeYueU2qf3pOoengAFfLdmDKfTwrz5WbuuurbB7CNu6qptpv719hu67eSj0cjmSw0b0a0ayzAaJ8egcHHN0aikhSh0bTgemkTCwKGhBtlBq9PTqtIlkT8B4cvwsgxHFPKsCNvj0cIJMP57J1g2ftRxqg845wz2mvF0bJLP0bDn0cw8s3iahSz0bQdf4v0caCQF9Zot0bIKRGSjzmBAi5SLlMuU5E0cOE54tiNNr2d9iTltnqs7qx95LiqyV50cOn30cgEnXKtqEndOfAutomatorData

e24RM 筛选符文
AntimatterDimensionsAutomatorDataFormatAABeJy9V0btv2kgQ0c85fMVSqlCpO8fqREFQakcQ0anPISuGrz5aQNrMO2xrbsJQ81d30c7zaxtYsBwVyk5Cz9Y70czmNw0cP7pimyaxLGf3g8CWUQfBkFofF0cOGgd9qxTcuwTYanjadj2oeHVqsFVRG4tz0byBg50bVTKU6glG41QmqoOvn5IpBDydyegOeKBECicitOBBqil4QSDGCifHqWiQ0bCiJZSjSDLgCEU0agDiArkG5EpqccHX0a760ckwGIHX73snPoxOrobe0aVGHXg4UyAzUVMCQp8Rjt9CRERQv6PDJRExAxXcCZ6b4ADP0bU0bBrFSseokak85HgChCEvOUZisRRgZDqFwZw5FgYoaUyeIrnEAkND1kixjJ40alA0bclJTnDGNwwkEcVpgIENRMBzAPBOkjDlmLhPDPJqgOxTpIau0aEggkDsE4nkdKj5YA0bBzpgVTMuCRJmM1x5q3IR7VCjew98lkSChgJNU86pBCVke2kiLman0bDjaQFdFWEdcAqfdpm7W0c660b6ZBOHv7JnShbb4vnYdIt0aJR3MktYlLFsjpgr2J1HdcAPAjLcRHr0aN2MRWDNZu0c0aj68j0c8K79EfNps6Dm0aoU0bOQHOQEDky4lHPRlSFCL0aOoZSRrfYZQyGUcEdCbvKEWqcpicYRg0caB0chXZSR1GQubmDk0bf7g8ssIekMPMFP9Mw0bOr3z0c6gKu0bvrf6GQ4uPabJNBo8DlyFEgkIgudLB0bQUSD1ABMHLjzClHhkqrGYiDwwuxqZmk8kUkrm6XiKhgBje0cuWoeRMGIwxQ0a5CfHDZHmuzFeQ4CBoPXKoi65WCz9BuuyuEaNaq0aoYMQIyZiSlIYVToqww0bgQu0cGgAbGPEIOXGK3RqvZ2Y2UXCZnZvhkKaXYCGg4lFV9rkLLr4via1JE0bu0cNM0bFcZ0cggDmWprhsoZ1tZr3uR4s5RqnGsCzHsGwL73S6eLbxv1MyrziWdK9pJpYvRpTeLXgnyJht82htjA12aBvE8YXKPArj8U0bYyJCT80bo11ulYszs30a6mYamkdS2ESCZrLhIMLiDYkyL0byvHKhSZg2ZFQqOC0aUpLsuvXLXLefXvrnNHYugEG0a0bVvK0bkmDN30aumf0cP4Crz1OvArn8iKEvuVbVj6Ap3XAd8WA0cftVez0cH3E4eMs4tN82UQ0cf3EG60blC1sItqYefVwmZ42s0cstb0cEhONSfb0bpRB2UJWqRNs0cs9z7WLaWxYva24rgoZlnCx3ojhoVwpjUVpXC10ctVb0cZ0brcZ24hQuDzdCaLWysTeUV9TDbQuHyVRTn0cquwI8WbXusugvzIU0cWyDCWcdrvMNGfZYgUoBq2sduWw11aOWkinDtKuh3TWIAtaSKEcXBzUn1xfDc694QiOvfOrb42ag3a3AfY78i5vFTLA7XUXhhePBljdfMwAG50c4DPffCW5SDXC6vfFUinsxE5EywO3C8Ry3frij3u9CLwzhVM4yAw7wz8WfWsdQYNbibGpkcj1630bsN8YBn8HDfbNnfoUXX7zmt0cuDc94bwrto2vVvsVjt6jm7NcIuCdxt20bvF4ni2bk0cdtBK2bkA8kdN0aatIYtv3UKeSdhUAexctnBjmAXex37b6fsyLSs9yJDF4um20cRUnuXwTq70bHJ0aUwh0a9r8ov1C3LFyM7I2qieDrJhXVL0bqG0a2S5sdjsb7Fm77GDivkd7tlqTc68BwLHSIVbVIYTR61OUiMzC80bf37Rp0at0b78By3DtLUEndOfAutomatorData`;

export function extractAutomatorScripts(_chapters: Chapter[]): AutomatorHit[] {
  const hits: AutomatorHit[] = [];
  const blocks = AUTOMATOR_RAW.split(/\n\n+/).filter(B => B.trim());

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const label = lines.shift()?.trim() || '自动机脚本';
    const data = lines.join('').trim();
    if (!data || data.length < 20) continue;

    hits.push({
      id: `auto-${hits.length + 1}`,
      chapterId: 20,
      chapterTitle: '二十、天界层（终局）',
      label,
      description: label.includes('自动化') ? '从零开始，逐步解锁自动机功能' :
                   label.includes('30次') ? '30次现实到1e9RM阶段' :
                   label.includes('e9') ? 'e9RM到e60RM主脚本' :
                   label.includes('Cel4') ? 'Cel4阶段专用脚本' :
                   label.includes('Cel5') ? 'Cel5阶段专用脚本' :
                   label.includes('r154') ? '刷快速现实并完成成就r154' :
                   label.includes('Cel1') ? 'e14RM完成Cel1辅助脚本' :
                   label.includes('复兴') ? 'e24RM阶段刷复兴点数' :
                   label.includes('符文') ? 'e24RM阶段筛选符文' :
                   label,
      data,
    });
  }

  return hits;
}
