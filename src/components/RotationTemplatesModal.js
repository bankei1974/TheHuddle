import React, { useState } from 'react';
import { doc, deleteDoc, where } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import Modal from './Modal';
import TemplateEditorModal from './TemplateEditorModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const RotationTemplatesModal = ({ isOpen, onClose, db, staffMember, units, statuses }) => {
    const templatesPath = `templates`;
    const { data: templates, loading } = useCollection(db, templatesPath, staffMember?.id ? [where("staffId", "==", staffMember.id)] : []);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    if (!staffMember) return null;
    const handleOpenEditor = (template = null) => { setEditingTemplate(template); setIsEditorOpen(true); };
    const handleCloseEditor = () => { setEditingTemplate(null); setIsEditorOpen(false); };
    const handleDelete = async (id) => { if (window.confirm("Delete this template?")) await deleteDoc(doc(db, templatesPath, id)); };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Rotation Templates for ${staffMember.fullName}`}><div className="max-h-[80vh] overflow-y-auto"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">Saved Templates</h3><button onClick={() => handleOpenEditor()} className="btn-primary flex items-center gap-2"><PlusCircle size={18} /> Add Template</button></div><div className="space-y-2">{loading ? <p>Loading templates...</p> : templates.length === 0 ? <p className="text-gray-400">No templates saved for this user.</p> : templates.map(t => (<div key={t.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg"><span>{t.name} ({t.duration} weeks)</span><div className="flex gap-3"><button onClick={() => handleOpenEditor(t)} className="text-gray-400 hover:text-white"><Edit size={18} /></button><button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button></div></div>))}</div></div>
            <TemplateEditorModal isOpen={isEditorOpen} onClose={handleCloseEditor} db={db} template={editingTemplate} collectionPath={templatesPath} units={units} statuses={statuses} staffMember={staffMember} />
        </Modal>
    );
};

export default RotationTemplatesModal;