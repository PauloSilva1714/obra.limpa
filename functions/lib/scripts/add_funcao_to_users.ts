import * as admin from 'firebase-admin';
import * as path from 'path';

// Ajuste o caminho do serviceAccountKey.json conforme necessário
const serviceAccount = require(path.resolve(__dirname, '../../serviceAccountKey.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function addFuncaoToUsers() {
  const usersSnapshot = await db.collection('users').get();

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();
    // Valor padrão para função
    let funcao = 'Função não informada';
    await doc.ref.update({ funcao });
    console.log(`Usuário ${userData.name} (${doc.id}) atualizado com funcao: ${funcao}`);
  }
}

addFuncaoToUsers()
  .then(() => {
    console.log('Todos os usuários foram atualizados!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erro ao atualizar usuários:', err);
    process.exit(1);
  }); 