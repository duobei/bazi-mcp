import { astro } from 'iztro';
import { toDate, toZonedTime } from 'date-fns-tz';

/**
 * 小时转 iztro 时辰索引 (0-12)
 * 0=早子(00:00-01:00), 1=丑(01-03), 2=寅(03-05), ..., 11=亥(21-23), 12=晚子(23:00-00:00)
 */
function hourToTimeIndex(hour: number): number {
  if (hour === 23) return 12;
  return Math.floor((hour + 1) / 2);
}

/**
 * 解析农历时间字符串 "YYYY-M-D HH:mm:ss" 为各分量
 */
function parseLunarDatetime(s: string): { year: number; month: number; day: number; hour: number } {
  const [datePart, timePart] = s.trim().split(/\s+/);
  if (!datePart) throw new Error(`农历时间格式错误: ${s}，应为 YYYY-M-D HH:mm:ss`);
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 30) {
    throw new Error(`农历日期无效: ${datePart}`);
  }
  let hour = 0;
  if (timePart) {
    const h = parseInt(timePart.split(':')[0], 10);
    if (isNaN(h) || h < 0 || h > 23) {
      throw new Error(`农历时间小时无效: ${timePart}，应为 0-23`);
    }
    hour = h;
  }
  return { year: y, month: m, day: d, hour };
}

interface ZiweiInput {
  solarDatetime?: string;
  lunarDatetime?: string;
  isLeapMonth?: boolean;
  gender: number;
}

export function getZiweiChart(input: ZiweiInput) {
  const { solarDatetime, lunarDatetime, gender, isLeapMonth } = input;

  // 参数互斥校验
  if (solarDatetime && lunarDatetime) {
    throw new Error('solarDatetime和lunarDatetime只能传其中一个。');
  }
  if (!solarDatetime && !lunarDatetime) {
    throw new Error('solarDatetime和lunarDatetime必须传其中一个。');
  }
  if (gender !== 0 && gender !== 1) {
    throw new Error('gender必须为 0（女）或 1（男）。');
  }

  const genderStr = gender === 1 ? '男' : '女';

  let chart;
  if (solarDatetime) {
    let date;
    try {
      date = toDate(solarDatetime);
    } catch {
      throw new Error(`公历时间格式无效: ${solarDatetime}，应为ISO格式如 1990-06-15T10:00:00+08:00`);
    }
    if (isNaN(date.getTime())) {
      throw new Error(`公历时间格式无效: ${solarDatetime}，应为ISO格式如 1990-06-15T10:00:00+08:00`);
    }
    const zoned = toZonedTime(date, '+08:00');
    const dateStr = `${zoned.getFullYear()}-${zoned.getMonth() + 1}-${zoned.getDate()}`;
    const timeIndex = hourToTimeIndex(zoned.getHours());
    chart = astro.bySolar(dateStr, timeIndex, genderStr, true, 'zh-CN');
  } else {
    const parsed = parseLunarDatetime(lunarDatetime!);
    const dateStr = `${parsed.year}-${parsed.month}-${parsed.day}`;
    const timeIndex = hourToTimeIndex(parsed.hour);
    chart = astro.byLunar(dateStr, timeIndex, genderStr, isLeapMonth ?? false, true, 'zh-CN');
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
