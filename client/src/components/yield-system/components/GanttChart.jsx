import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { Box } from '@mui/material';

const Colors = [
  '#BB86D7', '#FFAFF0', '#5BC3EB', '#B5E2FA', '#A9D5C3',
  '#73DCFF', '#DCB0C6', '#F9CDA5', '#FBE6D2', '#B5E2FA',
  '#BB86D7', '#FFAFF0', '#5BC3EB', '#B5E2FA', '#A9D5C3',
  '#73DCFF', '#DCB0C6', '#F9CDA5', '#FBE6D2', '#B5E2FA',
];

// Generate more random colors if needed
for (let i = 0; i < 80; i++) {
  const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
  Colors.push(randomColor);
}

const GanttChart = ({ data: eqData, date }) => {
  const timeRange = useMemo(() => {
    if (!date) return {};
    const dt = dayjs(date);
    return {
      min: dt.subtract(1, 'day').hour(6).minute(0).second(0).valueOf(),
      max: dt.hour(10).minute(0).second(0).valueOf(),
    };
  }, [date]);

  const chartOption = useMemo(() => {
    if (!eqData || eqData.length === 0) return {};

    // Group by line
    let lines = eqData.reduce((acc, cur) => {
      acc[cur.line] ? acc[cur.line].push(cur) : (acc[cur.line] = [cur]);
      return acc;
    }, {});

    let chartData = [];
    Object.keys(lines).forEach((lineKey) => {
      let lineItems = lines[lineKey];
      let tempLot = lineItems[0].lot;
      let data1 = dayjs(lineItems[0].begintime);
      
      lineItems.forEach((v, i) => {
        if (tempLot !== v.lot) {
          let data2 = dayjs(v.begintime);
          let s1 = data1.valueOf();
          let s2 = data2.valueOf();
          let duration = s2 - s1;
          
          chartData.forEach((e) => {
            if (e.value[4] === tempLot && e.value[0] === lineKey) {
              e.value[2] = s2;
              e.value[3] = duration;
            }
          });
          
          tempLot = v.lot;
          data1 = data2;
          let data2_end = dayjs(v.endtime);
          let s1_new = data1.valueOf();
          let s2_new = data2_end.valueOf() + 60 * 60 * 1000;
          let duration_new = s2_new - s1_new;
          
          let pd = v.product;
          if (pd.length < 10) {
            pd = v.description;
          }

          chartData.push({
            name: v.id,
            value: [lineKey, s1_new, s2_new, duration_new, tempLot, pd],
            itemStyle: {
              color: Colors[Math.floor(Math.random() * Colors.length)]
            },
          });
        } else {
          let data2 = dayjs(v.endtime);
          let s1 = data1.valueOf();
          let s2 = data2.valueOf();
          let duration = s2 - s1;

          const alreadyIn = chartData.find(e => e.value[4] === v.lot && e.value[0] === lineKey);
          
          if (!alreadyIn) {
            chartData.push({
              name: v.id,
              value: [lineKey, s1, s2, duration, v.lot, v.product],
              itemStyle: {
                color: Colors[Math.floor(Math.random() * Colors.length)]
              },
            });
          } else {
            chartData.forEach((e) => {
              if (e.value[4] === v.lot && e.value[0] === lineKey) {
                e.value[2] = s2;
                e.value[3] = duration;
              }
            });
          }
        }
      });
    });

    return {
      tooltip: {
        show: true,
        formatter: (params) => {
          const v = params.value;
          return `生產產品 : ${v[5]}<br/>LOT: ${v[4]}<br/>開始時間: ${dayjs(v[1]).format('MM/DD HH:mm')}<br/>結束時間: ${dayjs(v[2]).format('MM/DD HH:mm')}`;
        }
      },
      title: {
        text: '排程甘特圖',
        left: 'center'
      },
      grid: {
        height: 500,
        bottom: 100
      },
      dataZoom: [
        {
          type: 'slider',
          filterMode: 'weakFilter',
          showDataShadow: false,
          bottom: 20
        },
        {
          type: 'inside',
          filterMode: 'weakFilter'
        }
      ],
      xAxis: {
        type: 'time',
        name: '時間',
        nameLocation: 'end',
        min: timeRange.min,
        max: timeRange.max,
        axisLabel: {
          rotate: 45,
          formatter: (val) => dayjs(val).format('MM/DD HH:mm'),
        },
      },
      yAxis: {
        data: ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'],
        name: 'Line',
        axisLabel: {
          fontSize: 14
        }
      },
      series: [
        {
          type: 'custom',
          renderItem: function (params, api) {
            var categoryIndex = api.value(0);
            var start = api.coord([api.value(1), categoryIndex]);
            var end = api.coord([api.value(2), categoryIndex]);
            var height = api.size([0, 1])[1] * 0.6;
            
            var rectShape = echarts.graphic.clipRectByRect(
              {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height
              },
              {
                x: params.coordSys.x,
                y: params.coordSys.y,
                width: params.coordSys.width,
                height: params.coordSys.height
              }
            );

            return (
              rectShape && {
                type: 'rect',
                shape: rectShape,
                style: api.style()
              }
            );
          },
          label: {
            show: true,
            position: 'insideLeft',
            formatter: (params) => {
              const rule = /[_-]/;
              const val = params.value[5] || '';
              if (val.length > 10) {
                const dashPos = val.search(rule);
                if (dashPos > 0) {
                  return val.slice(0, dashPos) + '\n' + val.slice(dashPos);
                }
              }
              return val;
            },
            fontSize: 12,
            color: '#333'
          },
          itemStyle: {
            opacity: 0.8,
            borderColor: 'black',
            borderWidth: 1
          },
          encode: {
            x: [1, 2],
            y: 0
          },
          data: chartData
        }
      ]
    };
  }, [eqData, timeRange]);

  return (
    <Box sx={{ width: '100%', height: 650 }}>
      <ReactECharts 
        option={chartOption} 
        style={{ height: '650px', width: '100%' }}
        notMerge={true}
      />
    </Box>
  );
};

export default GanttChart;
