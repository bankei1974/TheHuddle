import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, addDoc, collection, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase';
import { useCollection } from '../hooks/useCollection';
import { RefreshCw } from 'lucide-react';

const StaffFormPage = () => {
    const { staffId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const { data: units } = useCollection(db, 'units');
    const { data: jobTitles } = useCollection(db, 'jobTitles');

    useEffect(() => {
        if (staffId) {
            const fetchStaffMember = async () => {
                const docRef = doc(db, 'users', staffId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(docSnap.data());
                    setImagePreview(docSnap.data().profilePictureUrl);
                }
            };
            fetchStaffMember();
        } else {
            setFormData({ fullName: '', email: '', jobTitle: '', predominantUnit: '', standardStartTime: '', standardEndTime: '', contactInfo: '', hireDate: '', role: 'Staff', profilePictureUrl: '' });
        }
    }, [staffId]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleChangeImage = (e) => {
        if (e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setImagePreview(URL.createObjectURL(e.target.files[0]));
        } else {
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const collectionPath = 'users';
        const unitId = units.find(u => u.name === formData.predominantUnit)?.id || null;
        let dataToSave = { ...formData, predominantUnitId: unitId };

        try {
            if (staffId) { // Editing existing staff
                let profilePictureUrl = formData.profilePictureUrl;
                if (imageFile) {
                    const storage = getStorage();
                    const storageRef = ref(storage, `profilePictures/${staffId}/${imageFile.name}`);
                    const snapshot = await uploadBytes(storageRef, imageFile);
                    profilePictureUrl = await getDownloadURL(snapshot.ref);
                }
                dataToSave = { ...dataToSave, profilePictureUrl };
                await updateDoc(doc(db, collectionPath, staffId), dataToSave);

            } else { // Adding new staff
                const auth = getAuth();
                let userCredential;
                try {
                    userCredential = await createUserWithEmailAndPassword(auth, formData.email, "TempPassword123!");
                } catch (authError) {
                    console.error("Error creating user in Firebase Auth:", authError);
                    alert(`Failed to create user: ${authError.message}`);
                    return;
                }

                const uid = userCredential.user.uid;
                await setDoc(doc(db, collectionPath, uid), {
                    ...dataToSave,
                    authUid: uid,
                    createdAt: serverTimestamp(),
                    profilePictureUrl: ''
                });

                let profilePictureUrl = '';
                if (imageFile) {
                    const storage = getStorage();
                    const storageRef = ref(storage, `profilePictures/${uid}/${imageFile.name}`);
                    const snapshot = await uploadBytes(storageRef, imageFile);
                    profilePictureUrl = await getDownloadURL(snapshot.ref);
                    await updateDoc(doc(db, collectionPath, uid), { profilePictureUrl });
                }
            }
            navigate('/staff-management');
        } catch (error) {
            console.error("Error saving staff data:", error);
            alert("Failed to save staff data. Please try again.");
        }
    };

    return (
        <main className="p-8">
            <h1 className="text-4xl font-bold text-white mb-8">{staffId ? 'Edit Staff Profile' : 'Add New Staff'}</h1>
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Form fields */}
                    <div className="mb-4">
                        <label className="label-style">Profile Picture</label>
                        <input type="file" accept="image/*" onChange={handleChangeImage} className="input-style" />
                        {imagePreview && <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-full mt-2 object-cover" />}
                    </div>
                    <div className="mb-4"><label className="label-style">Full Name</label><input type="text" name="fullName" value={formData.fullName || ''} onChange={handleChange} required className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Email Address</label><input type="email" name="email" value={formData.email || ''} onChange={handleChange} required className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Job Title</label><select name="jobTitle" value={formData.jobTitle || ''} onChange={handleChange} required className="input-style"><option value="">Select...</option>{jobTitles.map(jt => <option key={jt.id} value={jt.name}>{jt.name}</option>)}</select></div>
                    <div className="mb-4"><label className="label-style">Predominant Unit</label><select name="predominantUnit" value={formData.predominantUnit || ''} onChange={handleChange} required className="input-style"><option value="">Select...</option>{units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                    <div className="mb-4"><label className="label-style">Standard Start Time</label><input type="time" name="standardStartTime" value={formData.standardStartTime || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Standard End Time</label><input type="time" name="standardEndTime" value={formData.standardEndTime || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Hire Date</label><input type="date" name="hireDate" value={formData.hireDate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Birthdate</label><input type="date" name="birthdate" value={formData.birthdate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Employee ID</label><input type="text" name="employeeId" value={formData.employeeId || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">COA Hire Date</label><input type="date" name="coaHireDate" value={formData.coaHireDate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">BLS Expiration Date</label><input type="date" name="blsExpirationDate" value={formData.blsExpirationDate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">PALS Expiration Date</label><input type="date" name="palsExpirationDate" value={formData.palsExpirationDate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">License Type</label><input type="text" name="licenseType" value={formData.licenseType || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">License Expiration Date</label><input type="date" name="licenseExpirationDate" value={formData.licenseExpirationDate || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="md:col-span-2 lg:col-span-3"><label className="label-style">Contact Info (Optional)</label><input type="text" name="contactInfo" value={formData.contactInfo || ''} onChange={handleChange} className="input-style" /></div>
                    <div className="mb-4"><label className="label-style">Role</label><select name="role" value={formData.role || 'Staff'} onChange={handleChange} required className="input-style"><option value="Staff">Staff</option><option value="Manager">Manager</option></select></div>
                    <div className="mb-4"><label className="label-style">Staff Karma</label><input type="number" name="staffKarma" value={formData.staffKarma || 0} onChange={handleChange} className="input-style" /></div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={() => navigate('/staff-management')} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">{staffId ? 'Save Changes' : 'Add Staff'}</button>
                </div>
            </form>
        </main>
    );
};

export default StaffFormPage;
