import { calculateRelation, getShen, getWuxingRelation } from 'cantian-tymext';
import { toZonedTime } from 'date-fns-tz';
import {
  ChildLimit,
  DefaultEightCharProvider,
  EightChar,
  Gender,
  HeavenStem,
  LunarHour,
  LunarSect2EightCharProvider,
  SixtyCycle,
  SixtyCycleYear,
  SolarTime,
} from 'tyme4ts';

// 桃花位查找表（以日支查）
const TAOHUA_MAP: Record<string, string> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
};

const eightCharProvider1 = new DefaultEightCharProvider();
const eightCharProvider2 = new LunarSect2EightCharProvider();

export const buildHideHeavenObject = (heavenStem: HeavenStem | null | undefined, me: HeavenStem) => {
  if (!heavenStem) {
    return undefined;
  }
  return {
    天干: heavenStem.toString(),
    十神: me.getTenStar(heavenStem).toString(),
  };
};

/**
 * @param sixtyCycle 干支。
 * @param me 日主，如果sixtyCycle是日柱的话不传值。
 */
export const buildSixtyCycleObject = (sixtyCycle: SixtyCycle, me?: HeavenStem) => {
  const heavenStem = sixtyCycle.getHeavenStem();
  const earthBranch = sixtyCycle.getEarthBranch();
  if (!me) {
    me = heavenStem;
  }
  return {
    天干: {
      天干: heavenStem.toString(),
      五行: heavenStem.getElement().toString(),
      阴阳: heavenStem.getYinYang() === 1 ? '阳' : '阴',
      十神: me === heavenStem ? undefined : me.getTenStar(heavenStem).toString(),
    },
    地支: {
      地支: earthBranch.toString(),
      五行: earthBranch.getElement().toString(),
      阴阳: earthBranch.getYinYang() === 1 ? '阳' : '阴',
      藏干: {
        主气: buildHideHeavenObject(earthBranch.getHideHeavenStemMain(), me),
        中气: buildHideHeavenObject(earthBranch.getHideHeavenStemMiddle(), me),
        余气: buildHideHeavenObject(earthBranch.getHideHeavenStemResidual(), me),
      },
    },
    纳音: sixtyCycle.getSound().toString(),
    旬: sixtyCycle.getTen().toString(),
    空亡: sixtyCycle.getExtraEarthBranches().join(''),
    星运: me.getTerrain(earthBranch).toString(),
    自坐: heavenStem.getTerrain(earthBranch).toString(),
  };
};

const buildGodsObject = (eightChar: EightChar, gender: 0 | 1) => {
  const gods = getShen(eightChar.toString(), gender);
  return {
    年柱: gods[0],
    月柱: gods[1],
    日柱: gods[2],
    时柱: gods[3],
  };
};

const buildDecadeFortuneObject = (solarTime: SolarTime, gender: Gender, me: HeavenStem) => {
  const childLimit = ChildLimit.fromSolarTime(solarTime, gender);

  let decadeFortune = childLimit.getStartDecadeFortune();
  const firstStartAge = decadeFortune.getStartAge();
  const startDate = childLimit.getEndTime();
  const decadeFortuneObjects: any[] = [];
  for (let i = 0; i < 10; i++) {
    const sixtyCycle = decadeFortune.getSixtyCycle();
    const heavenStem = sixtyCycle.getHeavenStem();
    const earthBranch = sixtyCycle.getEarthBranch();
    decadeFortuneObjects.push({
      干支: sixtyCycle.toString(),
      开始年份: decadeFortune.getStartSixtyCycleYear().getYear(),
      结束: decadeFortune.getEndSixtyCycleYear().getYear(),
      天干十神: me.getTenStar(heavenStem).getName(),
      地支十神: earthBranch.getHideHeavenStems().map((heavenStem) => me.getTenStar(heavenStem.getHeavenStem()).getName()),
      地支藏干: earthBranch.getHideHeavenStems().map((heavenStem) => heavenStem.toString()),
      开始年龄: decadeFortune.getStartAge(),
      结束年龄: decadeFortune.getEndAge(),
    });
    decadeFortune = decadeFortune.next(1);
  }

  return {
    起运日期: `${startDate.getYear()}-${startDate.getMonth()}-${startDate.getDay()}`,
    起运年龄: firstStartAge,
    大运: decadeFortuneObjects,
  };
};

const buildFlowYearObject = (year: number, sixtyCycle: SixtyCycle, me: HeavenStem) => {
  const heavenStem = sixtyCycle.getHeavenStem();
  const earthBranch = sixtyCycle.getEarthBranch();
  return {
    年份: year,
    干支: sixtyCycle.toString(),
    天干: heavenStem.toString(),
    地支: earthBranch.toString(),
    天干十神: me.getTenStar(heavenStem).getName(),
    地支藏干: earthBranch.getHideHeavenStems().map((hs) => ({
      天干: hs.getHeavenStem().toString(),
      十神: me.getTenStar(hs.getHeavenStem()).getName(),
    })),
  };
};

