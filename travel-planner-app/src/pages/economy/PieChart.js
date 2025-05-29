import {PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import React from 'react';

// Code from https://recharts.org/en-US/examples/PieChartWithCustomizedLabel

const COLORS = ["#023047", "#880d1e","#dd2d4a","#f26a8d","#f49cbb","#cbeef3", "#ffb703","#fb8500", "#219ebc"]

export default function ExpensePieChart({data}) {
  return (
    <div style={{width: '100%', height: 350}}>
      <ResponsiveContainer>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Tooltip/>
          <Pie
            data={data}
            dataKey="value"
            stroke=''
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


