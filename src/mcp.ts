import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { getBaziDetail, getChineseCalendar, getSolarTimes, getZiweiChart } from './index.js';

const server = new McpServer({
  name: 'Bazi',
  version: '0.0.1',
});

server.tool(
  'getBaziDetail',
  '根据时间（公历或农历）、性别来获取八字信息。solarDatetime和lunarDatetime必须传且只传其中一个。',
  {
    solarDatetime: z.string().optional().describe('用ISO时间格式表示的公历时间. 例如：`2008-03-01T13:00:00+08:00`。'),
    lunarDatetime: z.string().optional().describe('农历时间。例如农历2000年5月初五中午12点整表示为：`2000-5-5 12:00:00`。'),

    gender: z.number().describe('传0表示女性，传1表示男性。'),
    eightCharProviderSect: z
      .number()
      .default(2)
      .describe('早晚子时配置。传1表示23:00-23:59日干支为明天，传2表示23:00-23:59日干支为当天。'),
    flowYear: z
      .number()
      .optional()
      .describe('指定流年年份（如2026），用于计算流年干支、流年与原局刑冲合会、桃花命中。不传则默认当前年份（东八区）。'),
  },
  async (data) => {
    const result = await getBaziDetail(data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.tool(
  'getSolarTimes',
  '根据八字获取公历时间列表。返回的时间格式为：YYYY-MM-DD hh:mm:ss。例如时间1998年7月31日下午2点整表示为：1998-07-31 14:00:00',
  {
    bazi: z.string().describe('八字，按年柱、月柱、日柱、时柱顺序，用空格隔开。例如：戊寅 己未 己卯 辛未'),
  },
  async (data) => {
    const result = await getSolarTimes(data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.tool(
  'getChineseCalendar',
  '获取指定公历时间（默认今天）的黄历信息。',
  {
    solarDatetime: z.string().optional().describe('用ISO时间格式表示的公历时间. 例如：`2008-03-01T13:00:00+08:00`。'),
  },
  async ({ solarDatetime }) => {
    const result = getChineseCalendar(solarDatetime);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

server.tool(
  'getZiweiChart',
  '根据出生时间和性别排紫微斗数命盘。返回十二宫、主星（含亮度）、辅星、四化飞星、大限等完整命盘数据。solarDatetime和lunarDatetime必须传且只传其中一个。',
  {
    solarDatetime: z.string().optional().describe('用ISO时间格式表示的公历时间. 例如：`1990-06-15T10:00:00+08:00`。'),
    lunarDatetime: z.string().optional().describe('农历时间。例如农历1990年5月23日上午10点表示为：`1990-5-23 10:00:00`。'),
    gender: z.number().describe('传0表示女性，传1表示男性。'),
  },
  async (data) => {
    const result = getZiweiChart(data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  },
);

export { server };
