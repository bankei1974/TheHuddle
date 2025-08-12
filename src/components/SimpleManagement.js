import React, { useState } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import Modal from './Modal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const SimpleManagement = ({ db, collectionName, singularName, pluralName }) => {
    const { data, loading } = useCollection(db, collectionName);
    const [isModalOpen, setIsModalOpen] = useState(false); const [editingItem, setEditingItem] = useState(null); const [itemName, setItemName] = useState(''); const [itemSymbol, setItemSymbol] = useState('');
    const handleOpenModal = (item = null) => { setEditingItem(item); setItemName(item ? item.name : ''); setItemSymbol(item && item.symbol ? item.symbol : ''); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingItem(null); setItemName(''); setItemSymbol(''); };
    const handleSubmit = async (e) => { e.preventDefault(); if (!itemName.trim() || !collectionName) return; if (editingItem) await updateDoc(doc(db, collectionName, editingItem.id), { name: itemName, ...(collectionName === 'statuses' && { symbol: itemSymbol }) }); else await addDoc(collection(db, collectionName), { name: itemName, createdAt: serverTimestamp(), ...(collectionName === 'statuses' && { symbol: itemSymbol }) }); handleCloseModal(); };
    const handleDelete = async (id) => { if (window.confirm(`Delete this ${singularName}?`)) await deleteDoc(doc(db, collectionName, id)); };
    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4"><h3 className="text-2xl font-semibold">{pluralName}</h3><button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2"><PlusCircle size={18} /> Add {singularName}</button></div>
            <ul className="space-y-2">{loading ? <li className="text-gray-400">Loading...</li> : data.map(item => (<li key={item.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg"><span>{item.name}</span><div className="flex gap-3"><button onClick={() => handleOpenModal(item)} className="text-gray-400 hover:text-white"><Edit size={18} /></button><button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={18} /></button></div></li>))}</ul>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? `Edit ${singularName}` : `Add New ${singularName}`}><form onSubmit={handleSubmit}><input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="input-style" placeholder={`${singularName} Name`} required />{collectionName === 'statuses' && (<input type="text" value={itemSymbol} onChange={(e) => setItemSymbol(e.target.value)} className="input-style mt-4" placeholder="Symbol (e.g., ✅)" />)}<div className="flex justify-end gap-4 mt-6"><button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{editingItem ? 'Save' : 'Add'}</button></div></form></Modal>
        </div>
    );
};

export default SimpleManagement;