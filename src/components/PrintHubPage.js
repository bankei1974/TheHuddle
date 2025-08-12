import React, { useState } from 'react';
import '../styles/print.css';
import { useCollection } from '../hooks/useCollection';
import { db } from '../firebase';
import { where } from 'firebase/firestore';
import FourWeekSchedule from './FourWeekSchedule';
import * as XLSX from 'xlsx/xlsx.mjs';
import { ChevronUp, ChevronDown } from 'lucide-react';

const PrintHubPage = () => {
    const [scheduleType, setScheduleType] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedUnits, setSelectedUnits] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [selectedProductivity, setSelectedProductivity] = useState([]);
    const [isUnitFilterExpanded, setIsUnitFilterExpanded] = useState(false);
    const [isRoleFilterExpanded, setIsRoleFilterExpanded] = useState(false);
    const [isStatusFilterExpanded, setIsStatusFilterExpanded] = useState(false);
    const [isProductivityFilterExpanded, setIsProductivityFilterExpanded] = useState(false);

    const { data: units } = useCollection(db, 'units');
    const { data: jobTitles } = useCollection(db, 'jobTitles');
    const { data: statuses } = useCollection(db, 'statuses');

    const shiftsQuery = () => {
        const nonProductiveStatuses = ['PTO', 'EIB', 'Call out', 'Non-Productive', 'Orientation', 'Preferred Off'];
        let queries = [];

        if (scheduleType === 'daily') {
            queries.push(where('date', '==', selectedDate));
        } else {
            const endDate = new Date(selectedDate);
            endDate.setDate(endDate.getDate() + 28);
            queries.push(where('date', '>=', selectedDate));
            queries.push(where('date', '<=', endDate.toISOString().split('T')[0]));
        }

        if (selectedUnits.length) {
            queries.push(where('unitId', 'in', selectedUnits));
        }
        if (selectedRoles.length) {
            queries.push(where('jobTitle', 'in', selectedRoles));
        }
        if (selectedStatuses.length) {
            queries.push(where('status', 'in', selectedStatuses));
        }

        if (selectedProductivity.length === 1) {
            if (selectedProductivity[0] === 'Productive') {
                queries.push(where('status', 'not-in', nonProductiveStatuses));
            } else {
                queries.push(where('status', 'in', nonProductiveStatuses));
            }
        }

        return queries;
    };

    const { data: shifts } = useCollection(db, 'shifts', shiftsQuery());
    const { data: staff } = useCollection(db, 'users');

    const handleUnitChange = (e) => {
        const { value, checked } = e.target;
        setSelectedUnits(prev =>
            checked ? [...prev, value] : prev.filter(u => u !== value)
        );
    };

    const handleRoleChange = (e) => {
        const { value, checked } = e.target;
        setSelectedRoles(prev =>
            checked ? [...prev, value] : prev.filter(r => r !== value)
        );
    };

    const handleStatusChange = (e) => {
        const { value, checked } = e.target;
        setSelectedStatuses(prev =>
            checked ? [...prev, value] : prev.filter(s => s !== value)
        );
    };

    const handleProductivityChange = (e) => {
        const { value, checked } = e.target;
        setSelectedProductivity(prev =>
            checked ? [...prev, value] : prev.filter(p => p !== value)
        );
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        const data = shifts.map(shift => {
            const staffMember = staff.find(s => s.id === shift.staffId);
            return {
                'Name': staffMember?.fullName,
                'Unit': units.find(u => u.id === shift.unitId)?.name,
                'Role': shift.jobTitle,
                'Status': shift.status,
                'Date': shift.date,
                'Start Time': shift.startTime,
                'End Time': shift.endTime,
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Staffing Report");
        XLSX.writeFile(wb, "staffing_report.xlsx");
    };

    return (
        <main className="p-8 overflow-y-auto">
            <h1 className="text-4xl font-bold text-white mb-8">Print Hub</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <label className="label-style">Schedule Type:</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                            <input type="radio" name="scheduleType" value="daily" checked={scheduleType === 'daily'} onChange={e => setScheduleType(e.target.value)} />
                            Daily
                        </label>
                        <label className="flex items-center gap-1">
                            <input type="radio" name="scheduleType" value="four-week" checked={scheduleType === 'four-week'} onChange={e => setScheduleType(e.target.value)} />
                            Four-Week
                        </label>
                    </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <label className="label-style">Select Date:</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="input-style" />
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Unit
                        <button onClick={() => setIsUnitFilterExpanded(!isUnitFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isUnitFilterExpanded ? <ChevronUp /> : <ChevronDown />}
                        </button>
                    </h3>
                    {isUnitFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            {units.map(unit => (
                                <label key={unit.id} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={unit.id}
                                        checked={selectedUnits.includes(unit.id)}
                                        onChange={handleUnitChange}
                                        className="h-4 w-4 rounded"
                                    />
                                    {unit.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Role
                        <button onClick={() => setIsRoleFilterExpanded(!isRoleFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isRoleFilterExpanded ? <ChevronUp /> : <ChevronDown />}
                        </button>
                    </h3>
                    {isRoleFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            {jobTitles.map(role => (
                                <label key={role.id} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={role.name}
                                        checked={selectedRoles.includes(role.name)}
                                        onChange={handleRoleChange}
                                        className="h-4 w-4 rounded"
                                    />
                                    {role.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Status
                        <button onClick={() => setIsStatusFilterExpanded(!isStatusFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isStatusFilterExpanded ? <ChevronUp /> : <ChevronDown />}
                        </button>
                    </h3>
                    {isStatusFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            {statuses.map(status => (
                                <label key={status.id} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={status.name}
                                        checked={selectedStatuses.includes(status.name)}
                                        onChange={handleStatusChange}
                                        className="h-4 w-4 rounded"
                                    />
                                    {status.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-2 flex justify-between items-center">
                        Filter by Productivity
                        <button onClick={() => setIsProductivityFilterExpanded(!isProductivityFilterExpanded)} className="text-gray-400 hover:text-white text-sm">
                            {isProductivityFilterExpanded ? <ChevronUp /> : <ChevronDown />}
                        </button>
                    </h3>
                    {isProductivityFilterExpanded && (
                        <div className="flex flex-wrap gap-2">
                            <label className="flex items-center gap-1 text-white text-sm">
                                <input
                                    type="checkbox"
                                    value="Productive"
                                    checked={selectedProductivity.includes('Productive')}
                                    onChange={handleProductivityChange}
                                    className="h-4 w-4 rounded"
                                />
                                Productive
                            </label>
                            <label className="flex items-center gap-1 text-white text-sm">
                                <input
                                    type="checkbox"
                                    value="Non-Productive"
                                    checked={selectedProductivity.includes('Non-Productive')}
                                    onChange={handleProductivityChange}
                                    className="h-4 w-4 rounded"
                                />
                                Non-Productive
                            </label>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end mb-4 gap-4">
                <button onClick={handleExport} className="btn-secondary">Export to Excel</button>
                <button onClick={handlePrint} className="btn-primary">Print Report</button>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700" id="printable-area">
                {scheduleType === 'daily' ? (
                    <>
                        <h2 className="text-2xl font-semibold mb-4">Staffing Report for {selectedDate}</h2>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Unit</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">End Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.sort((a, b) => {
                                    if (a.startTime < b.startTime) return -1;
                                    if (a.startTime > b.startTime) return 1;
                                    if (a.endTime < b.endTime) return -1;
                                    if (a.endTime > b.endTime) return 1;
                                    const staffA = staff.find(s => s.id === a.staffId);
                                    const staffB = staff.find(s => s.id === b.staffId);
                                    if (staffA?.fullName < staffB?.fullName) return -1;
                                    if (staffA?.fullName > staffB?.fullName) return 1;
                                    return 0;
                                }).map(shift => {
                                    const staffMember = staff.find(s => s.id === shift.staffId);
                                    return (
                                        <tr key={shift.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-4">{staffMember?.fullName}</td>
                                            <td className="p-4">{units.find(u => u.id === shift.unitId)?.name}</td>
                                            <td className="p-4">{staffMember?.jobTitle}</td>
                                            <td className="p-4">{shift.status}</td>
                                            <td className="p-4">{shift.startTime}</td>
                                            <td className="p-4">{shift.endTime}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                ) : (
                    <FourWeekSchedule shifts={shifts} staff={staff} units={units} startDate={selectedDate} />
                )}
            </div>
        </main>
    );
};

export default PrintHubPage;
