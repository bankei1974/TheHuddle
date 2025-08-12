import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { useCollection } from '../hooks/useCollection';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { db } from '../firebase';
import { where } from 'firebase/firestore';
import { createUtcDateFromCentralTime } from '../utils/timezoneHelpers';
import DailyStaffingGraphChartJs from './DailyStaffingGraphChartJs';
import KarmaLeaderboard from './KarmaLeaderboard';
import StaffBirthdays from './StaffBirthdays';
import ExpectedPatientCensus from './ExpectedPatientCensus';
import DailyUpdates from './DailyUpdates';
import UnitPerformanceMetrics from './UnitPerformanceMetrics';
import WeekAtAGlanceTable from './WeekAtAGlanceTable';
import AdmitsTable from './AdmitsTable';

const HappeningHubPage = () => {
    const { userProfile } = useAuthContext();
    const isManager = userProfile.role === 'Manager';
    const { data: units } = useCollection(db, 'units');
    const [selectedUnit, setSelectedUnit] = useState(userProfile?.preferences?.selectedUnit || '');
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [odsUnitIds, setOdsUnitIds] = useState([]);
    const [pacuLowderId, setPacuLowderId] = useState(null);
    const [pacuBenjaminRussellId, setPacuBenjaminRussellId] = useState(null);
    const [imagingId, setImagingId] = useState(null);
    const [pacuImagingUnitIds, setPacuImagingUnitIds] = useState([]);
    const initialSelectedDate = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [selectedDate, setSelectedDate] = useState(initialSelectedDate);

    const { data: shifts } = useCollection(db, 'shifts', userProfile?.id ? [where("staffId", "==", userProfile.id)] : []);
    const { data: staffList } = useCollection(db, 'users');

    const shiftsQuery = useMemo(() => {
        if (!selectedDate) {
            return [where('__name__', '==', 'no-date-selected')];
        }

        const d = new Date(selectedDate + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() - 1);
        const previousDate = d.toISOString().split('T')[0];

        const queries = [where("date", "in", [selectedDate, previousDate])];
        if (selectedUnits && selectedUnits.length > 0) {
            if (selectedUnits.length === 1) {
                queries.push(where("unitId", "==", selectedUnits[0]));
            } else {
                queries.push(where("unitId", "in", selectedUnits));
            }
        }
        return queries;
    }, [selectedDate, selectedUnits]);

    const { data: shiftsForGraph } = useCollection(db, 'shifts', shiftsQuery);

    const productiveStaffData = useMemo(() => {
        const staffCounts = Array(96).fill(0);
        const staffNamesPerInterval = Array(96).fill(null).map(() => []);
        const nonProductiveStatuses = new Set(['PTO', 'EIB', 'Call out', 'Non-Productive', 'Orientation', 'Preferred Off']);

        if (!selectedDate) return [];

        const selectedDayStartUTC = createUtcDateFromCentralTime(selectedDate, 0, 0, 0);
        const selectedDayEndUTC = createUtcDateFromCentralTime(selectedDate, 23, 59, 59);

        if (!selectedDayStartUTC || !selectedDayEndUTC) return [];

        shiftsForGraph.forEach(shift => {
            const staffMember = staffList.find(staff => staff.id === shift.staffId);

            if (staffMember && (staffMember.jobTitle === 'Registered Nurse' || staffMember.jobTitle === 'LPN')) {
                const shiftStatuses = Array.isArray(shift.status) ? shift.status : [shift.status];
                const isProductive = shiftStatuses.every(status => !nonProductiveStatuses.has(status));

                if (isProductive && shift.shiftStartDateTime && shift.shiftEndDateTime) {
                    const shiftStartUtc = new Date(shift.shiftStartDateTime);
                    const shiftEndUtc = new Date(shift.shiftEndDateTime);

                    const effectiveStart = new Date(Math.max(shiftStartUtc.getTime(), selectedDayStartUTC.getTime()));
                    const effectiveEnd = new Date(Math.min(shiftEndUtc.getTime(), selectedDayEndUTC.getTime()));

                    if (effectiveStart < effectiveEnd) {
                        let current = new Date(effectiveStart);

                        while (current < effectiveEnd) {
                            const diffInMillis = current.getTime() - selectedDayStartUTC.getTime();
                            const minutesIntoDay = diffInMillis / (1000 * 60);
                            const intervalIndex = Math.floor(minutesIntoDay / 15);

                            if (intervalIndex >= 0 && intervalIndex < 96) {
                                staffCounts[intervalIndex]++;
                                if (staffMember.fullName) {
                                    staffNamesPerInterval[intervalIndex].push(staffMember.fullName);
                                }
                            }
                            current.setUTCMinutes(current.getUTCMinutes() + 15);
                        }
                    }
                }
            }
        });

        return Array.from({ length: 96 }, (_, i) => {
            const hour = Math.floor(i / 4);
            const minute = (i % 4) * 15;
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            return {
                time,
                'Productive Staff': staffCounts[i],
                productiveStaffNames: staffNamesPerInterval[i],
            };
        });
    }, [shiftsForGraph, staffList, selectedDate]);

    const patientCensusQuery = useMemo(() => {
        if (selectedDate && selectedUnit) {
            return [where('date', '==', selectedDate), where('unitId', '==', selectedUnit)];
        }
        return [where('__name__', '==', 'no-selection')];
    }, [selectedDate, selectedUnits]);

    const { data: patientCensusDocs } = useCollection(db, 'patientCensus', patientCensusQuery);

    const patientCensusDataForGraph = useMemo(() => {
        if (patientCensusDocs && patientCensusDocs.length > 0 && patientCensusDocs[0].census) {
            const censusData = patientCensusDocs[0].census;
            const convertedCensusData = {};
            for (const time in censusData) {
                if (Object.hasOwnProperty.call(censusData, time)) {
                    const value = censusData[time];
                    convertedCensusData[time] = value === '' ? 0 : parseInt(value, 10);
                }
            }
            return convertedCensusData;
        }
        return {};
    }, [patientCensusDocs]);

    const staffingLevelsQuery = useMemo(() => {
        if (selectedDate && selectedUnit) {
            return [where('date', '==', selectedDate), where('unitId', '==', selectedUnit)];
        }
        return [where('__name__', '==', 'no-selection')];
    }, [selectedDate, selectedUnits]);

    const { data: staffingLevelsDocs } = useCollection(db, 'staffingLevels', staffingLevelsQuery);

    const staffingLevelTemplateQuery = useMemo(() => {
        if (selectedUnit) {
            return [where('__name__', '==', selectedUnit)];
        }
        return [where('__name__', '==', 'no-selection')];
    }, [selectedUnits]);

    const { data: staffingLevelTemplateDocs } = useCollection(db, 'staffingLevelTemplates', staffingLevelTemplateQuery);

    const staffingLevelsDataForGraph = useMemo(() => {
        if (staffingLevelsDocs && staffingLevelsDocs.length > 0 && staffingLevelsDocs[0].levels) {
            return staffingLevelsDocs[0].levels;
        }
        if (staffingLevelTemplateDocs && staffingLevelTemplateDocs.length > 0 && staffingLevelTemplateDocs[0].levels) {
            return staffingLevelTemplateDocs[0].levels;
        }
        return {};
    }, [staffingLevelsDocs, staffingLevelTemplateDocs]);

    const graphData = useMemo(() => {
        const mergedData = productiveStaffData.map(prod => {
            const censusCount = patientCensusDataForGraph[prod.time] ? parseInt(patientCensusDataForGraph[prod.time], 10) : 0;
            const minStaff = staffingLevelsDataForGraph[prod.time] ? parseInt(staffingLevelsDataForGraph[prod.time].min, 10) : 0;
            const optimalStaff = staffingLevelsDataForGraph[prod.time] ? parseInt(staffingLevelsDataForGraph[prod.time].optimal, 10) : 0;
            const data = {
                ...prod,
                'Minimum Staff': isNaN(minStaff) ? 0 : minStaff,
                'Optimal Staff': isNaN(optimalStaff) ? 0 : optimalStaff,
            };
            if (patientCensusDocs && patientCensusDocs.length > 0) {
                data['Patient Census'] = isNaN(censusCount) ? 0 : censusCount;
            }
            return data;
        });
        return mergedData;
    }, [productiveStaffData, patientCensusDataForGraph, staffingLevelsDataForGraph, patientCensusDocs]);

    useEffect(() => {
        if (units) {
            const benjaminRussell = units.find(unit => unit.name === "One Day Surgery Benjamin Russell");
            const lowder = units.find(unit => unit.name === "One Day Surgery Lowder");
            const pacuLowder = units.find(unit => unit.name === "PACU Lowder");
            const pacuBenjaminRussell = units.find(unit => unit.name === "PACU Benjamin Russell");
            const imaging = units.find(unit => unit.name === "Imaging");

            const odsIds = [];
            if (benjaminRussell) odsIds.push(benjaminRussell.id);
            if (lowder) odsIds.push(lowder.id);
            setOdsUnitIds(odsIds);

            const pacuImagingIds = [];
            if (pacuLowder) pacuImagingIds.push(pacuLowder.id);
            if (pacuBenjaminRussell) pacuImagingIds.push(pacuBenjaminRussell.id);
            if (imaging) pacuImagingIds.push(imaging.id);
            setPacuImagingUnitIds(pacuImagingIds);

            setPacuLowderId(pacuLowder?.id || null);
            setPacuBenjaminRussellId(pacuBenjaminRussell?.id || null);
            setImagingId(imaging?.id || null);
        }
    }, [units]);

    useEffect(() => {
        if (units && selectedUnit === '') {
            setSelectedUnits(units.map(unit => unit.id));
        } else if (units && selectedUnit) {
            setSelectedUnits([selectedUnit]);
        }
    }, [units, selectedUnit]);

    const isOdsUnitSelected = odsUnitIds.includes(selectedUnit);
    const isPacuImagingUnitSelected = pacuImagingUnitIds.includes(selectedUnit);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [isBirthdaysExpanded, setIsBirthdaysExpanded] = useState(true);

    const handleUnitChange = (e) => {
        const unitId = e.target.value;
        setSelectedUnit(unitId);
        if (unitId === '') {
            setSelectedUnits(units.map(unit => unit.id));
        } else {
            setSelectedUnits([unitId]);
        }
    };

    return (
        <main className="p-0">
            <h1 className="text-base font-bold text-white mb-0.5">Happening Hub</h1>
            {units && (
                <>
                    <div className="mb-0.5 bg-gray-800 p-0 rounded-lg shadow-lg">
                        <h3 className="text-xs font-semibold text-white mb-0.5 flex justify-between items-center">
                            Filter by Unit
                            <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className="text-gray-400 hover:text-white text-xs">
                                {isFilterExpanded ? <ChevronUp /> : <ChevronDown />}
                            </button>
                        </h3>
                        {isFilterExpanded && (
                            <div className="flex flex-wrap gap-0.5">
                                <select value={selectedUnit} onChange={handleUnitChange} className="input-style">
                                    <option value="">All Units</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {isOdsUnitSelected && (
                        <div className="grid grid-cols-2 gap-0.5 h-[calc(100vh-2rem)]">
                            <div className="flex flex-col gap-0.5">
                                <div className="bg-gray-800 p-0 rounded-lg shadow-lg h-96">
                                    <DailyStaffingGraphChartJs graphData={graphData} />
                                </div>
                                <div className="flex-grow">
                                    <ExpectedPatientCensus selectedUnits={selectedUnits} units={units} isManager={isManager} isOdsUnitSelected={isOdsUnitSelected} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex-grow">
                                    <DailyUpdates selectedUnits={selectedUnits} units={units} isManager={isManager} />
                                </div>
                                <div className="grid grid-cols-2 gap-0.5 flex-grow">
                                    <div className="bg-gray-800 p-0.5 rounded-lg overflow-y-auto">
                                        <KarmaLeaderboard selectedUnits={selectedUnits} />
                                    </div>
                                    <div className="bg-gray-800 p-0.5 rounded-lg overflow-y-auto">
                                        <h3 className="text-xs font-semibold mb-0.5 flex justify-between items-center">
                                            Birthdays
                                            <button onClick={() => setIsBirthdaysExpanded(!isBirthdaysExpanded)} className="text-gray-400 hover:text-white">
                                                {isBirthdaysExpanded ? <ChevronUp /> : <ChevronDown />}
                                            </button>
                                        </h3>
                                        {isBirthdaysExpanded && <StaffBirthdays selectedUnits={selectedUnits} />}
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <UnitPerformanceMetrics selectedUnits={selectedUnits} units={units} isManager={isManager} displayUnitName={true} />
                                </div>
                                <div className="flex-grow">
                                    <WeekAtAGlanceTable selectedUnit={selectedUnit} units={units} isManager={isManager} isOdsUnitSelected={isOdsUnitSelected} displayUnitIds={odsUnitIds} />
                                </div>
                            </div>
                        </div>
                    )}

                    {isPacuImagingUnitSelected && (
                        <div className="grid grid-cols-2 gap-0.5 h-[calc(100vh-2rem)]">
                            <div className="flex flex-col gap-0.5">
                                <div className="bg-gray-800 p-0 rounded-lg shadow-lg h-96">
                                    <DailyStaffingGraphChartJs graphData={graphData} />
                                </div>
                                <div className="flex-grow">
                                    <ExpectedPatientCensus selectedUnits={selectedUnits} units={units} isManager={isManager} isOdsUnitSelected={isOdsUnitSelected} />
                                </div>
				<div className="flex-grow">
				    <AdmitsTable />
				</div>
                                <div className="flex-grow">
                                    <DailyUpdates selectedUnits={selectedUnits} units={units} isManager={isManager} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="grid grid-cols-2 gap-0.5 flex-grow">
                                    <div className="bg-gray-800 p-0.5 rounded-lg overflow-y-auto">
                                        <KarmaLeaderboard selectedUnits={selectedUnits} />
                                    </div>
                                    <div className="bg-gray-800 p-0.5 rounded-lg overflow-y-auto">
                                        <h3 className="text-xs font-semibold mb-0.5 flex justify-between items-center">
                                            Birthdays
                                            <button onClick={() => setIsBirthdaysExpanded(!isBirthdaysExpanded)} className="text-gray-400 hover:text-white">
                                                {isBirthdaysExpanded ? <ChevronUp /> : <ChevronDown />}
                                            </button>
                                        </h3>
                                        {isBirthdaysExpanded && <StaffBirthdays selectedUnits={selectedUnits} />}
                                    </div>
                                </div>
                                <div className="flex-grow">
                                    <UnitPerformanceMetrics selectedUnits={selectedUnits} units={units} isManager={isManager} displayUnitName={false} pacuImagingUnitIds={pacuImagingUnitIds} isPacuImagingUnitSelected={isPacuImagingUnitSelected} />
                                </div>
                                <div className="flex-grow">
                                    <WeekAtAGlanceTable selectedUnit={selectedUnit} units={units} isManager={isManager} isOdsUnitSelected={isOdsUnitSelected} displayUnitIds={pacuImagingUnitIds} />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </main>
    );
};

export default HappeningHubPage;