const buildTaoHuaObject = (eightChar: EightChar, flowYearBranch: string) => {
  const dayBranch = eightChar.getDay().getEarthBranch().toString();
  const taohuaPos = TAOHUA_MAP[dayBranch];
  const branches: Record<string, string> = {
    年支: eightChar.getYear().getEarthBranch().toString(),
    月支: eightChar.getMonth().getEarthBranch().toString(),
    时支: eightChar.getHour().getEarthBranch().toString(),
    流年支: flowYearBranch,
  };
  const found = Object.entries(branches)
    .filter(([_, b]) => b === taohuaPos)
    .map(([name]) => name);
  return {
    桃花位: taohuaPos,
    依据: `日支${dayBranch}→桃花在${taohuaPos}`,
    命中: found.length > 0 ? found.join('、') : `无（四柱及流年无${taohuaPos}）`,
  };
};

const buildDayMasterWuxingRelation = (me: HeavenStem) => {
  const meElement = me.getElement().toString();
  const result: Record<string, string> = { 日主: `${me}${meElement}` };
  for (const el of ['金', '木', '水', '火', '土']) {
    if (el === meElement) continue;
    const rel = getWuxingRelation(meElement, el);
    if (rel === '生') result['我生'] = el;
    else if (rel === '被生') result['生我'] = el;
    else if (rel === '克') result['我克'] = el;
    else if (rel === '被克') result['克我'] = el;
  }
  return result;
};

export const buildBazi = (options: { lunarHour: LunarHour; eightCharProviderSect?: 1 | 2; gender?: Gender; flowYear?: number }) => {
  const { lunarHour, eightCharProviderSect = 2, gender = 1, flowYear } = options;
  if (eightCharProviderSect === 2) {
    LunarHour.provider = eightCharProvider2;
  } else {
    LunarHour.provider = eightCharProvider1;
  }
  const eightChar = lunarHour.getEightChar();
  const me = eightChar.getDay().getHeavenStem();

  const zhuData: Record<string, { 天干: string; 地支: string }> = {
    年: { 天干: eightChar.getYear().getHeavenStem().toString(), 地支: eightChar.getYear().getEarthBranch().toString() },
    月: { 天干: eightChar.getMonth().getHeavenStem().toString(), 地支: eightChar.getMonth().getEarthBranch().toString() },
    日: { 天干: eightChar.getDay().getHeavenStem().toString(), 地支: eightChar.getDay().getEarthBranch().toString() },
    时: { 天干: eightChar.getHour().getHeavenStem().toString(), 地支: eightChar.getHour().getEarthBranch().toString() },
  };

  const currentYear = flowYear ?? toZonedTime(new Date(), '+08:00').getFullYear();
  if (!Number.isInteger(currentYear)) {
    throw new Error(`flowYear 必须是整数年份，收到: ${currentYear}`);
  }
  const flowYearSixtyCycle = SixtyCycleYear.fromYear(currentYear).getSixtyCycle();
  const nextYear = currentYear + 1;
  const nextYearSixtyCycle = SixtyCycleYear.fromYear(nextYear).getSixtyCycle();
  const buildYearContext = (year: number, sixtyCycle: SixtyCycle) => {
    const branch = sixtyCycle.getEarthBranch().toString();
    const stem = sixtyCycle.getHeavenStem().toString();
    return {
      流年: buildFlowYearObject(year, sixtyCycle, me),
      刑冲合会: calculateRelation({
        ...zhuData,
        流年: { 天干: stem, 地支: branch },
      }),
      桃花: buildTaoHuaObject(eightChar, branch),
    };
  };

  const current = buildYearContext(currentYear, flowYearSixtyCycle);
  const next = buildYearContext(nextYear, nextYearSixtyCycle);

  return {
    性别: ['女', '男'][gender],
    阳历: lunarHour.getSolarTime().toString(),
    农历: lunarHour.toString(),
    八字: eightChar.toString(),
    生肖: eightChar.getYear().getEarthBranch().getZodiac().toString(),
    日主: me.toString(),
    年柱: buildSixtyCycleObject(eightChar.getYear(), me),
    月柱: buildSixtyCycleObject(eightChar.getMonth(), me),
    日柱: buildSixtyCycleObject(eightChar.getDay()),
    时柱: buildSixtyCycleObject(eightChar.getHour(), me),
    胎元: eightChar.getFetalOrigin().toString(),
    胎息: eightChar.getFetalBreath().toString(),
    命宫: eightChar.getOwnSign().toString(),
    身宫: eightChar.getBodySign().toString(),
    神煞: buildGodsObject(eightChar, gender),
    大运: buildDecadeFortuneObject(lunarHour.getSolarTime(), gender, me),
    [`${currentYear}年`]: current,
    [`${nextYear}年`]: next,
    日主五行关系: buildDayMasterWuxingRelation(me),
  };
};
