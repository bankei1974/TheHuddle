import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const ExpectedPatientCensus = ({ selectedUnits, units, isManager, isOdsUnitSelected }) => {
    const [censusData, setCensusData] = useState({
        hospitalCensus: '',
        hospitalOccupied: '',
        units: {}
    });
    const today = new Date().toISOString().split('T')[0];

    const benjaminRussellId = units.find(unit => unit.name === "One Day Surgery Benjamin Russell")?.id;
    const lowderId = units.find(unit => unit.name === "One Day Surgery Lowder")?.id;

    useEffect(() => {
        const fetchData = async () => {
            const hospitalDocRef = doc(db, 'dailyMetrics', today);
            const hospitalDocSnap = await getDoc(hospitalDocRef);
            let hospitalData = { hospitalCensus: '', hospitalOccupied: '' };
            if (hospitalDocSnap.exists()) {
                hospitalData = hospitalDocSnap.data();
            }

            const unitsToFetch = isOdsUnitSelected ? [benjaminRussellId, lowderId].filter(Boolean) : selectedUnits;

            const unitData = {};
            for (const unitId of unitsToFetch) {
                const docId = `${today}_${unitId}`;
                const docRef = doc(db, 'expectedCensus', docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    unitData[unitId] = docSnap.data();
                } else {
                    unitData[unitId] = { totalPatients: '', admissions: '', discharges: '' };
                }
            }
            setCensusData({ ...hospitalData, units: unitData });
        };
        fetchData();
    }, [selectedUnits, today, isOdsUnitSelected, benjaminRussellId, lowderId]);

    const handleChange = (type, id, field, value) => {
        if (type === 'hospital') {
            setCensusData(prevData => ({
                ...prevData,
                [field]: value
            }));
        } else {
            setCensusData(prevData => ({
                ...prevData,
                units: {
                    ...prevData.units,
                    [id]: {
                        ...prevData.units[id],
                        [field]: value
                    }
                }
            }));
        }
    };

    const handleSave = async (type, id) => {
        if (type === 'hospital') {
            const hospitalDocRef = doc(db, 'dailyMetrics', today);
            await setDoc(hospitalDocRef, {
                hospitalCensus: censusData.hospitalCensus,
                hospitalOccupied: censusData.hospitalOccupied
            }, { merge: true });
            alert('Hospital data saved successfully!');
        } else {
            const docId = `${today}_${id}`;
            const docRef = doc(db, 'expectedCensus', docId);
            const dataToSave = {
                totalPatients: censusData.units[id]?.totalPatients || '',
                admissions: censusData.units[id]?.admissions || '',
                discharges: censusData.units[id]?.discharges || ''
            };
            try {
                await setDoc(docRef, dataToSave, { merge: true });
                alert('Unit census data saved successfully!');
            } catch (error) {
                console.error('Error saving unit census data:', error);
                alert('Error saving unit census data. Please check the console for details.');
            }
        }
    };

    return (
        <div className="bg-gray-800 p-0.5 rounded-lg">
            <h3 className="text-sm font-semibold mb-0.5">Today's Census</h3>
            <div className="mb-1 p-0 rounded-md bg-gray-700/50">
                <h4 className="font-semibold mb-0.5">Hospital Wide</h4>
                <div className="grid grid-cols-2 gap-0.5">
                    <div>
                        <label className="label-style text-xs">Hospital Census</label>
                        <input
                            type="number"
                            value={censusData.hospitalCensus || ''}
                            onChange={(e) => handleChange('hospital', null, 'hospitalCensus', e.target.value)}
                            className="input-style p-0 text-xs w-full"
                            disabled={!isManager}
                        />
                    </div>
                    <div>
                        <label className="label-style text-xs">Hospital % Occupied</label>
                        <input
                            type="number"
                            value={censusData.hospitalOccupied || ''}
                            onChange={(e) => handleChange('hospital', null, 'hospitalOccupied', e.target.value)}
                            className="input-style p-0 text-xs w-full"
                            disabled={!isManager}
                        />
                    </div>
                </div>
                {isManager && (
                    <div className="flex justify-end mt-0">
                        <button onClick={() => handleSave('hospital', null)} className="btn-primary text-xs px-0.5 py-0">Save Hospital Data</button>
                    </div>
                )}
            </div>

            <h4 className="font-semibold mb-0.5">Unit Specific</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-700/50 rounded-lg text-xs">
                    <thead>
                        <tr className="bg-gray-600/50">
                            <th className="py-0.5 px-0.5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Unit</th>
                            <th className="py-0.5 px-0.5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Patients</th>
                            <th className="py-0.5 px-0.5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Admissions</th>
                            <th className="py-0.5 px-0.5 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Discharges</th>
                            {isManager && <th className="py-0.5 px-1 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            let unitsToDisplay = [];
                            const benjaminRussellId = units.find(unit => unit.name === "One Day Surgery Benjamin Russell")?.id;
                            const lowderId = units.find(unit => unit.name === "One Day Surgery Lowder")?.id;

                            if (isOdsUnitSelected) {
                                if (benjaminRussellId) unitsToDisplay.push(benjaminRussellId);
                                if (lowderId) unitsToDisplay.push(lowderId);
                            } else {
                                unitsToDisplay = [...selectedUnits];
                            }

                            // Ensure uniqueness in case selectedUnits already contained ODS units
                            unitsToDisplay = [...new Set(unitsToDisplay)];

                            return unitsToDisplay.map(unitId => (
                                <tr key={unitId} className="border-t border-gray-600">
                                    <td className="py-0.5 px-0.5 whitespace-nowrap">{units.find(u => u.id === unitId)?.name}</td>
                                    <td className="py-0.5 px-0.5">
                                        <input
                                            type="number"
                                            value={censusData.units[unitId]?.totalPatients || ''}
                                            onChange={(e) => handleChange('unit', unitId, 'totalPatients', e.target.value)}
                                            className="input-style p-0 text-xs w-full"
                                            disabled={!isManager}
                                        />
                                    </td>
                                    <td className="py-0.5 px-0.5">
                                        <input
                                            type="number"
                                            value={censusData.units[unitId]?.admissions || ''}
                                            onChange={(e) => handleChange('unit', unitId, 'admissions', e.target.value)}
                                            className="input-style p-0 text-xs w-full"
                                            disabled={!isManager}
                                        />
                                    </td>
                                    <td className="py-0.5 px-0.5">
                                        <input
                                            type="number"
                                            value={censusData.units[unitId]?.discharges || ''}
                                            onChange={(e) => handleChange('unit', unitId, 'discharges', e.target.value)}
                                            className="input-style p-0 text-xs w-full"
                                            disabled={!isManager}
                                        />
                                    </td>
                                    {isManager && (
                                        <td className="py-0.5 px-0.5">
                                            <button onClick={() => handleSave('unit', unitId)} className="btn-primary text-xs px-0.5 py-0">Save</button>
                                        </td>
                                    )}
                                </tr>
                            ));
                        })()}                        
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpectedPatientCensus;
