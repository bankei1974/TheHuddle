import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const UnitPerformanceMetrics = ({ selectedUnits, units, isManager, displayUnitName = true, pacuImagingUnitIds = [], isPacuImagingUnitSelected }) => {
    const [metricsData, setMetricsData] = useState({});
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        const fetchData = async () => {
            let unitsToFetch = [];
            if (isPacuImagingUnitSelected) {
                unitsToFetch = pacuImagingUnitIds;
            } else {
                unitsToFetch = selectedUnits;
            }

            if (unitsToFetch.length > 0) {
                const data = {};
                for (const unitId of unitsToFetch) {
                    const docId = `${today}_${unitId}_metrics`;
                    const docRef = doc(db, 'unitMetrics', docId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        data[unitId] = docSnap.data();
                    } else {
                        if (pacuImagingUnitIds.includes(unitId)) {
                            data[unitId] = { controlledSubstanceReports: '', painReassessment: '', scanningCompliance: '', onTimeFirstCaseStart: '' };
                        } else {
                            data[unitId] = { postOpCalls: '', painReassessment: '', scanningCompliance: '', onTimeFirstCaseStart: '' };
                        }
                    }
                }
                setMetricsData(data);
            } else {
                setMetricsData({}); // Clear data if no unit is selected
            }
        };
        fetchData();
    }, [selectedUnits, today, isPacuImagingUnitSelected, pacuImagingUnitIds]);

    const handleChange = (unitId, field, value) => {
        setMetricsData(prevData => {
            const newData = { ...prevData };
            let unitsToUpdate = [unitId];

            if (isPacuImagingUnitSelected && pacuImagingUnitIds.includes(unitId)) {
                unitsToUpdate = pacuImagingUnitIds;
            }

            unitsToUpdate.forEach(idToUpdate => {
                newData[idToUpdate] = {
                    ...newData[idToUpdate],
                    [field]: value
                };
            });
            return newData;
        });
    };

    const handleSave = async (unitId) => {
        let unitsToSave = [unitId]; // Default to saving only the current unit
        if (isPacuImagingUnitSelected && pacuImagingUnitIds.includes(unitId)) {
            // If a PACU/Imaging unit is selected, save for all of them
            unitsToSave = pacuImagingUnitIds;
        }

        for (const idToSave of unitsToSave) {
            const docId = `${today}_${idToSave}_metrics`;
            const docRef = doc(db, 'unitMetrics', docId);
            try {
                // Ensure we have data for this unit before trying to save
                if (metricsData[idToSave]) {
                    await setDoc(docRef, metricsData[idToSave], { merge: true });
                }
            } catch (error) {
                console.error('Error saving metrics for unit', idToSave, ':', error);
                // Optionally, you could alert the user about the specific unit that failed
            }
        }
        alert('Unit performance metrics saved successfully!');
    };

    if (selectedUnits.length === 0) {
        return null; // Don't render if no units are selected
    }

    return (
        <div className="bg-gray-800 p-0.5 rounded-lg mt-0.5">
            <h3 className="text-sm font-semibold mb-0.5">{displayUnitName ? "Unit Performance Metrics" : "Performance Metrics"}</h3>
            {selectedUnits.map(unitId => {
                const selectedUnitName = units.find(u => u.id === unitId)?.name;
                return (
                    <div key={unitId} className="mb-1 p-0 rounded-md bg-gray-700/50">
                        {displayUnitName && <h4 className="font-semibold mb-0">{selectedUnitName}</h4>}
                        <div className="grid grid-cols-2 gap-0.5">
                            {pacuImagingUnitIds.includes(unitId) ? (
                                <div>
                                    <label className="label-style text-xs">Controlled Substance Reports</label>
                                    <input
                                        type="number"
                                        value={metricsData[unitId]?.controlledSubstanceReports || ''}
                                        onChange={(e) => handleChange(unitId, 'controlledSubstanceReports', e.target.value)}
                                        className="input-style p-0 text-xs w-full"
                                        disabled={!isManager}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="label-style text-xs">% Post-op Calls Last Month</label>
                                    <input
                                        type="number"
                                        value={metricsData[unitId]?.postOpCalls || ''}
                                        onChange={(e) => handleChange(unitId, 'postOpCalls', e.target.value)}
                                        className="input-style p-0 text-xs w-full"
                                        disabled={!isManager}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="label-style text-xs">Pain Reassessment % Last Month</label>
                                <input
                                    type="number"
                                    value={metricsData[unitId]?.painReassessment || ''}
                                    onChange={(e) => handleChange(unitId, 'painReassessment', e.target.value)}
                                    className="input-style p-0 text-xs w-full"
                                    disabled={!isManager}
                                />
                            </div>
                            <div>
                                <label className="label-style text-xs">Scanning Compliance % Last Month</label>
                                <input
                                    type="number"
                                    value={metricsData[unitId]?.scanningCompliance || ''}
                                    onChange={(e) => handleChange(unitId, 'scanningCompliance', e.target.value)}
                                    className="input-style p-0 text-xs w-full"
                                    disabled={!isManager}
                                />
                            </div>
                            <div>
                                <label className="label-style text-xs">
                                    {pacuImagingUnitIds.includes(unitId) ? "Employee of the Month" : "On Time First Case Start %"}
                                </label>
                                <input
                                    type="text"
                                    value={metricsData[unitId]?.onTimeFirstCaseStart || ''}
                                    onChange={(e) => handleChange(unitId, 'onTimeFirstCaseStart', e.target.value)}
                                    className="input-style p-0 text-xs w-full"
                                    disabled={!isManager}
                                />
                            </div>
                        </div>
                        {isManager && (
                            <div className="flex justify-end mt-0">
                                <button onClick={() => handleSave(unitId)} className="btn-primary text-xs px-0.5 py-0">Save Metrics</button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default UnitPerformanceMetrics;
