import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const WeekAtAGlanceTable = ({ selectedUnits, units, isManager, isOdsUnitSelected, displayUnitIds }) => {
    const [weeklyData, setWeeklyData] = useState({});
    const [loading, setLoading] = useState(true);

    const benjaminRussellId = units.find(unit => unit.name === "One Day Surgery Benjamin Russell")?.id;
    const lowderId = units.find(unit => unit.name === "One Day Surgery Lowder")?.id;

    useEffect(() => {
        const fetchWeeklyData = async () => {
            setLoading(true);
            const data = {};
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday

            const monday = new Date(today);
            monday.setDate(diff);

            const days = [];
            for (let i = 0; i < 5; i++) { // Monday to Friday
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + i);
                days.push(currentDate.toISOString().split('T')[0]);
            }

            const unitsToDisplay = displayUnitIds || []; // Use displayUnitIds if provided, otherwise an empty array

            for (const day of days) {
                data[day] = {};
                for (const unitId of unitsToDisplay) {
                    const docId = `${day}_${unitId}`;
                    const docRef = doc(db, 'expectedCensus', docId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        data[day][unitId] = docSnap.data();
                    } else {
                        data[day][unitId] = { preOp: '', discharges: '' };
                    }
                }
            }
            setWeeklyData(data);
            setLoading(false);
        };

        if (displayUnitIds && displayUnitIds.length > 0) {
            fetchWeeklyData();
        } else {
            setWeeklyData({});
            setLoading(false);
        }
    }, [displayUnitIds, benjaminRussellId, lowderId, units]);

    const handleCellChange = (day, unitId, field, value) => {
        setWeeklyData(prevData => ({
            ...prevData,
            [day]: {
                ...prevData[day],
                [unitId]: {
                    ...prevData[day][unitId],
                    [field]: value
                }
            }
        }));
    };

    const handleSaveWeek = async (unitId) => {
        const weekDates = Object.keys(weeklyData).sort();
        for (const day of weekDates) {
            if (weeklyData[day][unitId]) {
                const docId = `${day}_${unitId}`;
                const docRef = doc(db, 'expectedCensus', docId);
                await setDoc(docRef, weeklyData[day][unitId], { merge: true });
            }
        }
        alert(`Data for ${units.find(u => u.id === unitId)?.name} for the week saved successfully!`);
    };

    if (!displayUnitIds || displayUnitIds.length === 0) {
        return null; // Don't render if no units are selected for display
    }

    if (loading) {
        return <div className="bg-gray-800 p-1 rounded-lg mt-1 text-white text-xs">Loading weekly data...</div>;
    }

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const currentWeekDays = Object.keys(weeklyData).sort(); // Get sorted dates

    return (
        <div className="bg-gray-800 p-0.5 rounded-lg mt-0.5">
            <h3 className="text-sm font-semibold mb-0.5">Week at a Glance (Admissions/Discharges)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-700/50 rounded-lg text-xs">
                    <thead>
                        <tr className="bg-gray-600/50">
                            <th className="py-0.5 px-1 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Day</th>
                            {currentWeekDays.map((day, index) => (
                                <th key={day} className="py-0.5 px-0.5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    {daysOfWeek[index]} ({day.substring(5)})
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayUnitIds.map(unitId => {
                            const unitName = units.find(u => u.id === unitId)?.name;
                            return (
                                <React.Fragment key={unitId}>
                                    <tr className="border-t border-gray-600">
                                        <td className="py-0.5 px-0.5 font-semibold" colSpan={6}>{unitName}</td>
                                    </tr>
                                    <tr className="border-t border-gray-600">
                                        <td className="py-0.5 px-1">Pre-op</td>
                                        {currentWeekDays.map(day => (
                                            <td key={`${unitId}-${day}-preOp`} className="py-0.5 px-0.5">
                                                <input
                                                    type="number"
                                                    value={weeklyData[day]?.[unitId]?.preOp || ''}
                                                    onChange={(e) => handleCellChange(day, unitId, 'preOp', e.target.value)}
                                                    className="input-style p-0 text-xs w-full"
                                                    disabled={!isManager}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-t border-gray-600">
                                        <td className="py-0.5 px-1">Discharges</td>
                                        {currentWeekDays.map(day => (
                                            <td key={`${unitId}-${day}-discharges`} className="py-0.5 px-0.5">
                                                <input
                                                    type="number"
                                                    value={weeklyData[day]?.[unitId]?.discharges || ''}
                                                    onChange={(e) => handleCellChange(day, unitId, 'discharges', e.target.value)}
                                                    className="input-style p-0 text-xs w-full"
                                                    disabled={!isManager}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    {isManager && (
                                        <tr className="border-t border-gray-600">
                                            <td className="py-0.5 px-0.5" colSpan={6}>
                                                <button onClick={() => handleSaveWeek(unitId)} className="btn-primary text-xs px-0.5 py-0 w-full">Save {unitName} Week</button>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WeekAtAGlanceTable;