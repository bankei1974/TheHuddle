
import React, { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { where, doc, deleteDoc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StaffingLevelFormModal from './StaffingLevelFormModal';
import CopyStaffingLevelsModal from './CopyStaffingLevelsModal';
import { PlusCircle, Edit, Trash2, Copy } from 'lucide-react';

const UnitStaffingTimeline = ({ db, unitId, date }) => {
    const [selectedRole, setSelectedRole] = useState('Registered Nurse');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

    const { data: jobTitles, loading: rolesLoading } = useCollection(db, 'jobTitles');

    const { data: allLevels, loading: allLevelsLoading } = useCollection(db, 'staffingLevels', [
        where('unitId', '==', unitId),
        where('role', '==', selectedRole),
        where('date', '<=', date)
    ], ["date", "desc"]);

    const handleOpenModal = (level = null) => {
        setEditingLevel(level);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingLevel(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this staffing level?")) {
            try {
                await deleteDoc(doc(db, 'staffingLevels', id));
            } catch (error) {
                console.error("Error deleting staffing level:", error);
                alert("Failed to delete staffing level.");
            }
        }
    };

    const effectiveLevels = useMemo(() => {
        const currentDayLevels = allLevels.filter(level => level.date === date);
        if (currentDayLevels.length > 0) {
            return currentDayLevels;
        }

        // If no levels for current day, find the most recent previous day with levels
        const sortedLevels = [...allLevels].sort((a, b) => b.date.localeCompare(a.date));
        let inheritedLevels = [];
        let foundDate = null;

        for (const level of sortedLevels) {
            if (level.date < date) {
                if (!foundDate) {
                    foundDate = level.date;
                }
                if (level.date === foundDate) {
                    inheritedLevels.push(level);
                }
            }
        }
        return inheritedLevels;
    }, [allLevels, date]);

    const chartData = useMemo(() => {
        const data = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                data.push({ time, min: 0, optimal: 0 });
            }
        }

        console.log("All Levels fetched from Firestore:", allLevels);
        allLevels.forEach(level => {
            let shouldInclude = false;
            if (selectedRole === 'Registered Nurse' || selectedRole === 'LPN') {
                shouldInclude = (level.role === 'Registered Nurse' || level.role === 'LPN');
            } else {
                shouldInclude = (level.role === selectedRole);
            }

            if (shouldInclude) {
                const timeIndex = data.findIndex(d => d.time === level.time);
                if (timeIndex !== -1) {
                    data[timeIndex].min += level.min;
                    data[timeIndex].optimal += level.optimal;
                }
            }
        });

        return data.sort((a, b) => a.time.localeCompare(b.time));
    }, [allLevels, selectedRole]);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Staffing Levels for {date}</h2>
                <div className="flex items-center gap-4">
                    <div>
                        <label htmlFor="role-select" className="label-style">Role</label>
                        <select
                            id="role-select"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="input-style"
                            disabled={rolesLoading}
                        >
                            {rolesLoading ? (
                                <option>Loading...</option>
                            ) : (
                                jobTitles.map(role => (
                                    <option key={role.id} value={role.name}>{role.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2 self-end">
                        <PlusCircle size={18} /> Add Level
                    </button>
                    <button onClick={() => setIsCopyModalOpen(true)} className="btn-secondary flex items-center gap-2 self-end">
                        <Copy size={18} /> Copy Day
                    </button>
                </div>
            </div>

            {/* The Chart */}
            <div style={{ height: '400px' }} className="mb-8">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                        <XAxis dataKey="time" stroke="#9CA3AF" interval={8} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }}
                            labelStyle={{ color: '#D1D5DB' }}
                        />
                        <Legend wrapperStyle={{ color: '#D1D5DB' }} />
                        <Line type="monotone" dataKey="min" stroke="#FBBF24" name="Combined Minimum Staff" />
                <Line type="monotone" dataKey="optimal" stroke="#34D399" name="Combined Optimal Staff" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Data Points Table */}
            <div>
                <h3 className="text-xl font-semibold text-white mb-4">Data Points for {selectedRole}</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                    {allLevelsLoading ? (
                        <p className="text-gray-400">Loading data points...</p>
                    ) : effectiveLevels && effectiveLevels.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="p-2">Time</th>
                                    <th className="p-2">Minimum</th>
                                    <th className="p-2">Optimal</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {effectiveLevels.filter(level => level.role === selectedRole).sort((a, b) => a.time.localeCompare(b.time)).map(level => (
                                    <tr key={level.id} className="border-b border-gray-600 hover:bg-gray-600/50">
                                        <td className="p-2">{level.time}</td>
                                        <td className="p-2">{level.min}</td>
                                        <td className="p-2">{level.optimal}</td>
                                        <td className="p-2 flex gap-2">
                                            <button onClick={() => handleOpenModal(level)} className="text-gray-400 hover:text-white"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete(level.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-400">No staffing levels defined for this role on this date.</p>
                    )}
                </div>
            </div>

            <StaffingLevelFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                db={db}
                unitId={unitId}
                date={date}
                role={selectedRole}
                levelData={editingLevel}
                effectiveLevels={effectiveLevels}
            />

            <CopyStaffingLevelsModal
                isOpen={isCopyModalOpen}
                onClose={() => setIsCopyModalOpen(false)}
                db={db}
                sourceUnitId={unitId}
                sourceDate={date}
                sourceRole={selectedRole}
                sourceLevels={effectiveLevels.filter(level => level.role === selectedRole)}
            />
        </div>
    );
};

export default UnitStaffingTimeline;
