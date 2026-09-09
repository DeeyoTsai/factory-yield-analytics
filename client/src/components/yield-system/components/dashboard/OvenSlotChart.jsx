import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { offset } from '@popperjs/core';

const EqLineMap = {
  '站別A':'L1',
  '站別B':'L4',
  '站別C':'L2',
  '站別D':'L5',
  '站別E':'L3',
  '站別F':'L6',
};

const OvenSlotChart = ({ data }) => {
  const chartOption = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // Filter data with valid oven slot info
    const validData = data.filter(item => item.ovenslot && item.ovenslot.slotno !== -1);
    
    // Group data by product
    const seriesData = {};
    validData.forEach(item => {
      const product = item.pdamtable?.product || 'Unknown';
      if (!seriesData[product]) {
        seriesData[product] = [];
      }
      seriesData[product].push([
        item.ovenslot.slotno,
        item.ovenslot.cure_pos,
        item.gid,
        EqLineMap[item.ovenslot.eqpt_id]
      ]);
    });

    // Generate series for each product
    const series = Object.keys(seriesData).map(product => ({
      name: product,
      type: 'scatter',
      symbolSize: 25,
      data: seriesData[product],
      itemStyle: { opacity: 0.8 },
      label: {
        show:true,
        position:'inside',
        fontWeight:900,
        fontSize:15
      }
    }));

    return {
      title: {
        text: 'Oven Cure Slot 分佈圖',
        left: 'center'
      },
      legend: {
        data: Object.keys(seriesData),
        bottom: 10,
        formatter: (name) => {
          const line = seriesData[name][0][3];
          return `${name} (${line} OVN)`;
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          return `Product: ${params.seriesName}<br/>Glass ID: ${params.data[2]}<br/>Cure Pos: ${params.data[1]}<br/>Oven Line: ${params.data[3]}`;
        }
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Slot No',
        min: 0,
        splitLine: { show: true }
      },
      yAxis: {
        type: 'value',
        name: 'Cure Pos',
        min: 0,
        max: 32,
        interval: 8,
        axisLabel:{
          formatter:'{value}',
          // formatter: function(value) {
          //   if(value > 0 && value <= 8){
          //     return 'Shutter1'
          //   }
          // },
          fontSize:13,
        },    
        splitLine: { show: true }
      },
      series: series
    };
  }, [data]);
  // console.log(chartOption);
  
  
  const emptyOption = {
    title: {
      text: 'Oven Slot Spatial Distribution - No Data',
      left: 'center',
      textStyle: {
        color: '#999',
        fontSize: 14
      }
    },
    xAxis: { show: false },
    yAxis: { show: false },
    series: []
  };

  return (
    <ReactECharts 
      option={chartOption || emptyOption} 
      style={{ height: '482px', width: '100%' }} 
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default OvenSlotChart;
