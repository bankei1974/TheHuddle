import React from 'react';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip bg-gray-700 p-3 rounded-lg shadow-lg border border-gray-600 text-white">
                <p className="label text-lg font-semibold">{`Time: ${label}`}</p>
                <p className="intro text-md">{`Productive Staff: ${data['Productive Staff']}`}</p>
                {
                    data.productiveStaffNames && data.productiveStaffNames.length > 0 && (
                        <div className="names mt-2">
                            <p className="font-medium">Staff Members:</p>
                            <ul className="list-disc list-inside">
                                {data.productiveStaffNames.map((name, index) => (
                                    <li key={index} className="text-sm">{name}</li>
                                ))}
                            </ul>
                        </div>
                    )
                }
                <p className="desc text-md">{`Patient Census: ${data['Patient Census']}`}</p>
            </div>
        );
    }

    return null;
};

export default CustomTooltip;