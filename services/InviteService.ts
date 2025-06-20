import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const InviteService = {
  async getPendingInvites() {
    const q = query(collection(db, 'invites'), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  },

  async deleteInvite(inviteId: string) {
    await deleteDoc(doc(db, 'invites', inviteId));
  }
}; 