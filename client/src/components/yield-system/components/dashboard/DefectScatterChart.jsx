import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const DefectScatterChart = ({ data }) => {
  // data expected format: Array of GlassInfo objects
  // { xpos, ypos, gid, pdamtable: { product } }

  const option = useMemo(() => {
    // Process data to extract products and series data
    const products = [...new Set(data.map(item => item.pdamtable?.product).filter(Boolean))];
    
    const series = products.map(product => {
      const productData = data
        .filter(item => item.pdamtable?.product === product)
        .map(item => [
          parseInt(item.xpos / 1000), 
          parseInt(item.ypos / 1000), 
          item.gid, 
          product
        ]);

      return {
        name: product,
        type: 'scatter',
        symbolSize: 16,
        data: productData,
        itemStyle: {
          borderColor: '#555'
        },
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          offset: [0, -15],
          formatter: function (param) {
            return ['X:' + param.data[0], 'Y:' + param.data[1]].join(', ');
          }
        },
        emphasis: {
          focus: 'self'
        }
      };
    });

    return {
      title: {
        text: 'Defect Map',
        left: 'center',
        textStyle: { fontSize: 22, color: '#575757' },
        top: '0%'
      },
      tooltip: {
        trigger: 'item',
        formatter: function (param) {
          return 'ID: ' + param.data[2] + '<br/>Product: ' + param.data[3];
        }
      },
      legend: {
        right: '10%',
        top: '6%',
        fontSize: 12,
        data: products
      },
      color: ['#96ceb4', '#f7c297', '#ffde61', '#77898c', '#63ace5', '#f6a6b2', '#e5c3c6', '#bcd2d0', '#d0b783'],
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        name: 'X',
        inverse: true,
        position: 'top',
        max: 1300,
        min: 0,
        interval: 100,
        axisLabel: { align: 'center', fontSize: 12, hideOverlap: true },
        nameTextStyle: { fontSize: 14, align: 'right' }
      },
      yAxis: {
        type: 'value',
        inverse: true,
        position: 'right',
        name: 'Y',
        max: 1100,
        min: 0,
        interval: 100,
        axisLabel: { align: 'left', fontSize: 12, hideOverlap: true },
        nameTextStyle: { fontSize: 14 }
      },
      series: series.length > 0 ? series : [{ type: 'scatter', data: [] }]
    };
  }, [data]);

  return (
    <ReactECharts 
      option={option} 
      style={{ height: '100%', width: '100%' }} 
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default DefectScatterChart;
