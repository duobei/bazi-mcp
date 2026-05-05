import { EightChar, LunarHour } from 'tyme4ts';
import { buildBazi } from './lib/bazi.js';
import { formatSolarTime, getSolarTime } from './lib/date.js';

export { getChineseCalendar } from './lib/chineseCalendar.js';
export { getZiweiChart } from './lib/ziwei.js';

export const getBaziDetail = async (data: { lunarDatetime?; solarDatetime?; gender?; baziProviderSect?; flowYear? }) => {
  const { lunarDatetime, solarDatetime, gender, baziProviderSect, flowYear } = data;
  if (lunarDatetime && solarDatetime) {
    throw new Error('solarDatetime和lunarDatetime只能传其中一个。');
  }
  if (!lunarDatetime && !solarDatetime) {
    throw new Error('solarDatetime和lunarDatetime必须传其中一个。');
  }
  let lunarHour: LunarHour;
  if (lunarDatetime) {
    const date = new Date(lunarDatetime);
    lunarHour = LunarHour.fromYmdHms(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    );
  } else {
    const solarTime = getSolarTime(solarDatetime!);
    lunarHour = solarTime.getLunarHour();
  }
  return buildBazi({ lunarHour, gender: gender as 0 | 1, baziProviderSect: baziProviderSect as 1 | 2, flowYear });
};

export const getSolarTimes = async ({ bazi }) => {
  const [year, month, day, hour] = bazi.split(' ');
  const solarTimes = new EightChar(year, month, day, hour).getSolarTimes(1700, new Date().getFullYear());
  const result = solarTimes.map((time) => formatSolarTime(time));
  return result;
};
