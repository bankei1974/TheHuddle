import { formatDateInCentralTime } from '../utils/timezoneHelpers';
import { useCollection } from '../hooks/useCollection';
import ShiftModal from './ShiftModal';
import PublishModal from './PublishModal';
import { Search, ChevronLeft, ChevronRight, Send } from 'lucide-react';

const TodaysView = ({ staffList, shifts }) => {
    // Implement the TodaysView component logic here
    return <div>Today's View</div>;
};

const ManagerSchedulingPage = ({ db }) => {
    const [startDate, setStartDate] = useState(new Date()); const [isShiftModalOpen, setIsShiftModalOpen] = useState(false); const [selectedShiftInfo, setSelectedShiftInfo] = useState(null); const [searchQuery, setSearchQuery] = useState(''); const [showTodaysView, setShowTodaysView] = useState(false); const [isPublishModalOpen, setIsPublishModalOpen] = useState(false); const [isLegendOpen, setIsLegendOpen] = useState(false);
    const usersPath = `users`; const shiftsPath = `shifts`; const unitsPath = `units`; const statusesPath = `statuses`;
    const { data: staffList, loading: staffLoading } = useCollection(db, usersPath);
    const { data: shifts } = useCollection(db, shiftsPath);
    const { data: units } = useCollection(db, unitsPath);
    const { data: statuses } = useCollection(db, statusesPath);
    
    const sortedStaffList = useMemo(() => 
        [...staffList].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
    , [staffList]);

    const filteredStaff = sortedStaffList.filter(s => s.fullName && s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const dates = Array.from({ length: 28 }, (_, i) => { const date = new Date(startDate); date.setDate(date.getDate() + i); return date; });
    const handleDateChange = (days) => setStartDate(prev => { const newDate = new Date(prev); newDate.setDate(newDate.getDate() + days); return newDate; });
    const handleOpenShiftModal = (staff, date, shift = null) => { setSelectedShiftInfo({ staff, date, shift }); setIsShiftModalOpen(true); };
    const statusColors = { 'Productive': 'bg-green-700', 'PTO': 'bg-yellow-700', 'On Call': 'bg-blue-700', 'Non-Productive': 'bg-gray-700', 'FMLA': 'bg-purple-700', 'EIB': 'bg-gray-700', 'Call Out': 'bg-gray-700', 'Preferred Off': 'bg-gray-700', 'On Call 1': 'bg-gray-700', 'On Call 2': 'bg-gray-700', 'On Call 3': 'bg-gray-700', 'MRI Morning Call': 'bg-gray-700', 'MRI Evening Call': 'bg-gray-700', 'Bonus': 'bg-gray-700', 'Extra Work Day': 'bg-gray-700', 'Orientation': 'bg-gray-700', 'Late Stay 1': 'bg-gray-700', 'Late Stay 2': 'bg-gray-700', 'Requested off': 'bg-gray-700' };
    const statusSymbols = { 'Productive': '✅', 'PTO': '🏖️', 'On Call': '📞', 'Non-Productive': '❌', 'FMLA': '🏥', 'EIB': '💰', 'Call Out': '🚨', 'Preferred Off': '❤️', 'On Call 1': '1️⃣', 'On Call 2': '2️⃣', 'On Call 3': '3️⃣', 'MRI Morning Call': '🌅', 'MRI Evening Call': '🌃', 'Bonus': '⭐', 'Extra Work Day': '➕', 'Orientation': '📚', 'Late Stay 1': '🌙', 'Late Stay 2': '🦉', 'Requested off': '📝' };
    const workloadColor = (rating) => { if (rating >= 4) return 'bg-green-500'; if (rating === 3) return 'bg-yellow-500'; if (rating <= 2) return 'bg-red-500'; return 'hidden'; };
    
    const getDayColoring = (date) => {
        const minStaff = 4;
        const optStaff = 6;
        const dayShifts = shifts.filter(s => s.date === formatDateInCentralTime(date) && Array.isArray(s.status) && s.status.includes('Productive'));
        if (dayShifts.length === 0) return 'bg-gray-800';

        const slots = Array(48).fill(0); // 30-min slots
        dayShifts.forEach(shift => {
            if(!shift.startTime || !shift.endTime) return;
            const start = Math.floor(parseInt(shift.startTime.split(':')[0]) * 2 + parseInt(shift.startTime.split(':')[1]) / 30);
            const end = Math.ceil(parseInt(shift.endTime.split(':')[0]) * 2 + parseInt(shift.endTime.split(':')[1]) / 30);
            for (let i = start; i < end; i++) {
                slots[i]++;
            }
        });

        const belowMin = slots.filter(s => s < minStaff).length;
        const atMin = slots.filter(s => s >= minStaff).length;
        const atOpt = slots.filter(s => s >= optStaff).length;
        
        if (belowMin / 48 > 0.3) return 'bg-red-900/50';
        if (atOpt / 48 > 0.7) return 'bg-green-900/50';
        if (atMin / 48 > 0.7) return 'bg-blue-900/50';
        return 'bg-yellow-900/50';
    };

    return (
        <main className="p-8 overflow-y-auto flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-8 gap-4">
                <div><h1 className="text-4xl font-bold text-white">Staff Scheduling</h1><div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/><input type="text" placeholder="Search staff..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-style pl-10 w-64"/></div></div>
                <div className="text-right flex flex-col items-end gap-2">
                    <button onClick={() => setIsPublishModalOpen(true)} className="btn-primary flex items-center gap-2"><Send size={18}/> Publish Schedule</button>
                    <button onClick={() => setShowTodaysView(!showTodaysView)} className="btn-secondary">{showTodaysView ? "Show Full Schedule" : "Show Today's View"}</button>
                    {!showTodaysView && <div className="flex items-center gap-4">
                        <button onClick={() => handleDateChange(-7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronLeft/></button>
                        <span className="text-xl font-semibold">{dates[0].toLocaleDateString()} - {dates[27].toLocaleDateString()}</span>
                        <button onClick={() => handleDateChange(7)} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600"><ChevronRight/></button>
                    </div>}
                </div>
            </div>
            <div className="relative mb-4">
                <button onClick={() => setIsLegendOpen(!isLegendOpen)} className="btn-secondary">
                    {isLegendOpen ? "Hide Legend" : "Show Legend"}
                </button>
                {isLegendOpen && (
                    <div className="absolute z-10 bg-gray-800 p-4 rounded-lg shadow-lg mt-2 right-0">
                        <h3 className="text-lg font-semibold text-white mb-2">Status Legend</h3>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(statusSymbols).map(([status, symbol]) => (
                                <div key={status} className="flex items-center gap-2">
                                    <span className="text-white text-lg">{symbol}</span>
                                    <span className="text-white text-sm">{status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {showTodaysView ? <TodaysView staffList={filteredStaff} shifts={shifts} /> : <div className="flex-1 overflow-auto"><table className="w-full text-left border-separate" style={{borderSpacing: '0 0.5rem'}}><thead><tr><th className="p-2 sticky left-0 bg-gray-900 z-10 w-48">Staff Member</th>{dates.map(date => (<th key={formatDateInCentralTime(date)} className={`p-2 text-center min-w-[100px] rounded-t-lg ${getDayColoring(date)}`}><div className="text-xs text-gray-300">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div><div>{date.getDate()}</div></th>))}</tr></thead><tbody className="bg-gray-800">{staffLoading ? (<tr><td colSpan={29}>Loading staff...</td></tr>) : filteredStaff.map(staff => (<tr key={staff.id}><td className="p-2 whitespace-nowrap sticky left-0 bg-gray-800 z-10 w-48 border-y border-l border-gray-700 rounded-l-lg font-medium">{staff.fullName}</td>{dates.map(date => { const dateString = formatDateInCentralTime(date); const shiftsForCell = shifts.filter(s => s.staffId === staff.id && s.date === dateString); return (<td key={dateString} className="p-1 border-t border-b border-gray-700 hover:bg-blue-600/20 cursor-pointer h-20 align-top" onClick={() => handleOpenShiftModal(staff, date)}><div className="space-y-1">{shiftsForCell.map(shift => (<div key={shift.id} onClick={(e) => { e.stopPropagation(); handleOpenShiftModal(staff, date, shift); }} className={`relative p-1 rounded text-xs text-white ${Array.isArray(shift.status) ? (shift.status.includes('Productive') ? statusColors['Productive'] : statusColors[shift.status[0]]) : statusColors[shift.status] || 'bg-gray-600'} ${!shift.published ? 'opacity-50 border-2 border-dashed border-gray-400' : ''}`}>                                    <div className="flex justify-between items-center">
                                        <div>{shift.startTime}-{shift.endTime}</div>
                                        <div className="flex gap-1">
                                            {Array.isArray(shift.status) && shift.status.map(s => statusSymbols[s] && <span key={s} className="text-xl text-white">{statusSymbols[s]}</span>)}
                                        </div>
                                    </div>
                                    <div className="font-bold">{shift.unit}</div>{shift.workloadRating && <div className={`absolute top-1 right-1 h-2 w-2 rounded-full ${workloadColor(shift.workloadRating)}`}></div>}</div>))}</div></td>)})}</tr>))}</tbody></table></div>}
            <ShiftModal isOpen={isShiftModalOpen} onClose={() => setIsShiftModalOpen(false)} db={db} shiftInfo={selectedShiftInfo} units={units} statuses={statuses} collectionPath={shiftsPath} />
            <PublishModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} db={db} collectionPath={shiftsPath} startDate={formatDateInCentralTime(dates[0])} endDate={formatDateInCentralTime(dates[27])}/>
        </main>
    );
};

export default ManagerSchedulingPage;