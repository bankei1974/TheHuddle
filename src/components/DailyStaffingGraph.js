import React from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CustomTooltip from './CustomTooltip';

const DailyStaffingGraph = ({ graphData }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorProductive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 12 }} interval={7} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="Minimum Staff" stroke="#FBBF24" />
                <Line type="monotone" dataKey="Optimal Staff" stroke="#34D399" />
                <Area type="monotone" dataKey="Productive Staff" stroke="#8884d8" fillOpacity={1} fill="url(#colorProductive)" />
                {graphData && graphData.length > 0 && graphData[0].hasOwnProperty('Patient Census') && (
                    <Line type="monotone" dataKey="Patient Census" stroke="#82ca9d" />
                )}
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default DailyStaffingGraph;
