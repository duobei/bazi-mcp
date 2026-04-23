import { astro } from 'iztro';
import { toDate, toZonedTime } from 'date-fns-tz';

/**
 * 小时转 iztro 时辰索引 (0-12)
 * 0=早子(23-1), 1=丑(1-3), 2=寅(3-5), ..., 11=亥(21-23), 12=晚子
 */
function hourToTimeIndex(hour: number): number {
  if (hour === 23) return 0;
  return Math.floor((hour + 1) / 2);
}

export function getZiweiChart(input: { solarDatetime?: string; lunarDatetime?: string; gender: number }) {
  const { solarDatetime, lunarDatetime, gender } = input;
  const genderStr = gender === 1 ? '男' : '女';

  let chart;
  if (solarDatetime) {
    const date = toDate(solarDatetime);
    const zoned = toZonedTime(date, '+08:00');
    const dateStr = `${zoned.getFullYear()}-${zoned.getMonth() + 1}-${zoned.getDate()}`;
    const timeIndex = hourToTimeIndex(zoned.getHours());
    chart = astro.bySolar(dateStr, timeIndex, genderStr, true, 'zh-CN');
  } else if (lunarDatetime) {
    const date = new Date(lunarDatetime);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const timeIndex = hourToTimeIndex(date.getHours());
    chart = astro.byLunar(dateStr, timeIndex, genderStr, true, undefined, 'zh-CN');
  } else {
    throw new Error('solarDatetime和lunarDatetime必须传且只传其中一个。');
  }

  const palaces = chart.palaces.map((p: any) => {
    const majorStars = p.majorStars
      .filter((s: any) => s.name)
      .map((s: any) => ({
        name: s.name,
        brightness: s.brightness || undefined,
        mutagen: s.mutagen || undefined,
      }));
    const minorStars = p.minorStars
      .filter((s: any) => s.name)
      .map((s: any) => ({
        name: s.name,
        mutagen: s.mutagen || undefined,
      }));
    const adjectiveStars = (p.adjectiveStars || []).filter((s: any) => s.name).map((s: any) => s.name);

    const result: any = {
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars,
      minorStars,
      adjectiveStars,
      changsheng12: p.changsheng12,
    };
    if (p.decadal) {
      result.decadal = { range: p.decadal.range, heavenlyStem: p.decadal.heavenlyStem, earthlyBranch: p.decadal.earthlyBranch };
    }
    if (p.ages?.length) {
      result.ages = p.ages;
    }
    if (p.isBodyPalace) {
      result.isBodyPalace = true;
    }
    return result;
  });

  // 四化汇总
  const sihua: { star: string; mutagen: string; palace: string }[] = [];
  for (const p of chart.palaces) {
    for (const star of [...(p as any).majorStars, ...(p as any).minorStars]) {
      if (star.mutagen) {
        sihua.push({ star: star.name, mutagen: `化${star.mutagen}`, palace: (p as any).name });
      }
    }
  }

  return {
    solarDate: chart.solarDate,
    lunarDate: chart.lunarDate,
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    palaces,
    sihua,
  };
}
